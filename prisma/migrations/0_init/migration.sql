-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'FINALIZED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "adminKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organizerName" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'OPEN',
    "finalDateOptionId" TEXT,
    "finalPlaceOptionId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceOption" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateVote" (
    "participantId" TEXT NOT NULL,
    "dateOptionId" TEXT NOT NULL,

    CONSTRAINT "DateVote_pkey" PRIMARY KEY ("participantId","dateOptionId")
);

-- CreateTable
CREATE TABLE "PlaceVote" (
    "participantId" TEXT NOT NULL,
    "placeOptionId" TEXT NOT NULL,

    CONSTRAINT "PlaceVote_pkey" PRIMARY KEY ("participantId","placeOptionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_publicId_key" ON "Event"("publicId");

-- CreateIndex
CREATE INDEX "DateOption_eventId_idx" ON "DateOption"("eventId");

-- CreateIndex
CREATE INDEX "PlaceOption_eventId_idx" ON "PlaceOption"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_nameKey_key" ON "Participant"("eventId", "nameKey");

-- AddForeignKey
ALTER TABLE "DateOption" ADD CONSTRAINT "DateOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOption" ADD CONSTRAINT "PlaceOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateVote" ADD CONSTRAINT "DateVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DateVote" ADD CONSTRAINT "DateVote_dateOptionId_fkey" FOREIGN KEY ("dateOptionId") REFERENCES "DateOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceVote" ADD CONSTRAINT "PlaceVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceVote" ADD CONSTRAINT "PlaceVote_placeOptionId_fkey" FOREIGN KEY ("placeOptionId") REFERENCES "PlaceOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
