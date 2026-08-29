import { Budget, Category, Expense, SalaryPeriod } from "./types";

export function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrency(n: number) {
  return `฿${formatMoney(n)}`;
}

export function toLocalDateString(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateInRange(dateIso: string, startDateStr: string, endDateStr: string): boolean {
  if (!dateIso || !startDateStr || !endDateStr) return false;
  const dateStr = toLocalDateString(dateIso);
  return dateStr >= startDateStr && dateStr <= endDateStr;
}

export function formatDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "";
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const startFmt = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: sy === ey ? undefined : "numeric",
  });
  const endFmt = end.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
}

export function getDaysRemaining(endDateStr: string): number {
  if (!endDateStr) return 0;
  const todayStr = toLocalDateString(new Date());
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td).getTime();
  const endDate = new Date(ey, em - 1, ed).getTime();
  const diffDays = Math.ceil((endDate - todayDate) / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getDefaultSalaryCycle(payDay: number = 25, referenceDate: Date = new Date()): {
  startDate: string;
  endDate: string;
  name: string;
} {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth(); // 0-indexed
  const d = referenceDate.getDate();

  let startYear = y;
  let startMonth = m;
  if (d < payDay) {
    startMonth = m - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = y - 1;
    }
  }

  const startDateObj = new Date(startYear, startMonth, payDay);
  const nextMonthObj = new Date(startYear, startMonth + 1, payDay);
  const endDateObj = new Date(nextMonthObj.getFullYear(), nextMonthObj.getMonth(), nextMonthObj.getDate() - 1);

  const startDate = toLocalDateString(startDateObj);
  const endDate = toLocalDateString(endDateObj);
  const name = `${startDateObj.toLocaleDateString(undefined, { month: "short" })} ${payDay} – ${endDateObj.toLocaleDateString(undefined, { month: "short" })} ${endDateObj.getDate()}`;

  return { startDate, endDate, name };
}

/** Total spend for a budget in a salary period. */
export function budgetSpendForPeriod(
  expenses: Expense[],
  categories: Category[],
  budget: Budget,
  period: SalaryPeriod
): number {
  let targetIds: Set<string>;
  if (budget.categoryIds && budget.categoryIds.length > 0) {
    targetIds = new Set(budget.categoryIds);
  } else {
    targetIds = new Set(
      categories.filter((c) => c.countsTowardBudget).map((c) => c.id)
    );
  }
  return expenses
    .filter((e) => isDateInRange(e.date, period.startDate, period.endDate) && targetIds.has(e.categoryId))
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Total spend for all expenses within a salary period. */
export function totalSpendInSalaryPeriod(
  expenses: Expense[],
  period: SalaryPeriod
): number {
  return expenses
    .filter((e) => isDateInRange(e.date, period.startDate, period.endDate))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getCoveredCategories(
  budget: { categoryIds?: string[] },
  categories: Category[]
): Category[] {
  if (budget.categoryIds && budget.categoryIds.length > 0) {
    const idSet = new Set(budget.categoryIds);
    return categories.filter((c) => idSet.has(c.id));
  }
  return categories.filter((c) => c.countsTowardBudget);
}

// Backward compatibility helper
export function budgetedSpendForBudgetGroup(
  expenses: Expense[],
  categories: Category[],
  budget: { startDate: string; endDate: string; categoryIds?: string[] }
): number {
  let targetIds: Set<string>;
  if (budget.categoryIds && budget.categoryIds.length > 0) {
    targetIds = new Set(budget.categoryIds);
  } else {
    targetIds = new Set(
      categories.filter((c) => c.countsTowardBudget).map((c) => c.id)
    );
  }
  return expenses
    .filter((e) => isDateInRange(e.date, budget.startDate, budget.endDate) && targetIds.has(e.categoryId))
    .reduce((sum, e) => sum + e.amount, 0);
}
