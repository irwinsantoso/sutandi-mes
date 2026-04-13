-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "production_order_material_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_reservations_inventory_id_idx" ON "inventory_reservations"("inventory_id");

-- CreateIndex
CREATE INDEX "inventory_reservations_production_order_material_id_idx" ON "inventory_reservations"("production_order_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservations_inventory_id_production_order_materi_key" ON "inventory_reservations"("inventory_id", "production_order_material_id");

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_production_order_material_id_fkey" FOREIGN KEY ("production_order_material_id") REFERENCES "production_order_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
