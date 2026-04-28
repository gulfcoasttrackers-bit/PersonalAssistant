# Personal Assistant

A self-hosted personal productivity web app for managing daily tasks, ongoing projects, and scheduled events. Built with Next.js 15, Prisma, and a local PostgreSQL database — no cloud accounts or paid services required.

---

## Features

- **Today view** — Greets you by name, shows tasks due today, overdue items, and inbox tasks (no project/due date)
- **Projects** — Group tasks under color-coded projects; track open task counts at a glance
- **Task subtasks** — Nest tasks one level deep; expand/collapse inline
- **Priority levels** — LOW / MEDIUM / HIGH / URGENT with color-coded indicators
- **Due dates** — Overdue tasks highlighted in red
- **Calendar** — Monthly grid showing events and task deadlines side by side
- **Quick-entry** — Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) to add a task from anywhere in the app
- **Google Calendar sync** — Optional OAuth integration (see [Google Calendar Setup](#google-calendar-setup))
- **Auth** — Email/password login and registration, JWT sessions via NextAuth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Auth | [NextAuth v4](https://next-auth.js.org) + bcrypt |
| Database | PostgreSQL (local) |
| ORM | [Prisma 5](https://www.prisma.io) |
| Styling | Tailwind CSS v3 |
| Validation | Zod |
| Drag & Drop | dnd-kit |

---

## Prerequisites

- **Node.js** v20+ (use [nvm](https://github.com/nvm-sh/nvm): `nvm use 20`)
- **PostgreSQL** running locally (default port `5432`)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Your local Postgres connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/personal_assistant"

# Generate a secure random secret:  openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional — only needed for Google Calendar sync
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 3. Create the database

Make sure PostgreSQL is running, then push the schema:

```bash
npm run db:push
```

This creates all tables in the `personal_assistant` database (creates the DB if it doesn't exist).

### 4. Generate Prisma client

```bash
npm run db:generate
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Register a new account to get started.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database (no migration history) |
| `npm run db:migrate` | Run Prisma migrations (development) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) at port 5555 |

---

## Project Structure

```
Personal Assistant/
├── prisma/
│   └── schema.prisma          # Database schema (User, Task, Project, Event)
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Protected layout — requires login
│   │   │   ├── layout.tsx     # Sidebar + QuickEntry wrapper
│   │   │   ├── today/         # Today view (page + client component)
│   │   │   ├── projects/      # Projects list + [id] detail page
│   │   │   └── calendar/      # Monthly calendar view
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   │   ├── register/      # POST /api/register — create account
│   │   │   ├── tasks/         # GET/POST /api/tasks, PATCH/DELETE /api/tasks/[id]
│   │   │   ├── projects/      # GET/POST /api/projects, GET/PATCH/DELETE /api/projects/[id]
│   │   │   └── events/        # GET/POST /api/events, PATCH/DELETE /api/events/[id]
│   │   ├── login/             # Login page
│   │   ├── register/          # Register page
│   │   ├── layout.tsx         # Root layout (Inter font, dark mode, SessionProvider)
│   │   └── page.tsx           # Root redirect → /today or /login
│   ├── components/
│   │   ├── Sidebar.tsx        # Navigation sidebar with project list
│   │   ├── QuickEntry.tsx     # Floating quick-add modal (⌘K)
│   │   └── TaskItem.tsx       # Reusable task row with subtasks and actions
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config (Credentials + optional Google)
│   │   ├── db.ts              # Prisma client singleton
│   │   └── utils.ts           # cn(), formatDate(), isPast()
│   └── types/
│       └── next-auth.d.ts     # NextAuth session type augmentation (adds user.id)
├── .env.local.example         # Environment variable template
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Database Schema

### Models

**User** — stores credentials and owns all other data  
**Task** — supports subtasks via self-referential `parentId`; optionally linked to a Project  
**Project** — groups tasks; has a display color and sort order  
**Event** — calendar events with start/end times; optional `googleEventId` for sync  

### Relationships

```
User ──< Project ──< Task
User ──< Task (inbox tasks with no project)
Task ──< Task (subtasks via parentId)
User ──< Event
```

### Priority Enum

`LOW` · `MEDIUM` · `HIGH` · `URGENT`

---

## API Reference

All routes require an authenticated session (JWT cookie). Unauthenticated requests return `401`.

### Tasks

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tasks` | List tasks. Query params: `projectId`, `dueToday=true`, `completed=true/false`, `parentId` |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/[id]` | Update title, completion, priority, due date, project, or order |
| `DELETE` | `/api/tasks/[id]` | Delete task (cascades to subtasks) |

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects with open task count |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/[id]` | Get project with all tasks |
| `PATCH` | `/api/projects/[id]` | Update title, description, color, or order |
| `DELETE` | `/api/projects/[id]` | Delete project (tasks become unlinked) |

### Events

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events` | List events. Query params: `start`, `end` (ISO datetime) |
| `POST` | `/api/events` | Create an event |
| `PATCH` | `/api/events/[id]` | Update title, times, or description |
| `DELETE` | `/api/events/[id]` | Delete event |

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/register` | Create account (`name`, `email`, `password`) |
| `*` | `/api/auth/[...nextauth]` | NextAuth session endpoints (sign in, sign out, session) |

---

## Google Calendar Setup

To enable Google Calendar sync (optional):

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → enable the **Google Calendar API**
3. Create **OAuth 2.0 credentials** (Web application type)
4. Add `http://localhost:3000/api/auth/callback/google` as an authorised redirect URI
5. Copy the Client ID and Secret into `.env.local`:

```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

A **Sign in with Google** button will automatically appear on the login page once these values are set.

---

## Security Notes

- Passwords are hashed with **bcrypt** (cost factor 12) — never stored in plaintext
- All API routes validate ownership (user ID from JWT vs. DB record) before any read/write
- Input is validated with **Zod** on every API route before hitting the database
- Sessions use **JWT strategy** (no session table required)
- `NEXTAUTH_SECRET` must be a strong random value in production (`openssl rand -base64 32`)
- The app binds to `localhost:3000` by default — do not expose the dev server to the internet

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing (min 32 chars) |
| `NEXTAUTH_URL` | Yes | Full URL of the app (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (Calendar sync) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret (Calendar sync) |
