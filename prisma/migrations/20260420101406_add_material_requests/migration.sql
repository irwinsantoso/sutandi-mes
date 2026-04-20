-- CreateTable
CREATE TABLE "material_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "request_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_request_items" (
    "id" TEXT NOT NULL,
    "material_request_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "qty_required" DECIMAL(18,4) NOT NULL,
    "qty_buy" DECIMAL(18,4),
    "qty_stock" DECIMAL(18,4),
    "uom" TEXT NOT NULL,
    "department_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "material_requests_request_number_key" ON "material_requests"("request_number");

-- AddForeignKey
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_material_request_id_fkey" FOREIGN KEY ("material_request_id") REFERENCES "material_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
