# ClipKing Frontend

AI-powered video generation platform frontend built with Next.js.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── layout.tsx      # Root layout with providers
│   ├── page.tsx        # Landing page
│   ├── providers.tsx   # React Query provider
│   └── globals.css     # Global styles & dark theme
├── components/         # React components (to be added in Phase 2.2)
├── hooks/             # Custom React hooks
│   └── useApi.ts      # API hooks with React Query
├── lib/               # Utility libraries
│   ├── api.ts         # Axios API client
│   └── utils.ts       # Helper functions
├── store/             # Zustand state management
│   ├── wizardStore.ts # Video wizard state
│   └── userStore.ts   # User authentication state
└── types/             # TypeScript type definitions
    └── index.ts       # Shared types
```

## Theme

ClipKing uses a **dark cinematic theme** with:
- Black and deep gray backgrounds
- Neon green (`#00ff88`) and blue (`#00d4ff`) accents
- Soft card shadows and glows
- Inspired by Runway, Pika, and Revid

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
| `NEXT_PUBLIC_API_TIMEOUT` | API request timeout (ms) | `30000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJxxx...` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key | `phc_xxx` |
| `NEXT_PUBLIC_ENV` | Environment name | `development` |

## Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow ESLint rules
- Use functional components with hooks
- Prefer composition over inheritance

### Component Guidelines
- Keep components small and focused
- Use the wizard store for multi-step state
- Use React Query for server state
- Use Zustand for client state

### API Integration
- All API calls go through `src/lib/api.ts`
- Use React Query hooks from `src/hooks/useApi.ts`
- Handle loading and error states properly

## Next Steps (Phase 2.2)

Build the core screens:
1. Landing Page
2. Signup/Login
3. Dashboard
4. Create Video Wizard (4 steps)
5. Job Status Screen
6. Video Complete Screen
7. Video Library

## License

Proprietary - All rights reserved
