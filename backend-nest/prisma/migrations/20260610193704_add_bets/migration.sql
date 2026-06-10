-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'PUSH', 'VOID');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('STRAIGHT', 'PARLAY');

-- CreateTable
CREATE TABLE "bets" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "BetType" NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "sportsbook" TEXT,
    "stake" DECIMAL(10,2) NOT NULL,
    "odds" INTEGER NOT NULL,
    "payout" DECIMAL(10,2) NOT NULL,
    "profit" DECIMAL(10,2),
    "notes" TEXT,
    "screenshotUrl" TEXT,
    "betDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bet_legs" (
    "id" SERIAL NOT NULL,
    "betId" INTEGER NOT NULL,
    "sport" TEXT,
    "league" TEXT,
    "game" TEXT,
    "betType" TEXT,
    "pick" TEXT,
    "line" TEXT,
    "odds" INTEGER,
    "result" "BetStatus",

    CONSTRAINT "bet_legs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bets_userId_betDate_idx" ON "bets"("userId", "betDate");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_legs" ADD CONSTRAINT "bet_legs_betId_fkey" FOREIGN KEY ("betId") REFERENCES "bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
