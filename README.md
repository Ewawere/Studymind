# StudyMind

**AI tutor that gets smarter about every student every day.**

Not a chat wrapper. Curriculum-aware, Learning-Brain driven tutoring built first for WAEC & JAMB students.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| Auth | Clerk |
| Database | Supabase PostgreSQL + Prisma |
| AI | (coming) OpenAI / Anthropic with model routing |
| Payments | (coming) Paystack |

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Marketing landing
│   ├── (auth)/login & signup    # Clerk auth screens
│   ├── onboarding/              # Academic profile capture
│   ├── app/                     # Authenticated shell
│   │   ├── page.tsx             # Home dashboard
│   │   ├── tutor/ practice/ planner/ profile/
│   └── api/webhooks/clerk/      # User sync webhook
├── components/
├── lib/
│   ├── prisma.ts                # Prisma client
│   └── auth/get-current-user.ts
└── middleware.ts                # Clerk route protection

prisma/
├── schema.prisma                # Full data model
├── seed.ts                      # Curriculum seed data
└── migrations/                  # Versioned schema history
```

## Getting started

### 1. Clone & install

```bash
git clone https://github.com/Ewawere/Studymind.git
cd Studymind
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

**Clerk** (https://dashboard.clerk.com)
- Create an application
- Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Under Webhooks → add endpoint: `https://your-domain.com/api/webhooks/clerk`
  - Events: `user.created`, `user.updated`, `user.deleted`
  - Copy the signing secret → `CLERK_WEBHOOK_SECRET`

**Supabase** (https://supabase.com)
- Create a project
- Go to Project Settings → Database
- Copy the **Connection string** (Transaction / pooling) → `DATABASE_URL`
- Copy the **Direct connection** string → `DIRECT_URL`

### 3. Database setup (migrations, not db push)

We use **Prisma Migrate** for version history and safer deployments.

```bash
# Generate Prisma client
npx prisma generate

# Create the initial migration (first time only)
npx prisma migrate dev --name init

# Seed WAEC + JAMB subjects & topics
npx tsx prisma/seed.ts
```

**Later schema changes:**
```bash
npx prisma migrate dev --name <short_description>
```

**Production:**
```bash
npx prisma migrate deploy
```

> Avoid `prisma db push` once the schema starts evolving. Migrations give you history and make deploys safer.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Core data model

- **User** — synced from Clerk, holds academic profile + streak + plan
- **Curriculum → Subject → Topic → Concept** — taxonomy
- **SubjectMastery / ConceptState** — Learning Brain (mastery + SM-2)
- **StudyPlan / StudyPlanItem / ExamDeadline** — planning
- **Question / QuestionAttempt / QuizAttempt** — question bank & practice
- **Conversation / Message** — AI tutor sessions
- **Subscription** — Paystack-ready billing

### Question metadata (required for AI Tutor quality)

Every question should carry structured metadata so the tutor can personalize:

| Field | Purpose |
|-------|--------|
| `curriculumId` / `subjectId` / `topicId` / `conceptId` | Taxonomy placement |
| `difficulty` (1–5) | Adaptive difficulty |
| `year` + `source` | Exam authenticity |
| `explanation` | Worked solution |
| `commonMistakes` | Targeted feedback |
| `learningObjectives` | What the student should learn |
| `estimatedTimeSec` | Pacing & exam mode |
| `tags` | Search & filtering |

## Roadmap status

- [x] Landing page + app shell
- [x] Clerk authentication
- [x] Prisma schema + seed (migration-first)
- [ ] Learning Brain service
- [ ] Question bank import (with full metadata)
- [ ] AI Tutor (streaming)
- [ ] Planner + AI Coach
- [ ] Emergency Exam Mode
- [ ] Paystack payments
- [ ] Analytics

## License

Private — All rights reserved.
