# Remotion + AWS Production Setup Guide

Complete guide for production-grade video rendering with Remotion on AWS.

---

## 🧠 The Golden Rule

> **Lambda orchestrates. Containers render.**
>
> Never flip this.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [AWS Infrastructure Setup](#3-aws-infrastructure-setup)
4. [Remotion Project Setup](#4-remotion-project-setup)
5. [Docker Container Setup](#5-docker-container-setup)
6. [ECS Task Definition](#6-ecs-task-definition)
7. [Lambda Job Controller](#7-lambda-job-controller)
8. [Backend Integration](#8-backend-integration)
9. [Deployment](#9-deployment)
10. [Monitoring & Scaling](#10-monitoring--scaling)
11. [Cost Estimation](#11-cost-estimation)

---

## 1. Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│ API Gateway │────▶│   Lambda    │
│  (Next.js)  │     │             │     │ (Controller)│
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
             ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
             │  DynamoDB   │           │     SQS     │           │     S3      │
             │ (Job State) │           │(Render Queue)│          │  (Assets)   │
             └─────────────┘           └──────┬──────┘           └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │     ECS     │
                                       │  (Fargate)  │
                                       │             │
                                       │ ┌─────────┐ │
                                       │ │Remotion │ │
                                       │ │Container│ │
                                       │ └─────────┘ │
                                       └──────┬──────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │     S3      │
                                       │(Final Video)│
                                       └─────────────┘
```

### What Each Service Does

| Service | Role | Why |
|---------|------|-----|
| **API Gateway** | Receives requests | Lightweight, scalable |
| **Lambda** | Job controller ONLY | Validate, queue, return job_id |
| **DynamoDB** | Job state storage | Fast, serverless |
| **SQS** | Render queue | Decoupling, retries, autoscaling |
| **ECS Fargate** | Video rendering | Long-running, predictable, scalable |
| **S3** | Asset & video storage | Cheap, durable |

### Why NOT Lambda for Rendering?

| Problem | Impact |
|---------|--------|
| 15 min timeout | Long videos fail |
| Expensive GB-seconds | Costs explode |
| Unstable under load | Random failures |
| No concurrency control | Unpredictable |

---

## 2. Prerequisites

### Required Tools

```bash
# Node.js 18+
node --version

# AWS CLI v2
aws --version

# Docker
docker --version

# Terraform (optional, for IaC)
terraform --version
```

### Required Accounts

- [ ] **AWS Account** with billing enabled
- [ ] **Remotion License** (free <100 renders/month): https://www.remotion.dev/license
- [ ] **Docker Hub** account (for container registry, or use ECR)

### Environment Variables

```env
# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1

# Remotion
REMOTION_LICENSE_KEY=xxx

# S3 Buckets
S3_ASSETS_BUCKET=clipking-assets
S3_RENDERS_BUCKET=clipking-renders

# SQS
SQS_RENDER_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/xxx/render-queue

# DynamoDB
DYNAMODB_JOBS_TABLE=clipking-render-jobs

# ECS
ECS_CLUSTER_NAME=clipking-render-cluster
ECS_TASK_DEFINITION=clipking-remotion-task
```

---

## 3. AWS Infrastructure Setup

### 3.1 Create S3 Buckets

```bash
# Assets bucket (input images, audio)
aws s3 mb s3://clipking-assets --region us-east-1

# Renders bucket (output videos)
aws s3 mb s3://clipking-renders --region us-east-1

# Set CORS for assets bucket
aws s3api put-bucket-cors --bucket clipking-assets --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

### 3.2 Create SQS Queue

```bash
# Create render queue
aws sqs create-queue \
  --queue-name clipking-render-queue \
  --attributes '{
    "VisibilityTimeout": "900",
    "MessageRetentionPeriod": "86400",
    "ReceiveMessageWaitTimeSeconds": "20"
  }'

# Note the Queue URL from output
```

### 3.3 Create DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name clipking-render-jobs \
  --attribute-definitions \
    AttributeName=job_id,AttributeType=S \
  --key-schema \
    AttributeName=job_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 3.4 Create ECR Repository

```bash
# Create repository for Remotion container
aws ecr create-repository \
  --repository-name clipking-remotion \
  --image-scanning-configuration scanOnPush=true
```

### 3.5 Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name clipking-render-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE_SPOT,weight=1
```

### 3.6 Create IAM Roles

#### ECS Task Execution Role

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### ECS Task Role (for S3, DynamoDB, SQS access)

```bash
# Create role
aws iam create-role \
  --role-name clipkingRenderTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Create custom policy
aws iam put-role-policy \
  --role-name clipkingRenderTaskRole \
  --policy-name RenderTaskPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject", "s3:PutObject"],
        "Resource": [
          "arn:aws:s3:::clipking-assets/*",
          "arn:aws:s3:::clipking-renders/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        "Resource": "arn:aws:sqs:us-east-1:*:clipking-render-queue"
      },
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:*:table/clipking-render-jobs"
      }
    ]
  }'
```

---

## 4. Remotion Project Setup

### 4.1 Create Project

```bash
cd f:\Startups\x\ClipKing
npx create-video@latest remotion-renderer --template blank
cd remotion-renderer
```

### 4.2 Install Dependencies

```bash
npm install @remotion/captions @remotion/media-utils zod
npm install @aws-sdk/client-s3 @aws-sdk/client-sqs @aws-sdk/client-dynamodb
npm install @aws-sdk/lib-dynamodb
```

### 4.3 Project Structure

```
remotion-renderer/
├── src/
│   ├── compositions/
│   │   ├── ScriptToVideo.tsx
│   │   ├── Scene.tsx
│   │   └── Captions.tsx
│   ├── types.ts
│   ├── Root.tsx
│   └── index.ts
├── worker/
│   ├── index.ts              # SQS worker entry point
│   ├── render.ts             # Render logic
│   └── s3.ts                 # S3 upload/download
├── Dockerfile
├── docker-compose.yml
├── remotion.config.ts
└── package.json
```

### 4.4 Input Types (src/types.ts)

```typescript
import { z } from "zod";

export const SceneSchema = z.object({
  sceneId: z.number(),
  imageUrl: z.string(),
  narration: z.string(),
  duration: z.number(),
  startTime: z.number(),
  motionType: z.enum([
    "slow_zoom_in", "slow_zoom_out",
    "pan_left", "pan_right", "pan_up", "pan_down",
    "drift"
  ]),
});

export const CaptionWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});

export const VideoInputSchema = z.object({
  scenes: z.array(SceneSchema),
  captions: z.array(CaptionWordSchema),
  audioUrl: z.string().optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  fps: z.number().default(30),
  totalDuration: z.number(),
});

export type VideoInput = z.infer<typeof VideoInputSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type CaptionWord = z.infer<typeof CaptionWordSchema>;

// Job message from SQS
export const RenderJobSchema = z.object({
  jobId: z.string(),
  inputProps: VideoInputSchema,
  outputKey: z.string(),
});

export type RenderJob = z.infer<typeof RenderJobSchema>;
```

### 4.5 Scene Component (src/compositions/Scene.tsx)

```tsx
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

interface SceneProps {
  imageUrl: string;
  motionType: string;
  durationInFrames: number;
}

const MOTION_PRESETS: Record<string, {
  startScale: number;
  endScale: number;
  xDrift: number;
  yDrift: number;
}> = {
  slow_zoom_in: { startScale: 1, endScale: 1.3, xDrift: 0, yDrift: 0 },
  slow_zoom_out: { startScale: 1.3, endScale: 1, xDrift: 0, yDrift: 0 },
  pan_left: { startScale: 1.15, endScale: 1.15, xDrift: 50, yDrift: 0 },
  pan_right: { startScale: 1.15, endScale: 1.15, xDrift: -50, yDrift: 0 },
  pan_up: { startScale: 1.15, endScale: 1.15, xDrift: 0, yDrift: 30 },
  pan_down: { startScale: 1.15, endScale: 1.15, xDrift: 0, yDrift: -30 },
  drift: { startScale: 1.1, endScale: 1.2, xDrift: 20, yDrift: 15 },
};

export const Scene: React.FC<SceneProps> = ({
  imageUrl,
  motionType,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const motion = MOTION_PRESETS[motionType] || MOTION_PRESETS.slow_zoom_in;

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [motion.startScale, motion.endScale],
    { extrapolateRight: "clamp" }
  );

  const translateX = interpolate(
    frame,
    [0, durationInFrames],
    [0, motion.xDrift],
    { extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame,
    [0, durationInFrames],
    [0, motion.yDrift],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      <Img
        src={imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
```

### 4.6 Captions Component (src/compositions/Captions.tsx)

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionWord } from "../types";

interface CaptionsProps {
  words: CaptionWord[];
}

const WORDS_PER_PAGE = 4;
const HIGHLIGHT_COLOR = "#39E508";

export const Captions: React.FC<CaptionsProps> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentTime = frame / fps;

  // Group words into pages
  const pages: CaptionWord[][] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
    pages.push(words.slice(i, i + WORDS_PER_PAGE));
  }

  // Find current page
  const currentPage = pages.find((page) => {
    const start = page[0]?.start ?? 0;
    const end = page[page.length - 1]?.end ?? 0;
    return currentTime >= start && currentTime <= end + 0.5;
  });

  if (!currentPage) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: height * 0.12,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px",
          maxWidth: "90%",
        }}
      >
        {currentPage.map((word, i) => {
          const isActive = currentTime >= word.start && currentTime < word.end;
          return (
            <span
              key={`${word.word}-${i}`}
              style={{
                fontSize: height * 0.045,
                fontWeight: "bold",
                color: isActive ? HIGHLIGHT_COLOR : "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

### 4.7 Main Composition (src/compositions/ScriptToVideo.tsx)

```tsx
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { Scene } from "./Scene";
import { Captions } from "./Captions";
import type { VideoInput } from "../types";

export const ScriptToVideo: React.FC<VideoInput> = ({
  scenes,
  captions,
  audioUrl,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {scenes.map((scene) => {
        const startFrame = Math.round(scene.startTime * fps);
        const durationInFrames = Math.round(scene.duration * fps);

        return (
          <Sequence
            key={scene.sceneId}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <Scene
              imageUrl={scene.imageUrl}
              motionType={scene.motionType}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
      })}

      <Captions words={captions} />

      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};
```

### 4.8 Root Registration (src/Root.tsx)

```tsx
import { Composition } from "remotion";
import { ScriptToVideo } from "./compositions/ScriptToVideo";
import { VideoInputSchema } from "./types";

const defaultProps = {
  scenes: [],
  captions: [],
  audioUrl: undefined,
  aspectRatio: "9:16" as const,
  fps: 30,
  totalDuration: 10,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ScriptToVideo-9-16"
        component={ScriptToVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={VideoInputSchema}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.totalDuration * props.fps),
        })}
        defaultProps={defaultProps}
      />
      <Composition
        id="ScriptToVideo-16-9"
        component={ScriptToVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={VideoInputSchema}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.totalDuration * props.fps),
        })}
        defaultProps={{ ...defaultProps, aspectRatio: "16:9" }}
      />
      <Composition
        id="ScriptToVideo-1-1"
        component={ScriptToVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1080}
        schema={VideoInputSchema}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.totalDuration * props.fps),
        })}
        defaultProps={{ ...defaultProps, aspectRatio: "1:1" }}
      />
    </>
  );
};
```

---

## 5. Docker Container Setup

### 5.1 Dockerfile

```dockerfile
# remotion-renderer/Dockerfile
FROM node:20-bookworm

