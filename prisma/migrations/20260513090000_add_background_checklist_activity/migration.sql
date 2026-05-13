-- Family background image
ALTER TABLE "Family" ADD COLUMN "backgroundUrl" TEXT;

-- Checklist items on events
CREATE TABLE "ChecklistItem" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "checked" BOOLEAN NOT NULL DEFAULT false,
  "position" INT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChecklistItem_eventId_idx" ON "ChecklistItem"("eventId");
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Activity log
CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "entityName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityLog_familyId_createdAt_idx" ON "ActivityLog"("familyId", "createdAt" DESC);
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
