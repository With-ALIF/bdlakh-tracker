import { Banknote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Banknote className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold">No loans yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Start tracking money you lent or borrowed.</p>
      <Button className="mt-5 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Add First Loan
      </Button>
    </div>
  );
}