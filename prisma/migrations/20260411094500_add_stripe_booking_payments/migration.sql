-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'TRANSFERRED', 'REFUNDED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "TutorProfile" ADD COLUMN "stripeConnectedAccountId" TEXT;

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "commissionAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tutorAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "stripeChargeId" TEXT,
ADD COLUMN "stripeTransferId" TEXT,
ADD COLUMN "stripeRefundId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripePaymentIntentId_key" ON "Booking"("stripePaymentIntentId");
