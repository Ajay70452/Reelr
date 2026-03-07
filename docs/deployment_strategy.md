# 🚀 Reelr — ECS Fargate Deployment Strategy

## Version: 1.0 | Date: March 2026

---

## 1. Deployment Overview

Reelr is deployed as **4 containerized services** on **AWS ECS Fargate**, with the Next.js frontend on **Vercel** (already configured).

```
┌──────────────────────────────────────────────────────────────────────┐
│                          AWS Cloud (us-east-1)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              ECS Cluster: reelr-production                   │    │
│  │                                                              │    │
│  │   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │   │  API Service │  │ CPU Workers  │  │ CPU-Heavy Workers│   │    │
│  │   │  (FastAPI)   │  │ (LLM/Audio/  │  │ (Render/Stock)   │   │    │
│  │   │  Fargate     │  │  Scene/etc)  │  │  Fargate         │   │    │
│  │   │  Port: 8000  │  │  Fargate     │  │                  │   │    │
│  │   └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │    │
│  │          │                 │                     │             │    │
│  │          └─────────┬───────┴─────────────────────┘             │    │
│  │                    │                                           │    │
│  │              ┌─────▼──────┐                                   │    │
│  │              │ ElastiCache│                                   │    │
│  │              │  (Redis)   │                                   │    │
│  │              └────────────┘                                   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐                   │
│  │   ALB    │  │   ECR    │  │  Secrets Manager  │                   │
│  │(Load Bal)│  │(Registry)│  │  (API Keys/Creds) │                   │
│  └──────────┘  └──────────┘  └──────────────────┘                   │
│                                                                      │
│  ┌──────────┐  ┌──────────┐                                         │
│  │    S3    │  │CloudFront│     (Already existing)                   │
│  └──────────┘  └──────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘

External Services (unchanged):
  • Supabase (PostgreSQL + Auth)       • Fal.ai (Image/Video Gen)
  • Deepgram (TTS/STT)                 • Google Gemini (LLM)
  • ElevenLabs (TTS)                   • Stripe (Payments)

Frontend:
  • Vercel (already configured with vercel.json)
```

---

## 2. Service Breakdown

We split the backend into **3 ECS services** from a **single Docker image** (different entrypoint commands):

| Service | Entrypoint | Fargate Sizing | Desired Count | Auto-Scale |
|---|---|---|---|---|
| **API** | `uvicorn app.main:app` | 0.5 vCPU / 1 GB | 2 | 2–6 (CPU > 60%) |
| **CPU Workers** | `python run_worker.py -q cpu` | 1 vCPU / 2 GB | 2 | 2–10 (queue depth) |
| **CPU-Heavy Workers** | `python run_worker.py -q cpu_heavy` | 2 vCPU / 4 GB | 1 | 1–4 (queue depth) |

> [!NOTE]
> GPU workers (Kling, Motion) call **external APIs** (Fal.ai, Replicate) — they don't need GPU hardware locally. They run as CPU workers that make HTTP calls and poll for results. If self-hosted GPU is needed later, use **ECS on EC2 with GPU instances** instead of Fargate.

---

## 3. Docker Setup

### 3.1 Backend Dockerfile

```dockerfile
# ---- Stage 1: Builder ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Runtime ----
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install runtime system deps (FFmpeg is critical for render workers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/
COPY run_worker.py .
COPY main.py .
COPY migrations/ ./migrations/

# Create temp directory
RUN mkdir -p /tmp/clipking

# Expose API port
EXPOSE 8000

# Health check for API service
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Default: run API server (overridden per service in task definition)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.2 `.dockerignore`

```
.git
.venv
__pycache__
.env
.env.local
*.pyc
.pytest_cache
tests/
docs/
frontend/
tmp_youtube_shorts_pipeline/
node_modules/
.next/
*.md
.github/
.agents/
.agent/
.cursor/
.trae/
.gemini/
.claude/
```

---

## 4. AWS Infrastructure

### 4.1 ECR (Elastic Container Registry)

```
Repository: reelr-backend
Image tags: latest, git-sha, v1.0.0 (semver)
Lifecycle: keep last 10 untagged images
```

### 4.2 ECS Cluster

```
Cluster Name: reelr-production
Capacity Provider: FARGATE + FARGATE_SPOT (workers can use spot)
```

### 4.3 ElastiCache Redis

```
Engine: Redis 7.x
Node Type: cache.t3.micro (MVP) → cache.r6g.large (scale)
Cluster Mode: Disabled (single-node is fine for MVP)
VPC: Same as ECS tasks
Encryption: In-transit enabled
```

> [!IMPORTANT]
> Replace `REDIS_URL=redis://localhost:6379` with `REDIS_URL=redis://<elasticache-endpoint>:6379` in production config. All ECS services must be in the **same VPC/subnet** as ElastiCache.

### 4.4 Application Load Balancer (ALB)

