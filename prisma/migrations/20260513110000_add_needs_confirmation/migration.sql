-- Needs-confirmation fields on Event
ALTER TABLE "Event" ADD COLUMN "needsConfirmation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "confirmWithUserId" TEXT;
ALTER TABLE "Event" ADD CONSTRAINT "Event_confirmWithUserId_fkey"
  FOREIGN KEY ("confirmWithUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
