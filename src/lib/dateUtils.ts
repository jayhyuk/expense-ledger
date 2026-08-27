import { Category, Expense } from "./types";

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
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Total spend for a given month, restricted to categories that count toward budget. */
export function budgetedSpendForMonth(
  expenses: Expense[],
  categories: Category[],
  month: string
): number {
  const budgetedIds = new Set(
    categories.filter((c) => c.countsTowardBudget).map((c) => c.id)
  );
  return expenses
    .filter((e) => monthKey(e.date) === month && budgetedIds.has(e.categoryId))
    .reduce((sum, e) => sum + e.amount, 0);
}
