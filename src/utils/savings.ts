import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { BD_TZ, now } from "@/lib/date";
import type { SavingContribution, SavingWithdrawal, SavingsGoal } from "@/types";

dayjs.extend(utc);
dayjs.extend(timezone);

export type GoalStatusType =
  | "Completed"
  | "Overdue"
  | "On Track"
  | "Slightly Behind"
  | "At Risk";

export interface SavingsGoalStatusResult {
  status: GoalStatusType;
  progressPercentage: number;
  timeProgress: number; 
  expectedSavedAmount: number;
  actualSavedAmount: number;
  savingPaceRatio: number | null; // null when expectedSavedAmount === 0
  remainingAmount: number;
  daysRemaining: number;
  statusMessage: {
    title: string;
    description: string;
  };
  badgeTone: "success" | "danger" | "primary" | "warning";
}

export interface GoalStats extends SavingsGoalStatusResult {
  saved: number;
  remaining: number;
  progress: number;
  daysLeft: number;
  overdue: boolean;
  requiredDaily: number;
  requiredWeekly: number;
  requiredMonthly: number;
  expected: number;
  behindBy: number;
  onTrack: boolean;
  isCompleted: boolean;
}

export function calculateSavingsGoalStatus(
  goal: SavingsGoal,
  contributions: SavingContribution[],
  withdrawals: SavingWithdrawal[] = [],
  currentDate?: Date | string,
): SavingsGoalStatusResult {
  const current = currentDate
    ? dayjs(currentDate).tz(BD_TZ).startOf("day")
    : now().startOf("day");
  const createdDate = goal.createdAt
    ? dayjs(goal.createdAt).tz(BD_TZ).startOf("day")
    : current;
  const deadline = goal.deadline ? dayjs(goal.deadline).tz(BD_TZ).startOf("day") : null;

  // Actual Saved Amount (contributions minus withdrawals)
  const totalContributions = contributions
    .filter((c) => c.goalId === goal.id)
    .reduce((sum, c) => sum + c.amount, 0);
  const totalWithdrawals = withdrawals
    .filter((w) => w.goalId === goal.id)
    .reduce((sum, w) => sum + w.amount, 0);
  const actualSavedAmount = totalContributions - totalWithdrawals;

  const targetAmount = Math.max(0, goal.targetAmount || 0);
  const remainingAmount = Math.max(0, targetAmount - actualSavedAmount);

  // Progress percentage (clamp to 100%)
  const progressPercentage =
    targetAmount > 0 ? Math.min(100, (actualSavedAmount / targetAmount) * 100) : 0;

  // Days Remaining
  const rawDaysRemaining = deadline ? deadline.diff(current, "day") : 0;
  const daysRemaining = deadline ? Math.max(0, rawDaysRemaining) : 0;

  // Priority 1: Completed
  const isCompleted =
    (targetAmount > 0 && actualSavedAmount >= targetAmount) || goal.status === "completed";

  if (isCompleted) {
    return {
      status: "Completed",
      progressPercentage: 100,
      timeProgress: 1,
      expectedSavedAmount: targetAmount,
      actualSavedAmount,
      savingPaceRatio: 1,
      remainingAmount: 0,
      daysRemaining,
      statusMessage: {
        title: "Completed",
        description: "You've successfully reached your savings target.",
      },
      badgeTone: "success",
    };
  }

  // Priority 2: Overdue
  const isOverdue = !!deadline && current.isAfter(deadline);

  if (isOverdue) {
    const formattedRemaining = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(remainingAmount);

    return {
      status: "Overdue",
      progressPercentage,
      timeProgress: 1,
      expectedSavedAmount: targetAmount,
      actualSavedAmount,
      savingPaceRatio: targetAmount > 0 ? actualSavedAmount / targetAmount : null,
      remainingAmount,
      daysRemaining: 0,
      statusMessage: {
        title: "Overdue",
        description: `Your deadline has passed. ৳${formattedRemaining} remains to reach your goal.`,
      },
      badgeTone: "danger",
    };
  }

  // Calculate Time Progress & Expected Saved Amount for Priority 3, 4, 5
  let totalDuration = 0;
  let elapsedDays = 0;
  let timeProgress = 0;
  let expectedSavedAmount = 0;

  if (deadline && deadline.isAfter(createdDate)) {
    totalDuration = Math.max(1, deadline.diff(createdDate, "day"));
    const rawElapsed = current.diff(createdDate, "day");
    elapsedDays = Math.max(0, rawElapsed);
    timeProgress = Math.min(1, Math.max(0, elapsedDays / totalDuration));
    expectedSavedAmount = targetAmount * timeProgress;
  }

  let savingPaceRatio: number | null = null;
  let status: GoalStatusType = "On Track";
  let badgeTone: "success" | "danger" | "primary" | "warning" = "primary";
  let statusMessage = {
    title: "On track",
    description: "You're saving at the right pace to reach your goal.",
  };

  if (expectedSavedAmount <= 0) {
    // Goal just started, no deadline, or future created date -> On Track
    status = "On Track";
    badgeTone = "primary";
    savingPaceRatio = null;
    statusMessage = {
      title: "On track",
      description: "You're saving at the right pace to reach your goal.",
    };
  } else {
    savingPaceRatio = actualSavedAmount / expectedSavedAmount;

    if (savingPaceRatio >= 0.9) {
      status = "On Track";
      badgeTone = "primary";
      statusMessage = {
        title: "On track",
        description: "You're saving at the right pace to reach your goal.",
      };
    } else if (savingPaceRatio >= 0.7) {
      status = "Slightly Behind";
      badgeTone = "warning";
      statusMessage = {
        title: "Slightly behind",
        description: "A little extra saving will help you stay on schedule.",
      };
    } else {
      status = "At Risk";
      badgeTone = "danger";
      statusMessage = {
        title: "At risk",
        description: "Increase your saving pace to reach your goal on time.",
      };
    }
  }

  return {
    status,
    progressPercentage,
    timeProgress,
    expectedSavedAmount,
    actualSavedAmount,
    savingPaceRatio,
    remainingAmount,
    daysRemaining,
    statusMessage,
    badgeTone,
  };
}