# Install Chrome dependencies + FFmpeg
RUN apt-get update && apt-get install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Set environment
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Entry point is the worker
CMD ["node", "dist/worker/index.js"]
```

### 5.2 Worker Entry Point (worker/index.ts)

```typescript
// remotion-renderer/worker/index.ts
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { renderVideo } from "./render";
import { RenderJobSchema, type RenderJob } from "../src/types";

const QUEUE_URL = process.env.SQS_RENDER_QUEUE_URL!;
const JOBS_TABLE = process.env.DYNAMODB_JOBS_TABLE!;

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

async function updateJobStatus(
  jobId: string,
  status: string,
  extra: Record<string, any> = {}
) {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: JOBS_TABLE,
      Key: { job_id: jobId },
      UpdateExpression:
        "SET #status = :status, updated_at = :now" +
        Object.keys(extra)
          .map((k) => `, ${k} = :${k}`)
          .join(""),
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": status,
        ":now": new Date().toISOString(),
        ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`:${k}`, v])),
      },
    })
  );
}

async function processMessage(job: RenderJob) {
  console.log(`Processing job: ${job.jobId}`);

  try {
    await updateJobStatus(job.jobId, "rendering");

    const outputUrl = await renderVideo(job);

    await updateJobStatus(job.jobId, "completed", {
      video_url: outputUrl,
    });

    console.log(`Job ${job.jobId} completed: ${outputUrl}`);
  } catch (error) {
    console.error(`Job ${job.jobId} failed:`, error);
    await updateJobStatus(job.jobId, "failed", {
      error_message: String(error),
    });
  }
}

