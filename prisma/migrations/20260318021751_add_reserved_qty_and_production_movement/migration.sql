-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'PRODUCTION';

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "reserved_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0;
