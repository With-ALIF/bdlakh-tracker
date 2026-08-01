import { useState } from "react";
import { ACCOUNT_ICONS, ACCOUNT_LOGOS } from "@/constants";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/context/FinanceContext";

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
  const [hasError, setHasError] = useState(false);

  let accounts: any[] = [];
  try {
    const fin = useFinance();
    accounts = fin?.accounts ?? [];
  } catch {
    accounts = [];
  }

  // Find target account from context if accountId is provided
  const matchedAccount = accountId ? accounts.find((a) => a.id === accountId) : null;
  const effectiveName = accountName || matchedAccount?.name || "";
  const effectiveIconKey = iconKey || matchedAccount?.icon || "";

  const getLogo = (): string | null => {
    if (hasError) return null;

    // Check UUID provider map
    if (accountId === "a0000000-0000-0000-0000-000000000001") return ACCOUNT_LOGOS.cash;
    if (accountId === "a0000000-0000-0000-0000-000000000002") return ACCOUNT_LOGOS.bkash;
    if (accountId === "a0000000-0000-0000-0000-000000000003") return ACCOUNT_LOGOS.nagad;
    if (accountId === "a0000000-0000-0000-0000-000000000004") return ACCOUNT_LOGOS.rocket;
    if (accountId === "a0000000-0000-0000-0000-000000000005") return ACCOUNT_LOGOS.bank;

    // Combined search string
    const searchTarget = `${effectiveName} ${accountId || ""} ${effectiveIconKey}`.toLowerCase();

    if (searchTarget.includes("bkash")) return ACCOUNT_LOGOS.bkash;
    if (searchTarget.includes("nagad")) return ACCOUNT_LOGOS.nagad;
    if (searchTarget.includes("rocket")) return ACCOUNT_LOGOS.rocket;
    if (searchTarget.includes("cash")) return ACCOUNT_LOGOS.cash;
    if (searchTarget.includes("bank")) return ACCOUNT_LOGOS.bank;

    // Direct key check
    if (accountId && ACCOUNT_LOGOS[accountId.toLowerCase()]) {
      return ACCOUNT_LOGOS[accountId.toLowerCase()];
    }
    if (effectiveName && ACCOUNT_LOGOS[effectiveName.toLowerCase()]) {
      return ACCOUNT_LOGOS[effectiveName.toLowerCase()];
    }

    return null;
  };

  const logo = getLogo();

  if (logo) {
    return (
      <img
        src={logo}
        alt={effectiveName || accountId || "Account Logo"}
        onError={() => setHasError(true)}
        className={cn(
          "object-contain rounded-md shrink-0",
          sizeClassName,
          className
        )}
      />
    );
  }

  const Icon =
    (effectiveIconKey && ACCOUNT_ICONS[effectiveIconKey as keyof typeof ACCOUNT_ICONS]) || Wallet;

  return <Icon className={cn(sizeClassName, className)} />;
}