async function pollQueue() {
  console.log("Worker started, polling queue...");

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 600, // 10 minutes
        })
      );

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          const body = JSON.parse(message.Body || "{}");
          const job = RenderJobSchema.parse(body);

          await processMessage(job);

          // Delete message after successful processing
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );
        }
      }
    } catch (error) {
      console.error("Queue polling error:", error);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

pollQueue();
```

### 5.3 Render Logic (worker/render.ts)

```typescript
// remotion-renderer/worker/render.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import type { RenderJob } from "../src/types";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const RENDERS_BUCKET = process.env.S3_RENDERS_BUCKET!;

export async function renderVideo(job: RenderJob): Promise<string> {
  const { jobId, inputProps, outputKey } = job;

  // Determine composition based on aspect ratio
  const compositionId = `ScriptToVideo-${inputProps.aspectRatio.replace(":", "-")}`;

  console.log(`Bundling for ${compositionId}...`);

  // Bundle the Remotion project
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    webpackOverride: (config) => config,
  });

  // Select composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  // Output path
  const outputPath = `/tmp/${jobId}.mp4`;

  console.log(`Rendering ${composition.durationInFrames} frames...`);

  // Render
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: {
      gl: "angle",
    },
    onProgress: ({ progress }) => {
      console.log(`Render progress: ${Math.round(progress * 100)}%`);
    },
  });

  console.log("Uploading to S3...");

  // Upload to S3
  const fileBuffer = fs.readFileSync(outputPath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: RENDERS_BUCKET,
      Key: outputKey,
      Body: fileBuffer,
      ContentType: "video/mp4",
    })
  );

  // Clean up
  fs.unlinkSync(outputPath);

  // Return public URL
  return `https://${RENDERS_BUCKET}.s3.amazonaws.com/${outputKey}`;
}
```

### 5.4 Build Configuration

```json
// remotion-renderer/package.json (add scripts)
{
  "scripts": {
    "start": "npx remotion studio",
    "build": "tsc",
    "render": "npx remotion render",
    "docker:build": "docker build -t clipking-remotion .",
    "docker:run": "docker run --env-file .env clipking-remotion"
  }
}
```

```json
// remotion-renderer/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "worker/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 6. ECS Task Definition

