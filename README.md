# FamCal

Self-hosted family calendar built with Next.js, PostgreSQL, Prisma, Docker Compose, and Web Push.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `AUTH_SECRET`, and VAPID values.
3. Run `docker compose up -d db`.
4. Run `npm install`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Run `npm run dev`.

## Production

Run `docker compose up -d` behind an HTTPS reverse proxy. HTTPS is required for PWA installation and push notifications.

## Verification

Run `npm test`, `npm run build`, and `npm run test:e2e` before deploying.
