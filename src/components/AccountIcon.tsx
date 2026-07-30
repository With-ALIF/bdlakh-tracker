import { ACCOUNT_ICONS, ACCOUNT_LOGOS } from "@/constants";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountIconProps {
  accountId?: string;
  accountName?: string;
  iconKey?: string;
  className?: string;
  sizeClassName?: string;
}

export function AccountIcon({
  accountId,
  accountName,
  iconKey,
  className,
  sizeClassName = "h-5 w-5",
}: AccountIconProps) {
  const key = (accountId || accountName || "").toLowerCase();
  const logo =
    ACCOUNT_LOGOS[key] ||
    (key.includes("bkash")
      ? ACCOUNT_LOGOS.bkash
      : key.includes("nagad")
        ? ACCOUNT_LOGOS.nagad
        : key.includes("rocket")
          ? ACCOUNT_LOGOS.rocket
          : key.includes("cash")
            ? ACCOUNT_LOGOS.cash
            : key.includes("bank")
              ? ACCOUNT_LOGOS.bank
              : null);

  if (logo) {
    return (
      <img
        src={logo}
        alt={accountName || accountId || "Account Logo"}
        className={cn(
          "object-contain rounded-md bg-white p-0.5 shadow-sm border border-border/40 shrink-0",
          sizeClassName,
          className,
        )}
      />
    );
  }

  const Icon = (iconKey && ACCOUNT_ICONS[iconKey as keyof typeof ACCOUNT_ICONS]) || Wallet;

  return <Icon className={cn(sizeClassName, className)} />;
}