### 6.1 Create Task Definition

```json
// ecs-task-definition.json
{
  "family": "clipking-remotion-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "8192",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/clipkingRenderTaskRole",
  "containerDefinitions": [
    {
      "name": "remotion-worker",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/clipking-remotion:latest",
      "essential": true,
      "environment": [
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "SQS_RENDER_QUEUE_URL", "value": "YOUR_QUEUE_URL" },
        { "name": "S3_RENDERS_BUCKET", "value": "clipking-renders" },
        { "name": "DYNAMODB_JOBS_TABLE", "value": "clipking-render-jobs" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/clipking-remotion",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 6.2 Register Task Definition

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### 6.3 Create ECS Service with Auto-scaling

```bash
# Create service
aws ecs create-service \
  --cluster clipking-render-cluster \
  --service-name remotion-render-service \
  --task-definition clipking-remotion-task \
  --desired-count 0 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# Set up auto-scaling based on SQS queue
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/clipking-render-cluster/remotion-render-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 0 \
  --max-capacity 10

# Scale based on queue messages
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/clipking-render-cluster/remotion-render-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name scale-on-queue \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 1,
    "CustomizedMetricSpecification": {
      "MetricName": "ApproximateNumberOfMessagesVisible",
      "Namespace": "AWS/SQS",
      "Dimensions": [{"Name": "QueueName", "Value": "clipking-render-queue"}],
      "Statistic": "Average"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'
```

---

## 7. Lambda Job Controller

### 7.1 Lambda Function (Python)

```python
# lambda/job_controller.py
import json
import uuid
import boto3
import os
from datetime import datetime

sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

QUEUE_URL = os.environ['SQS_RENDER_QUEUE_URL']
JOBS_TABLE = os.environ['DYNAMODB_JOBS_TABLE']

def lambda_handler(event, context):
    """
    Lambda job controller - validates, queues, returns job_id.
    NO RENDERING HERE.
    """
    try:
        body = json.loads(event.get('body', '{}'))

        # Validate required fields
        required = ['scenes', 'captions', 'aspectRatio', 'totalDuration']
        for field in required:
            if field not in body:
                return response(400, {'error': f'Missing field: {field}'})

        # Generate job ID
        job_id = str(uuid.uuid4())
        output_key = f"videos/{job_id}.mp4"

        # Save job to DynamoDB
        table = dynamodb.Table(JOBS_TABLE)
        table.put_item(Item={
            'job_id': job_id,
            'status': 'queued',
            'created_at': datetime.utcnow().isoformat(),
            'input_props': body,
            'output_key': output_key,
        })

        # Queue render job
        sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps({
                'jobId': job_id,
                'inputProps': body,
                'outputKey': output_key,
            })
        )

        return response(202, {
            'job_id': job_id,
            'status': 'queued',
            'message': 'Render job queued successfully'
        })

    except Exception as e:
        return response(500, {'error': str(e)})

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(body)
    }
