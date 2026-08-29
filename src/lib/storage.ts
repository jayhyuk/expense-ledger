import { BudgetPeriod, Budgets, Category, Expense, ExportPayload } from "./types";

const CATEGORIES_KEY = "expense-ledger:categories";
const EXPENSES_KEY = "expense-ledger:expenses";
const BUDGETS_KEY = "expense-ledger:budgets";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food", color: "#f97316", countsTowardBudget: true },
  { id: "transport", name: "Transport", color: "#3b82f6", countsTowardBudget: true },
  { id: "shopping", name: "Shopping", color: "#ec4899", countsTowardBudget: true },
  { id: "bills", name: "Bills", color: "#eab308", countsTowardBudget: true },
  { id: "entertainment", name: "Entertainment", color: "#a855f7", countsTowardBudget: true },
  { id: "health", name: "Health", color: "#22c55e", countsTowardBudget: true },
  { id: "other", name: "Other", color: "#64748b", countsTowardBudget: true },
];

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadCategories(): Category[] {
  if (!isBrowser()) return DEFAULT_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Backfill countsTowardBudget for data saved before this field existed.
      return parsed.map((c) => ({
        countsTowardBudget: true,
        ...c,
      }));
    }
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function loadExpenses(): Expense[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(EXPENSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function loadBudgets(): BudgetPeriod[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BUDGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // New format: Array of BudgetPeriod
    if (Array.isArray(parsed)) {
      return parsed
        .filter((b) => b && typeof b === "object" && b.startDate && b.endDate)
        .map((b) => ({
          id: b.id || genId(),
          name: b.name || `${b.startDate} – ${b.endDate}`,
          amount: typeof b.amount === "number" ? b.amount : parseFloat(b.amount) || 0,
          startDate: b.startDate,
          endDate: b.endDate,
          categoryIds: Array.isArray(b.categoryIds) ? b.categoryIds : undefined,
        }));
    }

    // Legacy format: Record<string, number>
    if (parsed && typeof parsed === "object") {
      const periods: BudgetPeriod[] = [];
      for (const [key, val] of Object.entries(parsed)) {
        if (/^\d{4}-\d{2}$/.test(key) && typeof val === "number" && val > 0) {
          const [y, m] = key.split("-").map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          const startDate = `${key}-01`;
          const endDate = `${key}-${String(lastDay).padStart(2, "0")}`;
          periods.push({
            id: genId(),
            name: new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
            amount: val,
            startDate,
            endDate,
          });
        }
      }
      return periods;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveBudgets(budgets: BudgetPeriod[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function buildExportPayload(): ExportPayload {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    categories: loadCategories(),
    expenses: loadExpenses(),
    budgets: loadBudgets(),
  };
}

export function applyImportPayload(payload: ExportPayload) {
  if (!payload || !Array.isArray(payload.categories) || !Array.isArray(payload.expenses)) {
    throw new Error("Invalid file format: expected categories and expenses arrays.");
  }
  const categories = payload.categories.map((c) => ({
    ...c,
    countsTowardBudget: c.countsTowardBudget ?? true,
  }));

  let budgets: BudgetPeriod[] = [];
  if (Array.isArray(payload.budgets)) {
    budgets = payload.budgets.map((b) => ({
      id: b.id || genId(),
      name: b.name || `${b.startDate} – ${b.endDate}`,
      amount: typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0,
      startDate: b.startDate,
      endDate: b.endDate,
      categoryIds: Array.isArray(b.categoryIds) ? b.categoryIds : undefined,
    }));
  } else if (payload.budgets && typeof payload.budgets === "object") {
    for (const [key, val] of Object.entries(payload.budgets)) {
      if (/^\d{4}-\d{2}$/.test(key) && typeof val === "number" && val > 0) {
        const [y, m] = key.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        budgets.push({
          id: genId(),
          name: new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          amount: val,
          startDate: `${key}-01`,
          endDate: `${key}-${String(lastDay).padStart(2, "0")}`,
        });
      }
    }
  }

  saveCategories(categories);
  saveExpenses(payload.expenses);
  saveBudgets(budgets);
}

export function genId(): string {
  if (isBrowser() && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
