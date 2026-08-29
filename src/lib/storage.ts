import { Budget, Category, Expense, ExportPayload, SalaryPeriod } from "./types";

const CATEGORIES_KEY = "expense-ledger:categories";
const EXPENSES_KEY = "expense-ledger:expenses";
const SALARY_PERIODS_KEY = "expense-ledger:salary-periods";
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

export function genId(): string {
  if (isBrowser() && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadCategories(): Category[] {
  if (!isBrowser()) return DEFAULT_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
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

export function loadSalaryPeriods(): SalaryPeriod[] {
  if (!isBrowser()) return [];
  try {
    const rawPeriods = window.localStorage.getItem(SALARY_PERIODS_KEY);
    if (rawPeriods) {
      const parsed = JSON.parse(rawPeriods);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((p) => p && typeof p === "object" && p.startDate && p.endDate)
          .map((p) => ({
            id: p.id || genId(),
            name: p.name || `${p.startDate} – ${p.endDate}`,
            startDate: p.startDate,
            endDate: p.endDate,
          }));
      }
    }

    // Auto-migration from legacy BUDGETS_KEY
    const rawBudgets = window.localStorage.getItem(BUDGETS_KEY);
    if (rawBudgets) {
      const parsedBudgets = JSON.parse(rawBudgets);
      if (Array.isArray(parsedBudgets)) {
        const periods = periodsFromLegacyBudgets(parsedBudgets);
        if (periods.length > 0) {
          saveSalaryPeriods(periods);
          return periods;
        }
      }
      if (parsedBudgets && typeof parsedBudgets === "object" && !Array.isArray(parsedBudgets)) {
        const periods = periodsFromLegacyBudgetRecord(parsedBudgets);
        if (periods.length > 0) {
          saveSalaryPeriods(periods);
          return periods;
        }
      }
    }
    return [];
  } catch {
    return [];
  }
}

type LegacyBudget = Partial<Budget> & { startDate?: string; endDate?: string };

function periodsFromLegacyBudgets(items: unknown[]): SalaryPeriod[] {
  const periodMap = new Map<string, SalaryPeriod>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const b = item as LegacyBudget;
    if (!b?.startDate || !b?.endDate) continue;
    const key = `${b.startDate}_${b.endDate}`;
    if (!periodMap.has(key)) {
      periodMap.set(key, { id: genId(), name: b.name || `${b.startDate} – ${b.endDate}`, startDate: b.startDate, endDate: b.endDate });
    }
  }
  return Array.from(periodMap.values()).sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function periodsFromLegacyBudgetRecord(record: Record<string, unknown>): SalaryPeriod[] {
  return Object.keys(record).filter((key) => /^\d{4}-\d{2}$/.test(key) && Number(record[key]) > 0).sort((a, b) => b.localeCompare(a)).map((key) => {
    const [year, month] = key.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { id: genId(), name: new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }), startDate: `${key}-01`, endDate: `${key}-${String(lastDay).padStart(2, "0")}` };
  });
}

export function saveSalaryPeriods(periods: SalaryPeriod[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SALARY_PERIODS_KEY, JSON.stringify(periods));
}

export function loadBudgets(existingPeriods?: SalaryPeriod[]): Budget[] {
  if (!isBrowser()) return [];
  try {
    const periods = existingPeriods || loadSalaryPeriods();
    const raw = window.localStorage.getItem(BUDGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const results: Budget[] = [];
      for (const b of parsed) {
        if (!b || typeof b !== "object") continue;
        let periodId = b.periodId;

        // If legacy item with direct startDate/endDate, find or link to period
        if (!periodId && b.startDate && b.endDate) {
          let matchingPeriod = periods.find(
            (p) => p.startDate === b.startDate && p.endDate === b.endDate
          );
          if (matchingPeriod) {
            periodId = matchingPeriod.id;
          } else {
            matchingPeriod = {
              id: genId(),
              name: b.name || `${b.startDate} – ${b.endDate}`,
              startDate: b.startDate,
              endDate: b.endDate,
            };
            periods.push(matchingPeriod);
            periodId = matchingPeriod.id;
            saveSalaryPeriods(periods);
          }
        }

        if (periodId) {
          results.push({
            id: b.id || genId(),
            periodId,
            name: b.name || "Budget",
            amount: typeof b.amount === "number" ? b.amount : parseFloat(b.amount) || 0,
            categoryIds: Array.isArray(b.categoryIds) ? b.categoryIds : undefined,
          });
        }
      }
      return results;
    }

    // Legacy format: Record<string, number>
    if (parsed && typeof parsed === "object") {
      const budgets: Budget[] = [];
      for (const [key, val] of Object.entries(parsed)) {
        if (/^\d{4}-\d{2}$/.test(key) && Number(val) > 0) {
          const matchingPeriod = periods.find((p) => p.startDate.startsWith(key));
          if (matchingPeriod) {
            budgets.push({
              id: genId(),
              periodId: matchingPeriod.id,
              name: "Overall Budget",
              amount: Number(val),
            });
          }
        }
      }
      return budgets;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveBudgets(budgets: Budget[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function buildExportPayload(): ExportPayload {
  const periods = loadSalaryPeriods();
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    categories: loadCategories(),
    expenses: loadExpenses(),
    salaryPeriods: periods,
    budgets: loadBudgets(periods),
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

  let salaryPeriods: SalaryPeriod[] = [];
  const budgets: Budget[] = [];

  if (Array.isArray(payload.salaryPeriods)) {
    salaryPeriods = payload.salaryPeriods.map((p) => ({
      id: p.id || genId(),
      name: p.name || `${p.startDate} – ${p.endDate}`,
      startDate: p.startDate,
      endDate: p.endDate,
    }));
  }

  if (Array.isArray(payload.budgets)) {
    // If salaryPeriods was empty in payload, extract from legacy budgets
    if (salaryPeriods.length === 0) {
      salaryPeriods = periodsFromLegacyBudgets(payload.budgets as unknown[]);
    }

    for (const item of payload.budgets as unknown[]) {
      if (!item || typeof item !== "object") continue;
      const b = item as LegacyBudget;
      let periodId = b.periodId;
      if (!periodId && b.startDate && b.endDate) {
        const match = salaryPeriods.find((p) => p.startDate === b.startDate && p.endDate === b.endDate);
        if (match) periodId = match.id;
      }
      if (periodId || salaryPeriods[0]) {
        budgets.push({
          id: b.id || genId(),
          periodId: periodId || salaryPeriods[0].id,
          name: b.name || "Budget",
          amount: typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)) || 0,
          categoryIds: Array.isArray(b.categoryIds) ? b.categoryIds : undefined,
        });
      }
    }
  } else if (payload.budgets && typeof payload.budgets === "object") {
    salaryPeriods = salaryPeriods.length > 0 ? salaryPeriods : periodsFromLegacyBudgetRecord(payload.budgets);
    for (const [key, val] of Object.entries(payload.budgets)) {
      const period = salaryPeriods.find((p) => p.startDate.startsWith(key));
      if (/^\d{4}-\d{2}$/.test(key) && period && Number(val) > 0) {
        budgets.push({ id: genId(), periodId: period.id, name: "Overall Budget", amount: Number(val) });
      }
    }
  }

  saveCategories(categories);
  saveExpenses(payload.expenses);
  saveSalaryPeriods(salaryPeriods);
  saveBudgets(budgets);
}
