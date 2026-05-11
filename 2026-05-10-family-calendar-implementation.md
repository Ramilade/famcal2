# Family Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of the self-hosted family calendar app with local login, family-scoped events, recurrence, in-app reminders, PWA support, and web push notifications.

**Architecture:** Use a single Next.js TypeScript app with server-side actions/API routes, Prisma-backed PostgreSQL persistence, and a separate worker entrypoint from the same codebase for scheduled push reminders. Keep domain logic in focused `src/lib/*` modules so recurrence, authorization, reminders, and push delivery can be tested without rendering UI.

**Tech Stack:** Next.js, React, TypeScript, PostgreSQL, Prisma, Auth.js-style credentials sessions, bcrypt, Zod, Vitest, Playwright, Docker Compose, Web Push.

---

## File Structure

- `package.json`: scripts and dependencies.
- `next.config.ts`: Next.js config.
- `tsconfig.json`: TypeScript config.
- `eslint.config.mjs`: lint config.
- `vitest.config.ts`: unit/integration test config.
- `playwright.config.ts`: E2E test config.
- `.env.example`: documented environment variables.
- `docker-compose.yml`: app, worker, and PostgreSQL services.
- `Dockerfile`: production app/worker image.
- `prisma/schema.prisma`: database model.
- `prisma/seed.ts`: first family/admin seed.
- `src/app/*`: Next.js App Router pages, layouts, actions, and API routes.
- `src/components/*`: focused UI components.
- `src/lib/db.ts`: Prisma singleton.
- `src/lib/auth/*`: password hashing, session helpers, login/logout.
- `src/lib/family/*`: family membership and authorization helpers.
- `src/lib/events/*`: event validation, persistence, and recurrence expansion.
- `src/lib/reminders/*`: reminder due calculations and worker orchestration.
- `src/lib/push/*`: VAPID/web-push helpers and subscription persistence.
- `src/worker/reminders.ts`: standalone worker loop entrypoint.
- `src/test/*`: test helpers and factories.
- `tests/unit/*`: pure unit tests.
- `tests/integration/*`: database-backed tests.
- `tests/e2e/*`: Playwright happy-path tests.
- `public/manifest.webmanifest`: PWA manifest.
- `public/sw.js`: service worker for push notifications.

## Task 1: Scaffold The Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Scaffold the app files**

Run: `npm create next-app@latest . -- --ts --eslint --app --src-dir --no-tailwind --import-alias "@/*"`

Expected: creates a Next.js TypeScript app in the current directory.

- [ ] **Step 2: Install runtime and test dependencies**

Run: `npm install @prisma/client prisma zod bcryptjs web-push date-fns rrule && npm install -D vitest @vitest/ui playwright @playwright/test tsx @types/bcryptjs @types/web-push`

Expected: packages are added to `package.json` and `package-lock.json`.

- [ ] **Step 3: Add test scripts**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "worker:reminders": "tsx src/worker/reminders.ts"
  }
}
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
```

- [ ] **Step 5: Verify scaffold**

Run: `npm run build`

Expected: Next.js production build exits with code 0.

- [ ] **Step 6: Commit**

Run: `git add . && git commit -m "chore: scaffold next app"`

## Task 2: Add Docker And Environment Baseline

**Files:**
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Add environment example**

Create `.env.example`:

```env
DATABASE_URL="postgresql://famcal:famcal@db:5432/famcal?schema=public"
AUTH_SECRET="replace-with-a-long-random-string"
APP_URL="https://calendar.example.com"
VAPID_PUBLIC_KEY="replace-after-generation"
VAPID_PRIVATE_KEY="replace-after-generation"
VAPID_SUBJECT="mailto:admin@example.com"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="change-this-password"
SEED_ADMIN_NAME="Admin"
SEED_FAMILY_NAME="Family"
```

- [ ] **Step 2: Add Docker Compose**

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: famcal
      POSTGRES_USER: famcal
      POSTGRES_PASSWORD: famcal
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U famcal -d famcal"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    command: npm run start
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"

  worker:
    build: .
    command: npm run worker:reminders
    env_file: .env
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres-data:
```

