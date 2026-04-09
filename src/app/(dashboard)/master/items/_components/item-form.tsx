"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createItem, updateItem } from "../_actions/item-actions";
import { toast } from "sonner";
import Link from "next/link";

const itemFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be 50 characters or less"),
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().optional(),
  category: z.enum(["RAW_MATERIAL", "WIP", "FINISHED_GOOD", "PACKAGING", "CONSUMABLE"], {
    message: "Category is required",
  }),
  baseUomId: z.string().min(1, "Base UOM is required"),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

const categoryOptions = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "WIP", label: "WIP" },
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "CONSUMABLE", label: "Consumable" },
];

interface ItemFormProps {
  uoms: { id: string; code: string; name: string }[];
  item?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: "RAW_MATERIAL" | "WIP" | "FINISHED_GOOD" | "PACKAGING" | "CONSUMABLE";
    baseUomId: string;
  };
}

export function ItemForm({ uoms, item }: ItemFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!item;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      code: item?.code ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
      category: item?.category ?? undefined,
      baseUomId: item?.baseUomId ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedCategory = watch("category");
  const selectedBaseUomId = watch("baseUomId");

  const onSubmit = (values: ItemFormValues) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateItem(item.id, values)
        : await createItem(values);

      if (!result.success) {
        toast.error(result.error);
      }
      // On success, the server action redirects
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Item" : "Create New Item"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g., RM-001"
                {...register("code")}
                aria-invalid={!!errors.code}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Steel Rod 10mm"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional item description..."
              {...register("description")}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategory ?? ""}
                onValueChange={(val) => val && setValue("category", val as ItemFormValues["category"], { shouldValidate: true })}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Select category">
                    {(value: string | null) => {
                      if (!value) return "Select category";
                      const opt = categoryOptions.find((o) => o.value === value);
                      return opt ? opt.label : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Base UOM</Label>
              <Select
                value={selectedBaseUomId}
                onValueChange={(val) => val && setValue("baseUomId", val, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.baseUomId}>
                  <SelectValue placeholder="Select UOM">
                    {(value: string | null) => {
                      if (!value) return "Select UOM";
                      const uom = uoms.find((u) => u.id === value);
                      return uom ? `${uom.name} (${uom.code})` : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((uom) => (
                    <SelectItem key={uom.id} value={uom.id}>
                      {uom.name} ({uom.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.baseUomId && (
                <p className="text-sm text-destructive">{errors.baseUomId.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Item"
                  : "Create Item"}
            </Button>
            <Button variant="outline" type="button" render={<Link href="/master/items" />}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
