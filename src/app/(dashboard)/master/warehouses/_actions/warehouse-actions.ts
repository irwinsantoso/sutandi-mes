"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const warehouseSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be 20 characters or less"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  address: z.string().max(500, "Address must be 500 characters or less").optional().or(z.literal("")),
});

const locationSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be 20 characters or less"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  zone: z.string().max(50, "Zone must be 50 characters or less").optional().or(z.literal("")),
});

export async function createWarehouse(data: {
  code: string;
  name: string;
  address?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const validated = warehouseSchema.parse(data);

    const existing = await prisma.warehouse.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return { success: false, error: "A warehouse with this code already exists." };
    }

    await prisma.warehouse.create({
      data: {
        code: validated.code,
        name: validated.name,
        address: validated.address || null,
      },
    });

    revalidatePath("/master/warehouses");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Failed to create warehouse." };
  }
}

export async function updateWarehouse(
  id: string,
  data: { code: string; name: string; address?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const validated = warehouseSchema.parse(data);

    const existing = await prisma.warehouse.findFirst({
      where: { code: validated.code, NOT: { id } },
    });

    if (existing) {
      return { success: false, error: "A warehouse with this code already exists." };
    }

    await prisma.warehouse.update({
      where: { id },
      data: {
        code: validated.code,
        name: validated.name,
        address: validated.address || null,
      },
    });

    revalidatePath("/master/warehouses");
    revalidatePath(`/master/warehouses/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Failed to update warehouse." };
  }
}

export async function deleteWarehouse(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { locations: true } } },
    });

    if (!warehouse) {
      return { success: false, error: "Warehouse not found." };
    }

    if (warehouse._count.locations > 0) {
      return {
        success: false,
        error: "Cannot delete warehouse with existing locations. Remove all locations first.",
      };
    }

    await prisma.warehouse.delete({ where: { id } });

    revalidatePath("/master/warehouses");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete warehouse." };
  }
}

export async function createLocation(data: {
  code: string;
  name: string;
  warehouseId: string;
  zone?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const validated = locationSchema.parse(data);

    const existing = await prisma.location.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return { success: false, error: "A location with this code already exists." };
    }

    await prisma.location.create({
      data: {
        code: validated.code,
        name: validated.name,
        warehouseId: validated.warehouseId,
        zone: validated.zone || null,
      },
    });

    revalidatePath("/master/warehouses");
    revalidatePath(`/master/warehouses/${validated.warehouseId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Failed to create location." };
  }
}

export async function updateLocation(
  id: string,
  data: { code: string; name: string; zone?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const validated = z
      .object({
        code: z.string().min(1, "Code is required").max(20),
        name: z.string().min(1, "Name is required").max(100),
        zone: z.string().max(50).optional().or(z.literal("")),
      })
      .parse(data);

    const existing = await prisma.location.findFirst({
      where: { code: validated.code, NOT: { id } },
    });

    if (existing) {
      return { success: false, error: "A location with this code already exists." };
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        code: validated.code,
        name: validated.name,
        zone: validated.zone || null,
      },
    });

    revalidatePath("/master/warehouses");
    revalidatePath(`/master/warehouses/${location.warehouseId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Failed to update location." };
  }
}

export async function deleteLocation(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const location = await prisma.location.findUnique({ where: { id } });

    if (!location) {
      return { success: false, error: "Location not found." };
    }

    await prisma.location.delete({ where: { id } });

    revalidatePath("/master/warehouses");
    revalidatePath(`/master/warehouses/${location.warehouseId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete location." };
  }
}
