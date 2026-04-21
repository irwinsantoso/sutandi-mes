-- CreateEnum
CREATE TYPE "DirectWorkOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "direct_work_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "transfer_from" TEXT NOT NULL,
    "transfer_to" TEXT NOT NULL,
    "transfer_to_address" TEXT,
    "prepared_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "received_by" TEXT,
    "description" TEXT,
    "output_item_id" TEXT,
    "output_item_name" TEXT NOT NULL,
    "output_item_code" TEXT,
    "output_category_id" TEXT,
    "output_qty" DECIMAL(18,4) NOT NULL,
    "output_uom_id" TEXT NOT NULL,
    "output_location_id" TEXT NOT NULL,
    "status" "DirectWorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_work_order_materials" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "uom_id" TEXT NOT NULL,
    "quantity_in_base_uom" DECIMAL(18,4) NOT NULL,
    "batch_lot" TEXT,
    "location_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_work_order_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "direct_work_orders_order_number_key" ON "direct_work_orders"("order_number");

-- AddForeignKey
ALTER TABLE "direct_work_orders" ADD CONSTRAINT "direct_work_orders_output_item_id_fkey" FOREIGN KEY ("output_item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_orders" ADD CONSTRAINT "direct_work_orders_output_uom_id_fkey" FOREIGN KEY ("output_uom_id") REFERENCES "uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_orders" ADD CONSTRAINT "direct_work_orders_output_location_id_fkey" FOREIGN KEY ("output_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_orders" ADD CONSTRAINT "direct_work_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_order_materials" ADD CONSTRAINT "direct_work_order_materials_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "direct_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_order_materials" ADD CONSTRAINT "direct_work_order_materials_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_order_materials" ADD CONSTRAINT "direct_work_order_materials_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_work_order_materials" ADD CONSTRAINT "direct_work_order_materials_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
