# DocFlow by NurByte — SaaS starter V4

Production-oriented Next.js starter for document workflow automation. UI supports Polish, English and Indonesian. Every workspace page requires authentication.

## Included

- Next.js App Router + TypeScript
- next-intl: `pl`, `en`, `id`, browser locale detection and locale cookie
- registration and login
- "Remember me" persistent session (30 days); otherwise session cookie + 12h JWT
- server-side signed arithmetic CAPTCHA for registration (no third-party account required)
- PostgreSQL + Prisma ORM
- organization created during registration; registering user becomes OWNER
- automatic 30-day trial
- `subscriptionExempt` and `trialExempt` user flags
- templates, document generation demo, settings, subscription access model
- TanStack Query + Axios and reusable API hooks/services
- global types under `/src/types`, feature-local services/types
- lazy/dynamic imports for client-heavy auth/template/document components
- NurByte branding
- example document templates seeded into a demo organization

## PostgreSQL — easiest free test database

### Neon (recommended)

Create a free account at https://neon.com, create a PostgreSQL project and copy its connection string. Put it in `.env` as `DATABASE_URL`.

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

Neon has a free tier and works with Prisma/PostgreSQL.

You can also use Prisma Postgres. Prisma documents `npx create-db@latest` as a quick way to provision a temporary database and receive a connection string/claim URL.

## Setup

Requires Node.js >= 20.9 and Yarn Berry 4.

```bash
corepack enable
cp .env.example .env
# fill DATABASE_URL, AUTH_SECRET and CAPTCHA_SECRET
yarn install
yarn db:generate
yarn db:push
yarn db:seed
yarn dev
```

Open http://localhost:3000. The app redirects anonymous users to login. Registration is available from the login page.

Generate secrets, for example:

```bash
openssl rand -base64 48
```

Use a different value for `AUTH_SECRET` and `CAPTCHA_SECRET`.

## Prisma schema

The generator is intentionally written in canonical multiline form:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

This fixes the invalid generator definition from the previous archive.

## Subscription exceptions

`User.subscriptionExempt = true` bypasses subscription requirements entirely. Use this for internal NurByte accounts, partners or manually granted lifetime access.

`User.trialExempt = true` means the user does not receive trial access; without an active subscription (or `subscriptionExempt`) access can be restricted by the subscription access service.

Normal registrations receive a trial based on `DEFAULT_TRIAL_DAYS` (30 by default).

## Security notes

The custom CAPTCHA is intentionally small and dependency-free: the challenge is signed with HMAC, expires after 5 minutes and the expected answer is never sent as plaintext. For a public high-traffic launch, add API rate limiting and consider Cloudflare Turnstile as a stronger bot-defense layer.

Passwords are hashed with bcrypt (cost 12). Sessions use signed HTTP-only, SameSite=Lax cookies and Secure cookies in production.

## Architecture

- `src/app/[locale]` — localized App Router pages
- `src/app/api` — Route Handlers (`route.ts`)
- `src/features/*` — feature UI, service hooks and local types
- `src/hooks` — reusable global hooks
- `src/server` — server-only auth, subscription, CAPTCHA and document logic
- `src/types` — global shared types
- `messages` — PL/EN/ID translations
- `prisma` — PostgreSQL schema and seed

© 2026 NurByte
