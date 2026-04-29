/*
  Warnings:

  - You are about to drop the column `department_name` on the `direct_work_orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "direct_work_order_materials" ADD COLUMN     "department_name" TEXT;

-- AlterTable
ALTER TABLE "direct_work_orders" DROP COLUMN "department_name";
