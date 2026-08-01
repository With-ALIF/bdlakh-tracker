import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus, Search, TrendingUp, TrendingDown, Users,
} from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { PageHeader } from "@/components/ui-kit";
import { useFinance } from "@/context/FinanceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoanDirection, LoanStatus } from "@/types";
import { fmt, remainingAmount } from "./utils";
import { StatCard } from "./StatCard";
import { LoanCard } from "./LoanCard";
import { LoanDetail } from "./LoanDetail";
import { LoanFormDialog } from "./LoanFormDialog";
import { EmptyState } from "./EmptyState";

export const Route = createFileRoute("/loan")({
  head: () => ({
    meta: [
      { title: "Loan Manager — Money Mate" },
      { name: "description", content: "Manage money you have lent and borrowed in one place." },
    ],
  }),
  component: LoanPage,
});

type Filter = "all" | LoanDirection | LoanStatus;



function LoanPage() {
  const { loans } = useFinance();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const selectedLoan = loans.find((l) => l.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = loans;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.contactName.toLowerCase().includes(q));
    }
    if (filter === "receivable" || filter === "payable") list = list.filter((l) => l.direction === filter);
    else if (filter === "active" || filter === "completed" || filter === "overdue") list = list.filter((l) => l.status === filter);
    return list;
  }, [loans, search, filter]);

  // stats
  const totalReceivable = loans.filter((l) => l.direction === "receivable" && l.status !== "completed").reduce((s, l) => s + remainingAmount(l), 0);
  const totalPayable    = loans.filter((l) => l.direction === "payable"    && l.status !== "completed").reduce((s, l) => s + remainingAmount(l), 0);
  const activeContacts  = new Set(loans.filter((l) => l.status === "active").map((l) => l.contactName)).size;

  if (selectedLoan) {
    return (
      <AppLayout>
        <LoanDetail loan={selectedLoan} onBack={() => setSelectedId(null)} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <PageHeader
        title="Loan Manager"
        subtitle="Manage money you have lent and borrowed in one place."
        action={
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New Loan
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={TrendingUp}  iconColor="text-emerald-500" bg="bg-emerald-500/10" label="Total Receivable" value={fmt(totalReceivable)} />
        <StatCard icon={TrendingDown} iconColor="text-rose-500"   bg="bg-rose-500/10"    label="Total Payable"   value={fmt(totalPayable)}    />
        <StatCard icon={Users}        iconColor="text-blue-500"   bg="bg-blue-500/10"    label="Active Contacts" value={String(activeContacts)} />
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={filter} onValueChange={(v: Filter) => setFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter loans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Loans</SelectItem>
              <SelectItem value="receivable">Receivable</SelectItem>
              <SelectItem value="payable">Payable</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((loan) => (
            <LoanCard key={loan.id} loan={loan} onSelect={() => setSelectedId(loan.id)} />
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <LoanFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppLayout>
  );
}