```
ALB: reelr-api-alb
Target Group: reelr-api-tg (port 8000, health check: GET /)
Listener: HTTPS:443 → Target Group
SSL: ACM certificate for api.reelr.com
```

### 4.5 Networking

```
VPC: reelr-vpc (10.0.0.0/16)
├── Public Subnets:   10.0.1.0/24, 10.0.2.0/24  (ALB)
├── Private Subnets:  10.0.10.0/24, 10.0.11.0/24 (ECS Tasks + ElastiCache)
└── NAT Gateway: 1 (for outbound internet from private subnets)

Security Groups:
  • sg-alb:       Inbound 443 from 0.0.0.0/0
  • sg-api:       Inbound 8000 from sg-alb only
  • sg-workers:   No inbound, outbound all (API calls to external services)
  • sg-redis:     Inbound 6379 from sg-api + sg-workers
```

---

## 5. ECS Task Definitions

### 5.1 API Service Task

```json
{
  "family": "reelr-api",
  "cpu": "512",
  "memory": "1024",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "executionRoleArn": "arn:aws:iam::role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::role/reelr-task-role",
  "containerDefinitions": [{
    "name": "api",
    "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/reelr-backend:latest",
    "portMappings": [{ "containerPort": 8000 }],
    "command": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8000/ || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    },
    "secrets": [
      { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:...:reelr/database-url" },
      { "name": "SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:...:reelr/secret-key" },
      { "name": "FAL_KEY", "valueFrom": "arn:aws:secretsmanager:...:reelr/fal-key" },
      { "name": "DEEPGRAM_API_KEY", "valueFrom": "..." },
      { "name": "GEMINI_API_KEY", "valueFrom": "..." },
      { "name": "AWS_ACCESS_KEY_ID", "valueFrom": "..." },
      { "name": "AWS_SECRET_ACCESS_KEY", "valueFrom": "..." },
      { "name": "STRIPE_SECRET_KEY", "valueFrom": "..." }
    ],
    "environment": [
      { "name": "APP_ENV", "value": "production" },
      { "name": "REDIS_URL", "value": "redis://<elasticache-endpoint>:6379" },
      { "name": "CORS_ORIGINS", "value": "[\"https://reelr.com\",\"https://www.reelr.com\"]" },
      { "name": "S3_BUCKET_NAME", "value": "clipking-media" },
      { "name": "AWS_REGION", "value": "us-east-1" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/reelr-api",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "api"
      }
    }
  }]
}
```

### 5.2 CPU Workers Task

Same image, different command:

```json
{
  "family": "reelr-cpu-workers",
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "cpu-worker",
    "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/reelr-backend:latest",
    "command": ["python", "run_worker.py", "--queues", "cpu"],
    "healthCheck": null,
    "secrets": "... (same as API)",
    "environment": "... (same as API, minus CORS)"
  }]
}
```

### 5.3 CPU-Heavy Workers Task (Render + Stock)

```json
{
  "family": "reelr-heavy-workers",
  "cpu": "2048",
  "memory": "4096",
  "ephemeralStorage": { "sizeInGiB": 40 },
  "containerDefinitions": [{
    "name": "heavy-worker",
    "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/reelr-backend:latest",
    "command": ["python", "run_worker.py", "--queues", "cpu_heavy"],
    "secrets": "... (same as API)",
    "environment": "... (same as API)"
  }]
}
```

> [!TIP]
> The `ephemeralStorage: 40GB` gives render workers room for temp video files during FFmpeg composition. Default Fargate ephemeral is only 20GB.

---

## 6. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main]
    paths-ignore:
      - 'frontend/**'
      - 'docs/**'
      - '*.md'

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: reelr-backend
  ECS_CLUSTER: reelr-production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Deploy API service
        run: aws ecs update-service --cluster $ECS_CLUSTER --service reelr-api --force-new-deployment

      - name: Deploy CPU workers
        run: aws ecs update-service --cluster $ECS_CLUSTER --service reelr-cpu-workers --force-new-deployment

      - name: Deploy Heavy workers
        run: aws ecs update-service --cluster $ECS_CLUSTER --service reelr-heavy-workers --force-new-deployment

      - name: Wait for API stability
        run: aws ecs wait services-stable --cluster $ECS_CLUSTER --services reelr-api