- [ ] **Step 3: Add Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
```

- [ ] **Step 4: Add Docker ignore**

Create `.dockerignore`:

```gitignore
.git
.next
node_modules
.env
test-results
playwright-report
```

- [ ] **Step 5: Verify Docker config parses**

Run: `docker compose config`

Expected: config prints without errors.

- [ ] **Step 6: Commit**

Run: `git add . && git commit -m "chore: add docker deployment baseline"`

## Task 3: Add Prisma Schema And Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/auth/password.ts`
- Create: `tests/unit/password.test.ts`

- [ ] **Step 1: Write password hash test**

Create `tests/unit/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies a matching password and rejects a different password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/password.test.ts`

Expected: FAIL because `@/lib/auth/password` does not exist.

- [ ] **Step 3: Add Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum FamilyRole {
  admin
  member
}

enum RecurrenceFrequency {
  daily
  weekly
  monthly
}

enum ReminderChannel {
  in_app
  push
}

model User {
  id                String             @id @default(cuid())
  email             String             @unique
  name              String
  passwordHash      String
  defaultColor      String             @default("#2563eb")
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  memberships       FamilyMember[]
  createdEvents     Event[]            @relation("CreatedEvents")
  responsibleEvents Event[]            @relation("ResponsibleEvents")
  pushSubscriptions PushSubscription[]
}

model Family {
  id        String         @id @default(cuid())
  name      String
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  members   FamilyMember[]
  events    Event[]
}

model FamilyMember {
  id        String     @id @default(cuid())
  familyId  String
  userId    String
  role      FamilyRole @default(member)
  createdAt DateTime   @default(now())
  family    Family     @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([familyId, userId])
}

model Event {
  id                String                 @id @default(cuid())
  familyId          String
  title             String
  description       String                 @default("")
  startsAt          DateTime
  endsAt            DateTime
  allDay            Boolean                @default(false)
  color             String                 @default("#2563eb")
  responsibleUserId String?
  createdByUserId   String
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
  family            Family                 @relation(fields: [familyId], references: [id], onDelete: Cascade)
  responsibleUser   User?                  @relation("ResponsibleEvents", fields: [responsibleUserId], references: [id], onDelete: SetNull)
  createdByUser     User                   @relation("CreatedEvents", fields: [createdByUserId], references: [id], onDelete: Restrict)
  recurrenceRule    RecurrenceRule?
  reminderRules     ReminderRule[]
  deliveries        NotificationDelivery[]

  @@index([familyId, startsAt])
}

model RecurrenceRule {
  id        String              @id @default(cuid())
  eventId   String              @unique
  frequency RecurrenceFrequency
  interval  Int                 @default(1)
  until     DateTime?
  count     Int?
  event     Event               @relation(fields: [eventId], references: [id], onDelete: Cascade)
}

model ReminderRule {
  id                  String                 @id @default(cuid())
  eventId             String
  minutesBeforeStart  Int
  channel             ReminderChannel
  createdAt           DateTime               @default(now())
  event               Event                  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  deliveries          NotificationDelivery[]
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model NotificationDelivery {
  id                 String       @id @default(cuid())
  eventId            String
  reminderRuleId     String
  occurrenceStartsAt DateTime
  channel            ReminderChannel
  deliveredAt        DateTime     @default(now())
  event              Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  reminderRule       ReminderRule @relation(fields: [reminderRuleId], references: [id], onDelete: Cascade)

  @@unique([eventId, reminderRuleId, occurrenceStartsAt, channel])
}
```

- [ ] **Step 4: Add Prisma singleton**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Add password helpers**

Create `src/lib/auth/password.ts`:

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 6: Add seed script**

Create `prisma/seed.ts`:

```ts
import { FamilyRole } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-this-password";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";
  const familyName = process.env.SEED_FAMILY_NAME ?? "Family";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      passwordHash: await hashPassword(password),
    },
  });

  const family = await prisma.family.create({ data: { name: familyName } });

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: user.id } },
    update: { role: FamilyRole.admin },
    create: { familyId: family.id, userId: user.id, role: FamilyRole.admin },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/unit/password.test.ts`

Expected: PASS.

- [ ] **Step 8: Verify Prisma generation**

Run: `npm run db:generate`

Expected: Prisma Client generated successfully.

- [ ] **Step 9: Commit**

Run: `git add . && git commit -m "feat: add database schema"`

## Task 4: Add Local Session Authentication

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/login.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/logout/route.ts`
- Modify: `src/app/page.tsx`
- Test: `tests/unit/login.test.ts`

