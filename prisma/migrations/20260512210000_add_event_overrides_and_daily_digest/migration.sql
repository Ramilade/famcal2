-- EventOverride: per-occurrence overrides for recurring events
CREATE TABLE "EventOverride" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "occurrenceDate" TIMESTAMP(3) NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "allDay" BOOLEAN,
  "color" TEXT,
  "responsibleUserId" TEXT,
  "isCancelled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventOverride_eventId_occurrenceDate_key" ON "EventOverride"("eventId", "occurrenceDate");
ALTER TABLE "EventOverride" ADD CONSTRAINT "EventOverride_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DailyDigestDelivery: track per-user daily digest sends
CREATE TABLE "DailyDigestDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyDigestDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyDigestDelivery_userId_date_key" ON "DailyDigestDelivery"("userId", "date");
ALTER TABLE "DailyDigestDelivery" ADD CONSTRAINT "DailyDigestDelivery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
