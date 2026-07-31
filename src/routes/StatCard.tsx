import { cn } from "@/lib/utils";

export function StatCard({ icon: Icon, iconColor, bg, label, value }: {
  icon: React.ElementType; iconColor: string; bg: string; label: string; value: string;
}) {
  return (
    <div className="card-surface animate-rise p-4">
      <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl", bg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}