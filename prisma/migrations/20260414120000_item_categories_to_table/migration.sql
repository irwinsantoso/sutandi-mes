-- Convert ItemCategory from an enum column to a separate table with FK.

-- 1. Create the table.
CREATE TABLE "item_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_categories_code_key" ON "item_categories"("code");

-- 2. Seed the five original enum values so existing items can be backfilled.
INSERT INTO "item_categories" ("id", "code", "name", "created_at", "updated_at") VALUES
  ('cat_raw_material',  'RAW_MATERIAL',  'Raw Material',  NOW(), NOW()),
  ('cat_wip',           'WIP',           'WIP',           NOW(), NOW()),
  ('cat_finished_good', 'FINISHED_GOOD', 'Finished Good', NOW(), NOW()),
  ('cat_packaging',     'PACKAGING',     'Packaging',     NOW(), NOW()),
  ('cat_consumable',    'CONSUMABLE',    'Consumable',    NOW(), NOW());

-- 3. Add the new FK column, nullable for the backfill.
ALTER TABLE "items" ADD COLUMN "category_id" TEXT;

-- 4. Backfill from the old enum column.
UPDATE "items" SET "category_id" = 'cat_raw_material'  WHERE "category" = 'RAW_MATERIAL';
UPDATE "items" SET "category_id" = 'cat_wip'           WHERE "category" = 'WIP';
UPDATE "items" SET "category_id" = 'cat_finished_good' WHERE "category" = 'FINISHED_GOOD';
UPDATE "items" SET "category_id" = 'cat_packaging'     WHERE "category" = 'PACKAGING';
UPDATE "items" SET "category_id" = 'cat_consumable'    WHERE "category" = 'CONSUMABLE';

-- 5. Tighten: require the FK, add the constraint, drop the old column and enum.
ALTER TABLE "items" ALTER COLUMN "category_id" SET NOT NULL;

ALTER TABLE "items"
  ADD CONSTRAINT "items_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "item_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "items" DROP COLUMN "category";

DROP TYPE "ItemCategory";
