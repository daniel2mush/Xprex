-- Add an optional public handle for @username profile URLs.
ALTER TABLE "User"
ADD COLUMN "handle" TEXT;

CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
CREATE INDEX "User_handle_idx" ON "User"("handle");