```

### 7.2 Deploy Lambda

```bash
# Zip and deploy
cd lambda
zip -r job_controller.zip .
aws lambda create-function \
  --function-name clipking-job-controller \
  --runtime python3.11 \
  --handler job_controller.lambda_handler \
  --role arn:aws:iam::YOUR_ACCOUNT:role/LambdaExecutionRole \
  --zip-file fileb://job_controller.zip \
  --environment "Variables={SQS_RENDER_QUEUE_URL=YOUR_QUEUE_URL,DYNAMODB_JOBS_TABLE=clipking-render-jobs}"
```

---

## 8. Backend Integration

### 8.1 Update Config (app/core/config.py)

```python
# Add to Settings class
# AWS Render Pipeline
SQS_RENDER_QUEUE_URL: str = ""
DYNAMODB_JOBS_TABLE: str = "clipking-render-jobs"
RENDER_LAMBDA_URL: str = ""  # API Gateway URL
```

### 8.2 Create Render Service (app/services/render_service.py)

```python
"""
Render Service - Queues video render jobs to AWS pipeline
"""

import logging
import json
import uuid
import boto3
from typing import Dict, Any, Optional
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RenderJobResult:
    job_id: str
    status: str


class RenderService:
    """
    Service for queuing video render jobs.
    Jobs are processed by ECS containers (not Lambda).
    """

    def __init__(self):
        self._sqs_client = None
        self._dynamodb = None

    @property
    def sqs(self):
        if self._sqs_client is None:
            self._sqs_client = boto3.client(
                'sqs',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._sqs_client

    @property
    def dynamodb(self):
        if self._dynamodb is None:
            self._dynamodb = boto3.resource(
                'dynamodb',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._dynamodb

    def is_configured(self) -> bool:
        return bool(settings.SQS_RENDER_QUEUE_URL)

    async def queue_render_job(
        self,
        scenes: list,
        captions: list,
        audio_url: Optional[str],
        aspect_ratio: str,
        total_duration: float,
    ) -> RenderJobResult:
        """Queue a render job to SQS."""

        job_id = str(uuid.uuid4())
        output_key = f"videos/{job_id}.mp4"

        # Build input props
        input_props = {
            "scenes": scenes,
            "captions": captions,
            "audioUrl": audio_url,
            "aspectRatio": aspect_ratio,
            "fps": 30,
            "totalDuration": total_duration,
        }

        # Save to DynamoDB
        table = self.dynamodb.Table(settings.DYNAMODB_JOBS_TABLE)
        table.put_item(Item={
            'job_id': job_id,
            'status': 'queued',
            'created_at': datetime.utcnow().isoformat(),
            'output_key': output_key,
        })

        # Queue to SQS
        self.sqs.send_message(
            QueueUrl=settings.SQS_RENDER_QUEUE_URL,
            MessageBody=json.dumps({
                'jobId': job_id,
                'inputProps': input_props,
                'outputKey': output_key,
            })
        )

        logger.info(f"Queued render job: {job_id}")

        return RenderJobResult(job_id=job_id, status='queued')

    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status from DynamoDB."""
        table = self.dynamodb.Table(settings.DYNAMODB_JOBS_TABLE)
        response = table.get_item(Key={'job_id': job_id})
        return response.get('Item', {})


# Singleton
_render_service: Optional[RenderService] = None

def get_render_service() -> RenderService:
    global _render_service
    if _render_service is None:
        _render_service = RenderService()
    return _render_service
```

---

## 9. Deployment

### 9.1 Build & Push Docker Image

```bash
cd remotion-renderer

# Build
docker build -t clipking-remotion .

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag clipking-remotion:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/clipking-remotion:latest

# Push
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/clipking-remotion:latest
```

### 9.2 Update ECS Service

```bash
aws ecs update-service \
  --cluster clipking-render-cluster \
  --service remotion-render-service \
  --force-new-deployment
```

---

## 10. Monitoring & Scaling

### ECS Container Specs (Recommended)

| Setting | Value | Notes |
|---------|-------|-------|
| CPU | 2 vCPU | Sweet spot for rendering |
| Memory | 8 GB | Chromium needs memory |
| Storage | 20 GB | Temp files during render |
| Timeout | ~10 min/video | Depends on length |

### Scaling Rules

```
1 ECS task = 1 render at a time

Auto-scale triggers:
- SQS queue length > 0 → spin up tasks
- Queue empty for 5 min → scale to 0
- Max 10 concurrent tasks (adjustable)
```

### CloudWatch Alarms

```bash
# Alarm for failed renders
aws cloudwatch put-metric-alarm \
  --alarm-name "RenderFailures" \
  --metric-name "ApproximateNumberOfMessagesNotVisible" \
  --namespace "AWS/SQS" \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=QueueName,Value=clipking-render-queue
```

---

## 11. Cost Estimation

### Per Video (10-30 sec)

| Component | Cost |
|-----------|------|
| ECS Fargate (2 vCPU, 8GB, ~2 min) | ~$0.02 |
| S3 storage | ~$0.001 |
| SQS messages | ~$0.0001 |
| DynamoDB | ~$0.0001 |
| **Total** | **~$0.02-0.03** |

### Monthly (1000 videos)

| Component | Cost |
|-----------|------|
| ECS Fargate | ~$20-30 |
| S3 | ~$5 |
| SQS | ~$1 |
| DynamoDB | ~$1 |
| Remotion License | $15-50 |
| **Total** | **~$45-90/month** |

### Cost Optimization Tips

1. Use **Fargate Spot** for 70% cost savings
2. Scale to **0 tasks** when idle
3. Set S3 lifecycle to delete old renders after 7 days
4. Use smaller resolution for previews

---

## Quick Reference

```bash
# Build & push container
docker build -t clipking-remotion . && \
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/clipking-remotion:latest

# Force ECS redeploy
aws ecs update-service --cluster clipking-render-cluster --service remotion-render-service --force-new-deployment

# Check queue
aws sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names All

# View logs
aws logs tail /ecs/clipking-remotion --follow

# Scale manually
aws ecs update-service --cluster clipking-render-cluster --service remotion-render-service --desired-count 5
```

---

## Checklist

- [ ] AWS credentials configured
- [ ] S3 buckets created
- [ ] SQS queue created
- [ ] DynamoDB table created
- [ ] ECR repository created
- [ ] ECS cluster created
- [ ] IAM roles created
- [ ] Remotion project built
- [ ] Docker image pushed
- [ ] ECS task definition registered
- [ ] ECS service created with auto-scaling
- [ ] Lambda job controller deployed (optional)
- [ ] Backend integration complete
- [ ] Test end-to-end render
