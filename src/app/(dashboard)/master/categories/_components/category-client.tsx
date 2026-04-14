"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { DataTable } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { CategoryRow, getCategoryColumns } from "./category-columns"
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../_actions/category-actions"

interface CategoryClientProps {
  data: CategoryRow[]
}

export function CategoryClient({ data }: CategoryClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  function openCreateDialog() {
    setEditing(null)
    setCode("")
    setName("")
    setDialogOpen(true)
  }

  function openEditDialog(category: CategoryRow) {
    setEditing(category)
    setCode(category.code)
    setName(category.name)
    setDialogOpen(true)
  }

  function openDeleteDialog(category: CategoryRow) {
    setDeleting(category)
    setDeleteDialogOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      const payload = { code, name }
      const result = editing
        ? await updateCategory(editing.id, payload)
        : await createCategory(payload)

      if (result.success) {
        toast.success(
          editing ? "Category updated successfully." : "Category created successfully."
        )
        setDialogOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete() {
    if (!deleting) return

    startTransition(async () => {
      const result = await deleteCategory(deleting.id)

      if (result.success) {
        toast.success("Category deleted successfully.")
        setDeleteDialogOpen(false)
        setDeleting(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  const columns = getCategoryColumns({
    onEdit: openEditDialog,
    onDelete: openDeleteDialog,
  })

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>Add Category</Button>
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
                {editing ? "Edit Category" : "Add Category"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the category details below."
                  : "Fill in the details to create a new category."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="cat-code">Code</Label>
                <Input
                  id="cat-code"
                  placeholder="e.g. RAW_MATERIAL"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={50}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Raw Material"
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
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete category{" "}
              <strong>{deleting?.code}</strong>? This action cannot be undone.
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
  )
}
