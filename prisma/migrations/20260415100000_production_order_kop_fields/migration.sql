-- Add KOP-form header fields to production orders.
ALTER TABLE "production_orders" ADD COLUMN "jenis_warna" TEXT;
ALTER TABLE "production_orders" ADD COLUMN "type_variant" TEXT;
ALTER TABLE "production_orders" ADD COLUMN "tangga" TEXT;
ALTER TABLE "production_orders" ADD COLUMN "department_name" TEXT;
