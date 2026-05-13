-- AlterTable: add calendarToken, populate existing rows, then enforce NOT NULL
ALTER TABLE "Family" ADD COLUMN "calendarToken" TEXT;
UPDATE "Family" SET "calendarToken" = gen_random_uuid()::TEXT WHERE "calendarToken" IS NULL;
ALTER TABLE "Family" ALTER COLUMN "calendarToken" SET NOT NULL;
CREATE UNIQUE INDEX "Family_calendarToken_key" ON "Family"("calendarToken");