```

---

## 7. Auto-Scaling

### API Service (CPU-based)

```
Policy: Target Tracking
Metric: ECSServiceAverageCPUUtilization
Target: 60%
Min: 2, Max: 6
Scale-in cooldown: 300s
Scale-out cooldown: 60s
```

### Worker Services (Queue Depth-based)

Custom CloudWatch metric via a small Lambda that reads Redis queue depth:

```
Metric: ReelrQueueDepth (custom)
Queue > 5 jobs  → scale out
Queue = 0 jobs  → scale in (keep minimum 1)
Min: 1, Max: 10 (CPU) / 4 (Heavy)
```

---

## 8. Environment & Secrets Strategy

| Category | Where Stored | How Injected |
|---|---|---|
| **API Keys** (Fal, Deepgram, Gemini, Stripe, etc.) | AWS Secrets Manager | ECS `secrets` in task def |
| **Database URL** | AWS Secrets Manager | ECS `secrets` |
| **Redis URL** | Plain env var | ECS `environment` (not secret, internal VPC) |
| **App config** (CORS, region, bucket) | Plain env var | ECS `environment` |
| **Frontend env vars** | Vercel env vars | Already configured in `vercel.json` |

---

## 9. Deployment Checklist (Day-1 Setup)

### Phase 1: AWS Foundation
- [ ] Create VPC with public + private subnets + NAT Gateway
- [ ] Create security groups (ALB, API, Workers, Redis)
- [ ] Create ElastiCache Redis cluster
- [ ] Create ECR repository `reelr-backend`
- [ ] Create ACM SSL certificate for `api.reelr.com`
- [ ] Create ALB with HTTPS listener
- [ ] Store secrets in AWS Secrets Manager

### Phase 2: ECS Setup
- [ ] Create ECS cluster `reelr-production`
- [ ] Create IAM roles (task execution + task role with S3/Secrets access)
- [ ] Create task definitions (API, CPU workers, Heavy workers)
- [ ] Create ECS services with desired counts
- [ ] Configure auto-scaling policies
- [ ] Create CloudWatch log groups

### Phase 3: Docker & CI/CD
- [ ] Create `Dockerfile` in project root
- [ ] Create `.dockerignore`
- [ ] Build and test image locally
- [ ] Push first image to ECR
- [ ] Set up GitHub Actions deployment workflow
- [ ] Add AWS credentials to GitHub Secrets

### Phase 4: DNS & Frontend
- [ ] Point `api.reelr.com` → ALB DNS (Route 53 CNAME/Alias)
- [ ] Update Vercel env `NEXT_PUBLIC_API_URL` to `https://api.reelr.com`
- [ ] Update CORS_ORIGINS to production domain
- [ ] Deploy frontend to Vercel

### Phase 5: Verification
- [ ] Verify API health check via ALB
- [ ] Submit a test video generation job
- [ ] Verify worker processes job from queue
- [ ] Verify S3 upload and signed URL
- [ ] Monitor CloudWatch logs for errors

---

## 10. Cost Estimate (MVP)

| Resource | Spec | Monthly Cost (est.) |
|---|---|---|
| ECS Fargate — API (2 tasks) | 0.5 vCPU, 1GB each | ~$30 |
| ECS Fargate — CPU Workers (2 tasks) | 1 vCPU, 2GB each | ~$60 |
| ECS Fargate — Heavy Workers (1 task) | 2 vCPU, 4GB | ~$60 |
| ElastiCache Redis | cache.t3.micro | ~$13 |
| ALB | Standard | ~$20 |
| NAT Gateway | 1 AZ | ~$35 |
| ECR Storage | ~2 GB | ~$1 |
| CloudWatch Logs | Moderate | ~$5 |
| **Total** | | **~$224/mo** |

> [!TIP]
> Use **Fargate Spot** for worker services to save ~70% on worker costs. Workers are fault-tolerant since RQ retries failed jobs. This could bring the total to **~$150/mo**.

---

## 11. Production Hardening (Post-MVP)

| Area | Action |
|---|---|
| **Monitoring** | Add Sentry DSN, enable CloudWatch alarms for 5xx, queue depth |
| **Logging** | JSON structured logs (already using `python-json-logger`) |
| **Database** | Run migrations via one-off ECS task (`python run_new_migrations.py`) |
| **Rollback** | Pin image tags to git SHA, ECS supports rolling deploy + circuit breaker |
| **WAF** | Attach AWS WAF to ALB for rate limiting and bot protection |
| **Backups** | Supabase handles DB backups; S3 versioning for media |
| **Multi-AZ** | ALB + Fargate already multi-AZ; ElastiCache can add replicas |

---

## 12. Architecture Decisions

| Decision | Rationale |
|---|---|
| **Single Docker image, multiple entrypoints** | Simplifies CI/CD — one build, three services. Workers share same code as API. |
| **Fargate over EC2** | No server management, pay-per-use, auto-patching. Perfect for MVP. |
| **ElastiCache over self-managed Redis** | Managed, HA-capable, same VPC. No operational overhead. |
| **Vercel for frontend** | Already configured. Global CDN, zero-config. No need to containerize Next.js. |
| **Secrets Manager over env files** | Secure, rotatable, auditable. No secrets in Docker images or source code. |
| **Private subnets for tasks** | ECS tasks don't need public IPs. ALB handles inbound. NAT handles outbound. |
| **Fargate Spot for workers** | Workers are idempotent (RQ retry). 70% cost savings with minimal risk. |