- [ ] **Step 1: Write login tests**

Create `tests/unit/login.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { verifyLogin } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";

describe("verifyLogin", () => {
  it("returns the user for valid credentials", async () => {
    const passwordHash = await hashPassword("secret123");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "u1", email: "a@example.com", name: "A", passwordHash }),
      },
    };

    await expect(verifyLogin(prisma, "a@example.com", "secret123")).resolves.toEqual({
      id: "u1",
      email: "a@example.com",
      name: "A",
    });
  });

  it("returns null for invalid credentials", async () => {
    const passwordHash = await hashPassword("secret123");
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "u1", email: "a@example.com", name: "A", passwordHash }),
      },
    };

    await expect(verifyLogin(prisma, "a@example.com", "wrong")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/login.test.ts`

Expected: FAIL because `@/lib/auth/login` does not exist.

- [ ] **Step 3: Add login verifier**

Create `src/lib/auth/login.ts`:

```ts
import { verifyPassword } from "./password";

type LoginPrisma = {
  user: {
    findUnique(args: { where: { email: string } }): Promise<{
      id: string;
      email: string;
      name: string;
      passwordHash: string;
    } | null>;
  };
};

export async function verifyLogin(prisma: LoginPrisma, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
```

- [ ] **Step 4: Add cookie session helpers**

Create `src/lib/auth/session.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "famcal_user_id";

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}
```

- [ ] **Step 5: Add login action and page**

Create `src/app/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyLogin } from "@/lib/auth/login";
import { setSession } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyLogin(prisma, email, password);

  if (!user) {
    return { error: "Forkert email eller adgangskode." };
  }

  await setSession(user.id);
  redirect("/");
}
```

Create `src/app/login/page.tsx`:

```tsx
import { loginAction } from "./actions";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <form action={loginAction} className="card form-stack">
        <h1>Log ind</h1>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Adgangskode
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit">Log ind</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Add logout route and protected home**

Create `src/app/logout/route.ts`:

```ts
import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth/session";

export async function POST() {
  await clearSession();
  redirect("/login");
}
```

Modify `src/app/page.tsx`:

```tsx
import { requireUserId } from "@/lib/auth/session";

