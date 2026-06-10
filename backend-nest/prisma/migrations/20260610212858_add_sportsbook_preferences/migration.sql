-- CreateTable
CREATE TABLE "user_sportsbook_preferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sportsbooks" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sportsbook_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sportsbook_preferences_userId_key" ON "user_sportsbook_preferences"("userId");

-- AddForeignKey
ALTER TABLE "user_sportsbook_preferences" ADD CONSTRAINT "user_sportsbook_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
