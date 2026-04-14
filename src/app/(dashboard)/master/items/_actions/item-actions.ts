"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const itemSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be 50 characters or less"),
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  baseUomId: z.string().min(1, "Base UOM is required"),
});

const uomConversionSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  fromUomId: z.string().min(1, "From UOM is required"),
  toUomId: z.string().min(1, "To UOM is required"),
  conversionFactor: z.number().positive("Conversion factor must be positive"),
});

export async function createItem(data: {
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  baseUomId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const parsed = itemSchema.parse(data);

    const existing = await prisma.item.findUnique({
      where: { code: parsed.code },
    });

    if (existing) {
      return { success: false, error: "An item with this code already exists." };
    }

    await prisma.item.create({
      data: {
        code: parsed.code,
        name: parsed.name,
        description: parsed.description || null,
        categoryId: parsed.categoryId,
        baseUomId: parsed.baseUomId,
      },
    });

    revalidatePath("/master/items");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: "Failed to create item." };
  }

  redirect("/master/items");
}

export async function updateItem(
  id: string,
  data: {
    code: string;
    name: string;
    description?: string;
    categoryId: string;
    baseUomId: string;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const itemId = id;

  try {
    const parsed = itemSchema.parse(data);

    const existing = await prisma.item.findUnique({
      where: { code: parsed.code },
    });

    if (existing && existing.id !== id) {
      return { success: false, error: "An item with this code already exists." };
    }

    await prisma.item.update({
      where: { id },
      data: {
        code: parsed.code,
        name: parsed.name,
        description: parsed.description || null,
        categoryId: parsed.categoryId,
        baseUomId: parsed.baseUomId,
      },
    });

    revalidatePath("/master/items");
    revalidatePath(`/master/items/${id}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: "Failed to update item." };
  }

  redirect(`/master/items/${itemId}`);
}

export async function deleteItem(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.item.delete({
      where: { id },
    });

    revalidatePath("/master/items");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete item." };
  }
}

export async function createUomConversion(data: {
  itemId: string;
  fromUomId: string;
  toUomId: string;
  conversionFactor: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const parsed = uomConversionSchema.parse(data);

    if (parsed.fromUomId === parsed.toUomId) {
      return { success: false, error: "From UOM and To UOM must be different." };
    }

    const existing = await prisma.uomConversion.findUnique({
      where: {
        itemId_fromUomId_toUomId: {
          itemId: parsed.itemId,
          fromUomId: parsed.fromUomId,
          toUomId: parsed.toUomId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "This UOM conversion already exists for this item." };
    }

    await prisma.uomConversion.create({
      data: {
        itemId: parsed.itemId,
        fromUomId: parsed.fromUomId,
        toUomId: parsed.toUomId,
        conversionFactor: parsed.conversionFactor,
      },
    });

    revalidatePath(`/master/items/${parsed.itemId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: "Failed to create UOM conversion." };
  }
}

export async function deleteUomConversion(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const conversion = await prisma.uomConversion.findUnique({
      where: { id },
    });

    if (!conversion) {
      return { success: false, error: "UOM conversion not found." };
    }

    await prisma.uomConversion.delete({
      where: { id },
    });

    revalidatePath(`/master/items/${conversion.itemId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete UOM conversion." };
  }
}
