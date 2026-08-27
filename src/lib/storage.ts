import { Budgets, Category, Expense, ExportPayload } from "./types";

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

export function loadBudgets(): Budgets {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(BUDGETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBudgets(budgets: Budgets) {
  if (!isBrowser()) return;
  window.localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function buildExportPayload(): ExportPayload {
  return {
    version: 2,
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
  const budgets = payload.budgets && typeof payload.budgets === "object" ? payload.budgets : {};
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
