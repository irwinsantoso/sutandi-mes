"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { createUomConversion, deleteUomConversion } from "../../_actions/item-actions";
import { toast } from "sonner";

interface UomConversion {
  id: string;
  fromUomId: string;
  fromUomName: string;
  fromUomCode: string;
  toUomId: string;
  toUomName: string;
  toUomCode: string;
  conversionFactor: number;
}

interface UomConversionClientProps {
  itemId: string;
  conversions: UomConversion[];
  uoms: { id: string; code: string; name: string }[];
}

export function UomConversionClient({
  itemId,
  conversions,
  uoms,
}: UomConversionClientProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fromUomId, setFromUomId] = useState("");
  const [toUomId, setToUomId] = useState("");
  const [conversionFactor, setConversionFactor] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setFromUomId("");
    setToUomId("");
    setConversionFactor("");
  };

  const handleAdd = () => {
    if (!fromUomId || !toUomId || !conversionFactor) {
      toast.error("All fields are required.");
      return;
    }

    const factor = parseFloat(conversionFactor);
    if (isNaN(factor) || factor <= 0) {
      toast.error("Conversion factor must be a positive number.");
      return;
    }

    startTransition(async () => {
      const result = await createUomConversion({
        itemId,
        fromUomId,
        toUomId,
        conversionFactor: factor,
      });

      if (result.success) {
        toast.success("UOM conversion added.");
        setIsAddOpen(false);
        resetForm();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteUomConversion(deleteId);
      if (result.success) {
        toast.success("UOM conversion deleted.");
      } else {
        toast.error(result.error);
      }
      setDeleteId(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4" />
            Add Conversion
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add UOM Conversion</DialogTitle>
              <DialogDescription>
                Define a conversion factor between two units of measure for this item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>From UOM</Label>
                <Select value={fromUomId} onValueChange={(val) => setFromUomId(val ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select from UOM">
                      {(value: string | null) => {
                        if (!value) return "Select from UOM";
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
              </div>

              <div className="space-y-2">
                <Label>To UOM</Label>
                <Select value={toUomId} onValueChange={(val) => setToUomId(val ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select to UOM">
                      {(value: string | null) => {
                        if (!value) return "Select to UOM";
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversionFactor">Conversion Factor</Label>
                <Input
                  id="conversionFactor"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g., 12"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 [From UOM] = [Factor] [To UOM]
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending ? "Adding..." : "Add Conversion"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {conversions.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
          <p className="text-sm text-muted-foreground">
            No UOM conversions defined yet.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From UOM</TableHead>
                <TableHead>To UOM</TableHead>
                <TableHead className="text-right">Factor</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversions.map((conversion) => (
                <TableRow key={conversion.id}>
                  <TableCell>
                    {conversion.fromUomName} ({conversion.fromUomCode})
                  </TableCell>
                  <TableCell>
                    {conversion.toUomName} ({conversion.toUomCode})
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {conversion.conversionFactor}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(conversion.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete conversion</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UOM Conversion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this UOM conversion? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
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
    </div>
  );
}
