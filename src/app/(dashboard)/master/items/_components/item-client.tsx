"use client";

import { useState, useTransition } from "react";
import { DataTable } from "@/components/shared/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getItemColumns, type ItemColumn } from "./item-columns";
import { deleteItem } from "../_actions/item-actions";
import { toast } from "sonner";

interface ItemClientProps {
  items: ItemColumn[];
}

export function ItemClient({ items }: ItemClientProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = getItemColumns((id) => setDeleteId(id));

  const handleDelete = () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteItem(deleteId);
      if (result.success) {
        toast.success("Item deleted successfully.");
      } else {
        toast.error(result.error);
      }
      setDeleteId(null);
    });
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        searchKey="name"
        searchPlaceholder="Search items by name..."
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item, inventory data, 
              and all its UOM conversions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
