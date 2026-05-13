-- AlterEnum
ALTER TYPE "RecurrenceFrequency" ADD VALUE 'yearly';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isBirthday" BOOLEAN NOT NULL DEFAULT false;
