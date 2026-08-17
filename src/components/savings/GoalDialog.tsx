import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSavings } from "@/context/SavingsContext";
import { today } from "@/lib/date";
import type { SavingsGoal } from "@/types";

export function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal?: SavingsGoal | null;
}) {
  const { addGoal, updateGoal } = useSavings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    deadline: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: goal?.name ?? "",
      targetAmount: goal ? String(goal.targetAmount) : "",
      deadline: goal?.deadline ?? "",
    });
  }, [open, goal]);

  const submit = async () => {
    const amount = Number(form.targetAmount);
    if (!form.name.trim()) return toast.error("Goal name is required");
    if (!amount || amount <= 0) return toast.error("Target amount must be greater than 0");
    if (form.deadline && form.deadline < today() && !goal)
      return toast.error("Deadline cannot be in the past");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      targetAmount: amount,
      deadline: form.deadline || undefined,
    };
    const ok = goal ? await updateGoal(goal.id, payload) : !!(await addGoal(payload));
    setSaving(false);

    if (!ok) return toast.error("Could not save the goal");
    toast.success(goal ? "Goal updated" : "Goal created");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {goal ? "Edit goal" : "New savings goal"}
          </DialogTitle>
          <DialogDescription className="text-indigo-600 dark:text-indigo-400">
            Set your savings target and deadline — track your progress as you build toward your goal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input
              id="goal-name"
              placeholder="New Laptop"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input
                id="goal-target"
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="50000"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">Deadline</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : goal ? "Save changes" : "Create goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
