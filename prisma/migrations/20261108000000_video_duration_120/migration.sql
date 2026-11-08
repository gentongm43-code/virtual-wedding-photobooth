ALTER TABLE "Event" ALTER COLUMN "videoDuration" SET DEFAULT 120;
UPDATE "Event" SET "videoDuration" = 120 WHERE "videoDuration" < 120;