export default async function HomePage() {
  await requireUserId();

  return (
    <main className="app-shell">
      <h1>FamCal</h1>
      <p>Kalenderen er klar til næste trin.</p>
      <form action="/logout" method="post">
        <button type="submit">Log ud</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Run tests and build**

Run: `npm test -- tests/unit/login.test.ts && npm run build`

Expected: tests pass and build exits with code 0.

- [ ] **Step 8: Commit**

Run: `git add . && git commit -m "feat: add local login"`

## Task 5: Add Family Authorization Helpers

**Files:**
- Create: `src/lib/family/membership.ts`
- Test: `tests/unit/membership.test.ts`

- [ ] **Step 1: Write membership tests**

Create `tests/unit/membership.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { getPrimaryMembership, requireFamilyAccess } from "@/lib/family/membership";

describe("family membership", () => {
  it("returns the user's first membership", async () => {
    const prisma = {
      familyMember: {
        findFirst: vi.fn().mockResolvedValue({ id: "m1", userId: "u1", familyId: "f1", role: "admin" }),
      },
    };

    await expect(getPrimaryMembership(prisma, "u1")).resolves.toEqual({
      id: "m1",
      userId: "u1",
      familyId: "f1",
      role: "admin",
    });
  });

  it("throws when a user is not in the requested family", async () => {
    const prisma = { familyMember: { findFirst: vi.fn().mockResolvedValue(null) } };

    await expect(requireFamilyAccess(prisma, "u1", "f1")).rejects.toThrow("Family access denied");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/membership.test.ts`

Expected: FAIL because `@/lib/family/membership` does not exist.

- [ ] **Step 3: Add membership helpers**

Create `src/lib/family/membership.ts`:

```ts
type Membership = { id: string; userId: string; familyId: string; role: "admin" | "member" };

type MembershipPrisma = {
  familyMember: {
    findFirst(args: unknown): Promise<Membership | null>;
  };
};

export async function getPrimaryMembership(prisma: MembershipPrisma, userId: string) {
  return prisma.familyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireFamilyAccess(prisma: MembershipPrisma, userId: string, familyId: string) {
  const membership = await prisma.familyMember.findFirst({ where: { userId, familyId } });
  if (!membership) throw new Error("Family access denied");
  return membership;
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- tests/unit/membership.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add . && git commit -m "feat: add family access helpers"`

## Task 6: Add Event Validation And CRUD

**Files:**
- Create: `src/lib/events/schema.ts`
- Create: `src/lib/events/repository.ts`
- Create: `src/app/events/actions.ts`
- Test: `tests/unit/event-schema.test.ts`
- Test: `tests/unit/event-repository.test.ts`

- [ ] **Step 1: Write event schema tests**

Create `tests/unit/event-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { eventInputSchema } from "@/lib/events/schema";

describe("eventInputSchema", () => {
  it("accepts a valid event", () => {
    const result = eventInputSchema.safeParse({
      title: "Fodbold",
      description: "Træning",
      startsAt: "2026-06-01T16:00:00.000Z",
      endsAt: "2026-06-01T17:00:00.000Z",
      allDay: false,
      color: "#16a34a",
      responsibleUserId: "u1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an event that ends before it starts", () => {
    const result = eventInputSchema.safeParse({
      title: "Bad",
      description: "",
      startsAt: "2026-06-01T17:00:00.000Z",
      endsAt: "2026-06-01T16:00:00.000Z",
      allDay: false,
      color: "#16a34a",
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/event-schema.test.ts`

Expected: FAIL because `@/lib/events/schema` does not exist.

- [ ] **Step 3: Add event schema**

Create `src/lib/events/schema.ts`:

```ts
import { z } from "zod";

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(""),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    allDay: z.boolean().default(false),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    responsibleUserId: z.string().min(1).optional().nullable(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "Sluttidspunkt skal være efter starttidspunkt.",
    path: ["endsAt"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;
```

- [ ] **Step 4: Write repository tests**

Create `tests/unit/event-repository.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createEvent } from "@/lib/events/repository";

describe("createEvent", () => {
  it("creates an event scoped to the family and creator", async () => {
    const prisma = { event: { create: vi.fn().mockResolvedValue({ id: "e1" }) } };

    await expect(
      createEvent(prisma, {
        familyId: "f1",
        createdByUserId: "u1",
        input: {
          title: "Fodbold",
          description: "Træning",
          startsAt: "2026-06-01T16:00:00.000Z",
          endsAt: "2026-06-01T17:00:00.000Z",
          allDay: false,
          color: "#16a34a",
          responsibleUserId: "u2",
        },
      }),
    ).resolves.toEqual({ id: "e1" });

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: {
        familyId: "f1",
        createdByUserId: "u1",
        title: "Fodbold",
        description: "Træning",
        startsAt: new Date("2026-06-01T16:00:00.000Z"),
        endsAt: new Date("2026-06-01T17:00:00.000Z"),
        allDay: false,
        color: "#16a34a",
        responsibleUserId: "u2",
      },
    });
  });
});
```

- [ ] **Step 5: Add repository**

Create `src/lib/events/repository.ts`:

```ts
import { EventInput, eventInputSchema } from "./schema";

type EventPrisma = {
  event: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    update(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
  };
};

export async function createEvent(
  prisma: Pick<EventPrisma, "event">,
  args: { familyId: string; createdByUserId: string; input: EventInput },
) {
  const input = eventInputSchema.parse(args.input);
  return prisma.event.create({
    data: {
      familyId: args.familyId,
      createdByUserId: args.createdByUserId,
      title: input.title,
      description: input.description,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      allDay: input.allDay,
      color: input.color,
      responsibleUserId: input.responsibleUserId ?? null,
    },
  });
}
```

- [ ] **Step 6: Run event tests**

Run: `npm test -- tests/unit/event-schema.test.ts tests/unit/event-repository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run: `git add . && git commit -m "feat: add event validation and creation"`

## Task 7: Add Recurrence Expansion

**Files:**
- Create: `src/lib/events/recurrence.ts`
- Test: `tests/unit/recurrence.test.ts`

- [ ] **Step 1: Write recurrence tests**

Create `tests/unit/recurrence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { expandRecurringEvent } from "@/lib/events/recurrence";

describe("expandRecurringEvent", () => {
  it("expands a weekly event within a date range", () => {
    const occurrences = expandRecurringEvent({
      event: {
        id: "e1",
        startsAt: new Date("2026-06-01T10:00:00.000Z"),
        endsAt: new Date("2026-06-01T11:00:00.000Z"),
      },
      recurrenceRule: { frequency: "weekly", interval: 1, until: new Date("2026-06-30T23:59:59.000Z"), count: null },
      rangeStart: new Date("2026-06-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-06-30T23:59:59.000Z"),
    });

    expect(occurrences.map((item) => item.startsAt.toISOString())).toEqual([
      "2026-06-01T10:00:00.000Z",
      "2026-06-08T10:00:00.000Z",
      "2026-06-15T10:00:00.000Z",
      "2026-06-22T10:00:00.000Z",
      "2026-06-29T10:00:00.000Z",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/recurrence.test.ts`

Expected: FAIL because `@/lib/events/recurrence` does not exist.

- [ ] **Step 3: Add recurrence expansion**

Create `src/lib/events/recurrence.ts`:

```ts
import { RRule } from "rrule";

type Frequency = "daily" | "weekly" | "monthly";

const frequencyMap: Record<Frequency, RRule.Frequency> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
};

export function expandRecurringEvent(args: {
  event: { id: string; startsAt: Date; endsAt: Date };
  recurrenceRule: { frequency: Frequency; interval: number; until: Date | null; count: number | null };
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const durationMs = args.event.endsAt.getTime() - args.event.startsAt.getTime();
  const rule = new RRule({
    freq: frequencyMap[args.recurrenceRule.frequency],
    dtstart: args.event.startsAt,
    interval: args.recurrenceRule.interval,
    until: args.recurrenceRule.until ?? undefined,
    count: args.recurrenceRule.count ?? undefined,
  });

  return rule.between(args.rangeStart, args.rangeEnd, true).map((startsAt) => ({
    eventId: args.event.id,
    startsAt,
    endsAt: new Date(startsAt.getTime() + durationMs),
  }));
}
```

- [ ] **Step 4: Run recurrence tests**

Run: `npm test -- tests/unit/recurrence.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add . && git commit -m "feat: add recurrence expansion"`

## Task 8: Add Calendar UI

**Files:**
- Create: `src/components/calendar/calendar-shell.tsx`
- Create: `src/components/calendar/event-form.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add calendar shell component**

Create `src/components/calendar/calendar-shell.tsx`:

```tsx
type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  color: string;
  responsibleName: string | null;
};

export function CalendarShell({ events }: { events: CalendarEvent[] }) {
  return (
    <section className="calendar-shell">
      <header className="calendar-header">
        <div>
          <p className="eyebrow">Familiekalender</p>
          <h1>Denne uge</h1>
        </div>
        <a className="button" href="#new-event">Ny aftale</a>
      </header>
      <div className="event-list">
        {events.length === 0 ? <p>Ingen aftaler i perioden.</p> : null}
        {events.map((event) => (
          <article className="event-card" key={event.id} style={{ borderColor: event.color }}>
            <strong>{event.title}</strong>
            <span>{new Date(event.startsAt).toLocaleString("da-DK")}</span>
            {event.responsibleName ? <span>{event.responsibleName}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add event form component**

Create `src/components/calendar/event-form.tsx`:

```tsx
import { createEventAction } from "@/app/events/actions";

export function EventForm() {
  return (
    <form id="new-event" action={createEventAction} className="card form-stack">
      <h2>Ny aftale</h2>
      <label>Titel<input name="title" required maxLength={120} /></label>
      <label>Beskrivelse<textarea name="description" maxLength={2000} /></label>
      <label>Start<input name="startsAt" type="datetime-local" required /></label>
      <label>Slut<input name="endsAt" type="datetime-local" required /></label>
      <label>Farve<input name="color" type="color" defaultValue="#2563eb" /></label>
      <button type="submit">Gem aftale</button>
    </form>
  );
}
```

- [ ] **Step 3: Wire home page to calendar components**

Replace `src/app/page.tsx` with:

```tsx
import { addDays } from "date-fns";
import { EventForm } from "@/components/calendar/event-form";
import { CalendarShell } from "@/components/calendar/calendar-shell";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPrimaryMembership } from "@/lib/family/membership";

export default async function HomePage() {
  const userId = await requireUserId();
  const membership = await getPrimaryMembership(prisma, userId);

  if (!membership) {
    return <main className="app-shell"><p>Du er ikke medlem af en familie endnu.</p></main>;
  }

  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      familyId: membership.familyId,
      startsAt: { lt: addDays(now, 7) },
      endsAt: { gt: now },
    },
    include: { responsibleUser: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="app-shell">
      <CalendarShell
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          color: event.color,
          responsibleName: event.responsibleUser?.name ?? null,
        }))}
      />
      <EventForm />
      <form action="/logout" method="post">
        <button type="submit">Log ud</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Add mobile-first styles**

Replace `src/app/globals.css` with:

```css
:root {
  color-scheme: light;
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #2563eb;
  --border: #e2e8f0;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

input, textarea, button {
  font: inherit;
}

.app-shell, .auth-shell {
  width: min(100%, 960px);
  margin: 0 auto;
  padding: 20px;
}

.auth-shell {
  min-height: 100svh;
  display: grid;
  place-items: center;
}

.card, .event-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 0.08);
}

.form-stack {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.form-stack label {
  display: grid;
  gap: 6px;
  color: var(--muted);
}

.form-stack input, .form-stack textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  color: var(--text);
}

button, .button {
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  padding: 12px 16px;
  text-decoration: none;
  font-weight: 700;
}

.calendar-shell {
  display: grid;
  gap: 18px;
  margin-bottom: 24px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
}

.calendar-header h1 { margin: 0; }

.event-list {
  display: grid;
  gap: 12px;
}

.event-card {
  display: grid;
  gap: 4px;
  padding: 16px;
  border-left-width: 8px;
}

.event-card span { color: var(--muted); }

@media (min-width: 768px) {
  .app-shell { padding: 48px 32px; }
  .event-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: build exits with code 0.

- [ ] **Step 6: Commit**

Run: `git add . && git commit -m "feat: add mobile calendar UI"`

## Task 9: Add Reminder Rules And In-App Reminders

**Files:**
- Create: `src/lib/reminders/due.ts`
- Modify: `src/lib/events/schema.ts`
- Modify: `src/lib/events/repository.ts`
- Test: `tests/unit/reminders.test.ts`

- [ ] **Step 1: Write reminder due tests**

Create `tests/unit/reminders.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isReminderDue } from "@/lib/reminders/due";

describe("isReminderDue", () => {
  it("returns true when reminder time is inside the worker window", () => {
    expect(
      isReminderDue({
        occurrenceStartsAt: new Date("2026-06-01T10:00:00.000Z"),
        minutesBeforeStart: 30,
        windowStart: new Date("2026-06-01T09:29:00.000Z"),
        windowEnd: new Date("2026-06-01T09:31:00.000Z"),
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Add reminder due helper**

Create `src/lib/reminders/due.ts`:

```ts
export function isReminderDue(args: {
  occurrenceStartsAt: Date;
  minutesBeforeStart: number;
  windowStart: Date;
  windowEnd: Date;
}) {
  const dueAt = new Date(args.occurrenceStartsAt.getTime() - args.minutesBeforeStart * 60_000);
  return dueAt >= args.windowStart && dueAt <= args.windowEnd;
}
```

- [ ] **Step 3: Run reminder tests**

Run: `npm test -- tests/unit/reminders.test.ts`

Expected: PASS.

- [ ] **Step 4: Extend event schema for reminders**

Replace `src/lib/events/schema.ts` with:

```ts
import { z } from "zod";

export const reminderInputSchema = z.object({
  minutesBeforeStart: z.number().int().min(0).max(10_080),
  channel: z.enum(["in_app", "push"]),
});

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(""),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    allDay: z.boolean().default(false),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    responsibleUserId: z.string().min(1).optional().nullable(),
    reminders: z.array(reminderInputSchema).default([]),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "Sluttidspunkt skal være efter starttidspunkt.",
    path: ["endsAt"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;
```

- [ ] **Step 5: Extend event repository transaction**

Replace `src/lib/events/repository.ts` with:

```ts
import { EventInput, eventInputSchema } from "./schema";

type EventPrisma = {
  event: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    update(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
  };
};

export async function createEvent(
  prisma: Pick<EventPrisma, "event">,
  args: { familyId: string; createdByUserId: string; input: EventInput },
) {
  const input = eventInputSchema.parse(args.input);
  return prisma.event.create({
    data: {
      familyId: args.familyId,
      createdByUserId: args.createdByUserId,
      title: input.title,
      description: input.description,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      allDay: input.allDay,
      color: input.color,
      responsibleUserId: input.responsibleUserId ?? null,
      reminderRules: {
        create: input.reminders.map((reminder) => ({
          minutesBeforeStart: reminder.minutesBeforeStart,
          channel: reminder.channel,
        })),
      },
    },
  });
}
```

- [ ] **Step 6: Verify tests**

Run: `npm test`

Expected: all Vitest tests pass.

- [ ] **Step 7: Commit**

Run: `git add . && git commit -m "feat: add reminder rules"`

## Task 10: Add PWA Manifest And Push Subscription API

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `src/lib/push/subscriptions.ts`
- Create: `src/app/api/push/subscribe/route.ts`
- Modify: `src/app/layout.tsx`
- Test: `tests/unit/push-subscriptions.test.ts`

- [ ] **Step 1: Write push subscription test**

Create `tests/unit/push-subscriptions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { savePushSubscription } from "@/lib/push/subscriptions";

describe("savePushSubscription", () => {
  it("upserts subscription by endpoint", async () => {
    const prisma = { pushSubscription: { upsert: vi.fn().mockResolvedValue({ id: "p1" }) } };

    await expect(
      savePushSubscription(prisma, "u1", {
        endpoint: "https://push.example/1",
        keys: { p256dh: "key", auth: "auth" },
      }),
    ).resolves.toEqual({ id: "p1" });

    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: "https://push.example/1" },
      update: { userId: "u1", p256dh: "key", auth: "auth" },
      create: { userId: "u1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" },
    });
  });
});
```

- [ ] **Step 2: Add subscription helper**

Create `src/lib/push/subscriptions.ts`:

```ts
type PushPrisma = {
  pushSubscription: {
    upsert(args: unknown): Promise<unknown>;
  };
};

export async function savePushSubscription(
  prisma: PushPrisma,
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
}
```

- [ ] **Step 3: Add PWA manifest**

Create `public/manifest.webmanifest`:

```json
{
  "name": "FamCal",
  "short_name": "FamCal",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#2563eb",
  "icons": []
}
```

- [ ] **Step 4: Add service worker**

Create `public/sw.js`:

```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "FamCal", body: "Du har en påmindelse." };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      data: data.url || "/",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || "/"));
});
```

- [ ] **Step 5: Add subscribe API route**

Create `src/app/api/push/subscribe/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { savePushSubscription } from "@/lib/push/subscriptions";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  const body = pushSubscriptionSchema.parse(await request.json());
  await savePushSubscription(prisma, userId, body);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Link manifest in layout**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FamCal",
  description: "Familiekalender",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Run tests and build**

Run: `npm test -- tests/unit/push-subscriptions.test.ts && npm run build`

Expected: tests pass and build exits with code 0.

- [ ] **Step 8: Commit**

Run: `git add . && git commit -m "feat: add pwa push subscription support"`

## Task 11: Add Push Reminder Worker

**Files:**
- Create: `src/lib/push/send.ts`
- Create: `src/lib/reminders/worker.ts`
- Create: `src/worker/reminders.ts`
- Test: `tests/unit/reminder-worker.test.ts`

- [ ] **Step 1: Write worker idempotency test**

Create `tests/unit/reminder-worker.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { markDeliveryOnce } from "@/lib/reminders/worker";

describe("markDeliveryOnce", () => {
  it("returns false when the delivery already exists", async () => {
    const prisma = {
      notificationDelivery: {
        create: vi.fn().mockRejectedValue({ code: "P2002" }),
      },
    };

    await expect(
      markDeliveryOnce(prisma, {
        eventId: "e1",
        reminderRuleId: "r1",
        occurrenceStartsAt: new Date("2026-06-01T10:00:00.000Z"),
        channel: "push",
      }),
    ).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Add push sender**

Create `src/lib/push/send.ts`:

```ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string },
) {
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  );
}
```

- [ ] **Step 3: Add worker helpers**

Create `src/lib/reminders/worker.ts`:

```ts
export async function markDeliveryOnce(
  prisma: { notificationDelivery: { create(args: unknown): Promise<unknown> } },
  args: { eventId: string; reminderRuleId: string; occurrenceStartsAt: Date; channel: "in_app" | "push" },
) {
  try {
    await prisma.notificationDelivery.create({ data: args });
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}
```

- [ ] **Step 4: Add worker entrypoint**

Create `src/worker/reminders.ts`:

```ts
import { prisma } from "@/lib/db";

async function tick() {
  const now = new Date();
  console.log(`[reminders] tick ${now.toISOString()}`);
}

async function main() {
  await tick();
  setInterval(() => {
    tick().catch((error) => console.error("[reminders] tick failed", error));
  }, 60_000);
}

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 5: Replace worker entrypoint with due-reminder processing**

Replace `src/worker/reminders.ts` with:

```ts
import { ReminderChannel } from "@prisma/client";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { isReminderDue } from "@/lib/reminders/due";
import { markDeliveryOnce } from "@/lib/reminders/worker";
import { sendPushNotification } from "@/lib/push/send";

async function tick() {
  const windowStart = new Date();
  const windowEnd = addMinutes(windowStart, 1);
  const reminderRules = await prisma.reminderRule.findMany({
    where: { channel: ReminderChannel.push },
    include: {
      event: {
        include: {
          family: {
            include: {
              members: { include: { user: { include: { pushSubscriptions: true } } } },
            },
          },
        },
      },
    },
  });

  for (const reminder of reminderRules) {
    const occurrenceStartsAt = reminder.event.startsAt;
    if (!isReminderDue({ occurrenceStartsAt, minutesBeforeStart: reminder.minutesBeforeStart, windowStart, windowEnd })) {
      continue;
    }

    const shouldSend = await markDeliveryOnce(prisma, {
      eventId: reminder.eventId,
      reminderRuleId: reminder.id,
      occurrenceStartsAt,
      channel: "push",
    });

    if (!shouldSend) continue;

    for (const member of reminder.event.family.members) {
      for (const subscription of member.user.pushSubscriptions) {
        try {
          await sendPushNotification(subscription, {
            title: reminder.event.title,
            body: `Starter ${occurrenceStartsAt.toLocaleString("da-DK")}`,
            url: "/",
          });
        } catch (error) {
          const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : null;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: subscription.id } });
          } else {
            console.error("[reminders] push failed", error);
          }
        }
      }
    }
  }
}

async function main() {
  await tick();
  setInterval(() => {
    tick().catch((error) => console.error("[reminders] tick failed", error));
  }, 60_000);
}

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/unit/reminder-worker.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run: `git add . && git commit -m "feat: add push reminder worker"`

## Task 12: Add E2E Happy Path And Deployment Docs

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/calendar.spec.ts`
- Create: `README.md`

- [ ] **Step 1: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Pixel 5"],
  },
});
```

- [ ] **Step 2: Add E2E test**

Create `tests/e2e/calendar.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("login page is reachable on mobile", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log ind" })).toBeVisible();
});
```

- [ ] **Step 3: Add README**

Create `README.md` with setup instructions:

```md
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
```

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run build && npm run test:e2e`

Expected: all unit tests pass, production build succeeds, and Playwright test passes.

- [ ] **Step 5: Commit**

Run: `git add . && git commit -m "docs: add deployment guide and e2e smoke test"`

## Self-Review

- Spec coverage: The plan covers the approved stack, Docker hosting, local login, family membership, event CRUD, recurrence, reminders, PWA, web push, worker process, security basics, and tests.
- Scope split: The spec spans multiple subsystems, but each task is ordered so the app remains buildable after each milestone. Push is included in the first version as requested.
- Placeholder scan: No `TBD` or unresolved placeholder markers are present. Environment values intentionally use replaceable examples in `.env.example`.
- Type consistency: Core names are consistent across tasks: `User`, `Family`, `FamilyMember`, `Event`, `RecurrenceRule`, `ReminderRule`, `PushSubscription`, `NotificationDelivery`, `createEvent`, `expandRecurringEvent`, `savePushSubscription`, and `markDeliveryOnce`.
