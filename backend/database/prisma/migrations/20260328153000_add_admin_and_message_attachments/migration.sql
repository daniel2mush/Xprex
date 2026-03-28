ALTER TABLE "User"
ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "isAdmin" = true
WHERE "id" = (
    SELECT "id"
    FROM "User"
    ORDER BY "createdAt" ASC
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1
    FROM "User"
    WHERE "isAdmin" = true
);

ALTER TABLE "Media"
ADD COLUMN "messageId" TEXT;

CREATE INDEX "Media_messageId_idx" ON "Media"("messageId");

ALTER TABLE "Media"
ADD CONSTRAINT "Media_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
