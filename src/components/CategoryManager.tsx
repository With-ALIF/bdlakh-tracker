import { useState, useMemo } from "react";
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "income" | "expense";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const { categories, addCategory, updateCategory, deleteCategory, toggleCategory } = useFinance();

  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState<"income" | "expense" | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const formVisible = editingId !== null || adding !== null;

  const filtered = useMemo(() => {
    let list = categories;
    if (tab === "income") list = list.filter((c) => c.is_income);
    if (tab === "expense") list = list.filter((c) => !c.is_income);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.is_income !== b.is_income) return a.is_income ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [categories, tab, search]);

  const stats = useMemo(() => {
    const income = categories.filter((c) => c.is_income && c.is_enabled);
    const expense = categories.filter((c) => !c.is_income && c.is_enabled);
    return {
      total: categories.length,
      income: income.length,
      expense: expense.length,
      enabled: categories.filter((c) => c.is_enabled).length,
    };
  }, [categories]);

  const openNew = (type: "income" | "expense") => {
    setEditingId(null);
    setAdding(type);
    setFormName("");
    setFormType(type);
  };

  const openEdit = (cat: { id: string; name: string; is_income: boolean }) => {
    setAdding(null);
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormType(cat.is_income ? "income" : "expense");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      toast.error("Category name is required");
      return;
    }

    const duplicate = categories.find(
      (c) =>
        c.name.toLowerCase() === trimmed.toLowerCase() &&
        c.is_income === (formType === "income") &&
        c.id !== editingId,
    );
    if (duplicate) {
      toast.error("Category already exists");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, trimmed);
        toast.success("Category updated");
      } else {
        await addCategory(trimmed, formType === "income");
        toast.success("Category added");
      }
      setEditingId(null);
      setAdding(null);
      setFormName("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCategory(pendingDelete.id);
      toast.success("Category deleted");
      setPendingDelete(null);
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleCategory(id, enabled);
  };

  const tabs = [
    { key: "all" as const, label: "All", count: stats.enabled },
    { key: "income" as const, label: "Income", count: stats.income },
    { key: "expense" as const, label: "Expense", count: stats.expense },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <Tags className="h-4.5 w-4.5" />
            </span>
            <div>
              <DialogTitle className="text-base">Category Manager</DialogTitle>
              <DialogDescription className="text-xs">
                {stats.enabled} of {stats.total} enabled
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-5">
          {/* Tabs + Search */}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === t.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span className="rounded-full bg-muted-foreground/10 px-1.5 py-0.5 text-[10px]">
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring/40 sm:w-44"
              />
            </div>
          </div>

          {/* Add buttons */}
          <div className="mb-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => openNew("income")}
            >
              <Plus className="h-3.5 w-3.5" /> Income
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => openNew("expense")}
            >
              <Plus className="h-3.5 w-3.5" /> Expense
            </Button>
          </div>

          {/* Inline add/edit form */}
          {formVisible && (
            <form
              onSubmit={handleSubmit}
              className="mb-3 flex flex-col gap-2 rounded-xl border border-border bg-accent/30 p-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {editingId ? "Edit" : "New"} Category
                </Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Category name"
                  autoFocus
                  className="h-8 text-xs"
                />
              </div>
              {!editingId && (
                <div className="flex gap-1">
                  {(["income", "expense"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-[10px] font-semibold capitalize transition-colors",
                        formType === t
                          ? t === "income"
                            ? "border-success bg-success-soft text-success"
                            : "border-danger bg-danger-soft text-danger"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="h-8 gap-1 px-2.5 text-xs"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {editingId ? "Save" : "Add"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => {
                    setEditingId(null);
                    setAdding(null);
                    setFormName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Category list */}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
                <Tags className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-xs text-muted-foreground">No categories found</p>
              </div>
            ) : (
              filtered.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 transition-colors hover:bg-accent/30",
                    !cat.is_enabled && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                      cat.is_income ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                    )}
                  >
                    {cat.is_income ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {cat.is_default ? "Default" : "Custom"} ·{" "}
                      {cat.is_income ? "Income" : "Expense"}
                    </p>
                  </div>

                  {/* Toggle — for all categories */}
                  <button
                    type="button"
                    onClick={() => handleToggle(cat.id, !cat.is_enabled)}
                    className={cn(
                      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                      cat.is_enabled ? "bg-primary" : "bg-muted-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        cat.is_enabled ? "left-[18px]" : "left-0.5",
                      )}
                    />
                  </button>

                  {!cat.is_default && (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => openEdit(cat)}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => setPendingDelete({ id: cat.id, name: cat.name })}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be removed. Transactions using it won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
