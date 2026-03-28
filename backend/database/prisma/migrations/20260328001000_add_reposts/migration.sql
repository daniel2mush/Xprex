CREATE TABLE "Repost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "Repost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Repost_userId_postId_key" ON "Repost"("userId", "postId");
CREATE INDEX "Repost_userId_idx" ON "Repost"("userId");
CREATE INDEX "Repost_postId_idx" ON "Repost"("postId");
CREATE INDEX "Bookmark_postId_idx" ON "Bookmark"("postId");

ALTER TABLE "Repost"
ADD CONSTRAINT "Repost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Repost"
ADD CONSTRAINT "Repost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
