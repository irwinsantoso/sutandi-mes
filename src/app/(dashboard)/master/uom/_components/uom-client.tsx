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
import { Loader2 } from "lucide-react";
import { UomRow, getUomColumns } from "./uom-columns";
import { createUom, updateUom, deleteUom } from "../_actions/uom-actions";

interface UomClientProps {
  data: UomRow[];
}

export function UomClient({ data }: UomClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUom, setEditingUom] = useState<UomRow | null>(null);
  const [deletingUom, setDeletingUom] = useState<UomRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  function openCreateDialog() {
    setEditingUom(null);
    setCode("");
    setName("");
    setDialogOpen(true);
  }

  function openEditDialog(uom: UomRow) {
    setEditingUom(uom);
    setCode(uom.code);
    setName(uom.name);
    setDialogOpen(true);
  }

  function openDeleteDialog(uom: UomRow) {
    setDeletingUom(uom);
    setDeleteDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const payload = { code, name };

      const result = editingUom
        ? await updateUom(editingUom.id, payload)
        : await createUom(payload);

      if (result.success) {
        toast.success(
          editingUom
            ? "UOM updated successfully."
            : "UOM created successfully."
        );
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deletingUom) return;

    startTransition(async () => {
      const result = await deleteUom(deletingUom.id);

      if (result.success) {
        toast.success("UOM deleted successfully.");
        setDeleteDialogOpen(false);
        setDeletingUom(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = getUomColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>Add UOM</Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search by name..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingUom ? "Edit UOM" : "Add UOM"}
              </DialogTitle>
              <DialogDescription>
                {editingUom
                  ? "Update the unit of measure details below."
                  : "Fill in the details to create a new unit of measure."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="uom-code">Code</Label>
                <Input
                  id="uom-code"
                  placeholder="e.g. KG"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uom-name">Name</Label>
                <Input
                  id="uom-name"
                  placeholder="e.g. Kilogram"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {editingUom ? "Save Changes" : "Create UOM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UOM</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete UOM{" "}
              <strong>{deletingUom?.code}</strong>? This action cannot be
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