export function goalStats(
  goal: SavingsGoal,
  contributions: SavingContribution[],
  withdrawals: SavingWithdrawal[] = [],
  currentDate?: Date | string,
): GoalStats {
  const dynamicStatus = calculateSavingsGoalStatus(goal, contributions, withdrawals, currentDate);

  const saved = dynamicStatus.actualSavedAmount;
  const target = Math.max(0, goal.targetAmount || 0);
  const remaining = dynamicStatus.remainingAmount;
  const progress = dynamicStatus.progressPercentage;
  const daysLeft = dynamicStatus.daysRemaining;
  const overdue = dynamicStatus.status === "Overdue";
  const isCompleted = dynamicStatus.status === "Completed";

  const days = Math.max(1, daysLeft);
  const requiredDaily = remaining / days;
  const requiredWeekly = remaining / Math.max(1, Math.ceil(days / 7));
  const requiredMonthly = (remaining * 30) / Math.max(1, days);

  const expected = dynamicStatus.expectedSavedAmount;
  const behindBy = Math.max(0, expected - saved);
  const onTrack = dynamicStatus.status === "On Track" || isCompleted;

  return {
    ...dynamicStatus,
    saved,
    remaining,
    progress,
    daysLeft,
    overdue,
    requiredDaily,
    requiredWeekly,
    requiredMonthly,
    expected,
    behindBy,
    onTrack,
    isCompleted,
  };
}

export const GOAL_SUGGESTIONS = [
  "New Laptop",
  "New Phone",
  "Semester Tuition",
  "Travel",
  "Emergency Fund",
  "New PC",
];
