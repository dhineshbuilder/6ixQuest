# 6ixQuest

6ixQuest is an AI-assisted quiz creation and assessment platform for educators, trainers, and teams. Creators can build quizzes manually or generate questions with Gemini, share public quiz links, collect student responses, and review results from a protected dashboard.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_Auth-3ECF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-AI_Quiz_Generation-4285F4)

## Screenshots

### Home

![6ixQuest home screen](public/screenshots/home.png)

### Sign In

![6ixQuest sign-in screen](public/screenshots/login.png)

## Features

- AI quiz generation from a topic or study notes using Google Gemini.
- Manual quiz builder with editable questions, options, correct answers, and ordering.
- Teacher authentication with email/password and Google sign-in through Supabase Auth.
- Protected creator dashboard for managing quizzes.
- Public quiz links that students can open without creating an account.
- Active/inactive quiz controls and optional valid-from / valid-until scheduling.
- Anti-cheating flow with fullscreen enforcement, tab-switch warnings, disabled copy/paste/right-click, and automatic submission after repeated violations.
- One-attempt response tracking using student identity fields.
- Automatic scoring and detailed response review.
- CSV export for quiz results.
- Responsive UI built with Tailwind CSS and Lucide icons.
- Vercel-ready SPA routing through `vercel.json`.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Icons | Lucide React |
| Backend services | Supabase Auth, Supabase Postgres, Row Level Security |
| AI generation | Google Gemini API through `src/lib/gemini.ts` |
| Deployment | Vercel |

## Architecture Overview

```mermaid
flowchart LR
  Creator[Teacher / Creator] --> UI[React + Vite App]
  Student[Student / Quiz Taker] --> UI

  UI --> Auth[Supabase Auth]
  UI --> DB[(Supabase Postgres)]
  UI --> AI[Gemini API]

  Auth --> UI
  AI --> UI

  DB --> Quizzes[quizzes]
  DB --> Questions[questions]
  DB --> Responses[responses]

  Vercel[Vercel Hosting] --> UI
```

### Application Flow

1. A teacher signs in through Supabase Auth.
2. The teacher creates a quiz manually or generates quiz content with Gemini.
3. Quiz metadata is stored in `quizzes`; questions are stored in `questions`.
4. The teacher shares a `/quiz/:id` link with students.
5. Students submit answers without logging in.
6. Responses and scores are stored in `responses`.
7. The teacher reviews analytics and exports results from the dashboard.

### Database Tables

| Table | Purpose |
| --- | --- |
| `quizzes` | Quiz title, description, creator, active status, and validity dates |
| `questions` | Question text, answer options, correct answer, and ordering |
| `responses` | Student details, selected answers, score, total questions, and submission time |

Row Level Security is enabled so authenticated creators can manage their own quizzes, while anonymous students can only read active quizzes/questions and insert responses.

## Project Structure

```text
.
├── public/
│   └── screenshots/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   │   ├── gemini.ts
│   │   ├── groq.ts
│   │   └── supabase.ts
│   ├── pages/
│   └── types/
├── supabase/
│   └── migrations/
├── vercel.json
├── vite.config.ts
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 18 or newer
- npm
- Supabase project
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/6ixquest.git
cd 6ixquest
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash

# Optional legacy provider key. The current UI uses Gemini.
VITE_GROQ_API_KEY=your_groq_api_key
```

Important: variables prefixed with `VITE_` are exposed to the browser bundle. For a public production app, restrict the Gemini key in Google Cloud/AI Studio or move AI generation behind a server-side API route.

### 4. Configure Supabase

Run the SQL migrations in `supabase/migrations`.

With Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or copy each migration SQL file into the Supabase SQL Editor and run them in order.

For authentication:

- Enable email/password auth in Supabase if you want email login.
- Enable Google OAuth if you want Google sign-in.
- Add local and deployed URLs to Supabase Auth redirect URLs:
  - `http://localhost:5173`
  - `https://your-vercel-domain.vercel.app`

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

### 6. Build for production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Vercel Deployment

This project includes `vercel.json` so React Router routes work after refresh.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Vercel settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add these environment variables in Vercel:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
VITE_GEMINI_MODEL=gemini-2.5-flash
```

After deployment, add the Vercel URL to Supabase Auth redirect URLs.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Create a production build in `dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous public key |
| `VITE_GEMINI_API_KEY` | Yes | Gemini API key used for AI quiz generation |
| `VITE_GEMINI_MODEL` | Recommended | Gemini model name, defaults to `gemini-2.5-flash` |
| `VITE_GROQ_API_KEY` | No | Legacy/optional Groq key if you wire the Groq service back in |

## Notes

- `.env` is ignored by git and should not be committed.
- `.env.example` documents the required variable names.
- Students can access quiz-taking routes without authentication.
- Teachers must be authenticated to create, edit, share, and review quizzes.
- The app currently calls Gemini directly from the browser, which is convenient for a frontend-only deployment but not ideal for protecting production API keys.

## License

No license file is currently included. Add a `LICENSE` file before publishing if you want to define reuse permissions.
