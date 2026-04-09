"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  WarehouseRow,
  getWarehouseColumns,
} from "./warehouse-columns";
import {
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../_actions/warehouse-actions";

interface WarehouseClientProps {
  data: WarehouseRow[];
}

export function WarehouseClient({ data }: WarehouseClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRow | null>(
    null
  );
  const [deletingWarehouse, setDeletingWarehouse] =
    useState<WarehouseRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  function openCreateDialog() {
    setEditingWarehouse(null);
    setCode("");
    setName("");
    setAddress("");
    setDialogOpen(true);
  }

  function openEditDialog(warehouse: WarehouseRow) {
    setEditingWarehouse(warehouse);
    setCode(warehouse.code);
    setName(warehouse.name);
    setAddress(warehouse.address || "");
    setDialogOpen(true);
  }

  function openDeleteDialog(warehouse: WarehouseRow) {
    setDeletingWarehouse(warehouse);
    setDeleteDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const payload = { code, name, address };

      const result = editingWarehouse
        ? await updateWarehouse(editingWarehouse.id, payload)
        : await createWarehouse(payload);

      if (result.success) {
        toast.success(
          editingWarehouse
            ? "Warehouse updated successfully."
            : "Warehouse created successfully."
        );
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deletingWarehouse) return;

    startTransition(async () => {
      const result = await deleteWarehouse(deletingWarehouse.id);

      if (result.success) {
        toast.success("Warehouse deleted successfully.");
        setDeleteDialogOpen(false);
        setDeletingWarehouse(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = getWarehouseColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>Add Warehouse</Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="code"
        searchPlaceholder="Search by code..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
              </DialogTitle>
              <DialogDescription>
                {editingWarehouse
                  ? "Update the warehouse details below."
                  : "Fill in the details to create a new warehouse."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="warehouse-code">Code</Label>
                <Input
                  id="warehouse-code"
                  placeholder="e.g. WH-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="warehouse-name">Name</Label>
                <Input
                  id="warehouse-name"
                  placeholder="e.g. Main Warehouse"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="warehouse-address">Address</Label>
                <Textarea
                  id="warehouse-address"
                  placeholder="Enter warehouse address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {editingWarehouse ? "Save Changes" : "Create Warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete warehouse{" "}
              <strong>{deletingWarehouse?.code}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
