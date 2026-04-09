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
import { LocationRow, getLocationColumns } from "./location-columns";
import {
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../_actions/warehouse-actions";

interface LocationClientProps {
  warehouseId: string;
  data: LocationRow[];
}

export function LocationClient({ warehouseId, data }: LocationClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationRow | null>(
    null
  );
  const [deletingLocation, setDeletingLocation] = useState<LocationRow | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");

  function openCreateDialog() {
    setEditingLocation(null);
    setCode("");
    setName("");
    setZone("");
    setDialogOpen(true);
  }

  function openEditDialog(location: LocationRow) {
    setEditingLocation(location);
    setCode(location.code);
    setName(location.name);
    setZone(location.zone || "");
    setDialogOpen(true);
  }

  function openDeleteDialog(location: LocationRow) {
    setDeletingLocation(location);
    setDeleteDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = editingLocation
        ? await updateLocation(editingLocation.id, { code, name, zone })
        : await createLocation({ code, name, warehouseId, zone });

      if (result.success) {
        toast.success(
          editingLocation
            ? "Location updated successfully."
            : "Location created successfully."
        );
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deletingLocation) return;

    startTransition(async () => {
      const result = await deleteLocation(deletingLocation.id);

      if (result.success) {
        toast.success("Location deleted successfully.");
        setDeleteDialogOpen(false);
        setDeletingLocation(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = getLocationColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
  });

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>Add Location</Button>
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
                {editingLocation ? "Edit Location" : "Add Location"}
              </DialogTitle>
              <DialogDescription>
                {editingLocation
                  ? "Update the location details below."
                  : "Fill in the details to create a new location."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="location-code">Code</Label>
                <Input
                  id="location-code"
                  placeholder="e.g. LOC-A01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  placeholder="e.g. Rack A - Shelf 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location-zone">Zone</Label>
                <Input
                  id="location-zone"
                  placeholder="e.g. Zone A (optional)"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {editingLocation ? "Save Changes" : "Create Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete location{" "}
              <strong>{deletingLocation?.code}</strong>? This action cannot be
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
