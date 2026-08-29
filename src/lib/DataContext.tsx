"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BudgetPeriod, Budgets, Category, Expense, ExportPayload } from "./types";
import {
  applyImportPayload,
  buildExportPayload,
  DEFAULT_CATEGORIES,
  genId,
  loadBudgets,
  loadCategories,
  loadExpenses,
  saveBudgets,
  saveCategories,
  saveExpenses,
} from "./storage";
import { isDateInRange, toLocalDateString } from "./dateUtils";

type NewExpenseInput = {
  amount: number;
  shop: string;
  categoryId: string;
  date: string;
};

type NewBudgetInput = {
  name?: string;
  amount: number;
  startDate: string;
  endDate: string;
};

type DataContextValue = {
  ready: boolean;
  categories: Category[];
  expenses: Expense[];
  budgets: BudgetPeriod[];
  addExpense: (input: NewExpenseInput) => void;
  updateExpense: (id: string, input: NewExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addCategory: (name: string, color: string, countsTowardBudget: boolean) => void;
  updateCategory: (
    id: string,
    updates: { name?: string; color?: string; countsTowardBudget?: boolean }
  ) => void;
  removeCategory: (id: string) => void;
  updateCategoryBudgetFlag: (id: string, countsTowardBudget: boolean) => void;
  addBudgetPeriod: (input: NewBudgetInput) => BudgetPeriod;
  updateBudgetPeriod: (id: string, input: NewBudgetInput) => void;
  deleteBudgetPeriod: (id: string) => void;
  getActiveBudget: (dateIsoOrStr?: string) => BudgetPeriod | undefined;
  getBudgetForMonth: (month: string) => number;
  setMonthBudget: (month: string, amount: number) => void;
  exportJson: () => string;
  importJson: (json: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<BudgetPeriod[]>([]);

  useEffect(() => {
    setCategories(loadCategories());
    setExpenses(loadExpenses());
    setBudgets(loadBudgets());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);

  useEffect(() => {
    if (ready) saveExpenses(expenses);
  }, [expenses, ready]);

  useEffect(() => {
    if (ready) saveBudgets(budgets);
  }, [budgets, ready]);

  const addExpense = useCallback((input: NewExpenseInput) => {
    const expense: Expense = {
      id: genId(),
      amount: input.amount,
      shop: input.shop,
      categoryId: input.categoryId,
      date: input.date,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, input: NewExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              amount: input.amount,
              shop: input.shop,
              categoryId: input.categoryId,
              date: input.date,
            }
          : e
      )
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addCategory = useCallback((name: string, color: string, countsTowardBudget: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => [
      ...prev,
      { id: genId(), name: trimmed, color, countsTowardBudget },
    ]);
  }, []);

  const updateCategory = useCallback(
    (
      id: string,
      updates: { name?: string; color?: string; countsTowardBudget?: boolean }
    ) => {
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          return {
            ...c,
            ...(updates.name !== undefined && updates.name.trim()
              ? { name: updates.name.trim() }
              : {}),
            ...(updates.color !== undefined ? { color: updates.color } : {}),
            ...(updates.countsTowardBudget !== undefined
              ? { countsTowardBudget: updates.countsTowardBudget }
              : {}),
          };
        })
      );
    },
    []
  );

  const removeCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCategoryBudgetFlag = useCallback((id: string, countsTowardBudget: boolean) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, countsTowardBudget } : c))
    );
  }, []);

  const addBudgetPeriod = useCallback((input: NewBudgetInput): BudgetPeriod => {
    const newPeriod: BudgetPeriod = {
      id: genId(),
      name: input.name?.trim() || `${input.startDate} – ${input.endDate}`,
      amount: input.amount,
      startDate: input.startDate,
      endDate: input.endDate,
    };
    setBudgets((prev) => {
      // Keep sorted by startDate descending
      const next = [newPeriod, ...prev];
      next.sort((a, b) => b.startDate.localeCompare(a.startDate));
      return next;
    });
    return newPeriod;
  }, []);

  const updateBudgetPeriod = useCallback((id: string, input: NewBudgetInput) => {
    setBudgets((prev) => {
      const next = prev.map((b) =>
        b.id === id
          ? {
              ...b,
              name: input.name?.trim() || `${input.startDate} – ${input.endDate}`,
              amount: input.amount,
              startDate: input.startDate,
              endDate: input.endDate,
            }
          : b
      );
      next.sort((a, b) => b.startDate.localeCompare(a.startDate));
      return next;
    });
  }, []);

  const deleteBudgetPeriod = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const getActiveBudget = useCallback(
    (dateIsoOrStr?: string): BudgetPeriod | undefined => {
      if (budgets.length === 0) return undefined;
      const targetDate = dateIsoOrStr || toLocalDateString(new Date());
      // First try to find one that encloses targetDate
      const enclosing = budgets.find((b) => isDateInRange(targetDate, b.startDate, b.endDate));
      if (enclosing) return enclosing;
      // Otherwise return the most recent budget
      return budgets[0];
    },
    [budgets]
  );

  const getBudgetForMonth = useCallback(
    (month: string) => {
      const matching = budgets.find((b) => b.startDate.startsWith(month));
      if (matching) return matching.amount;
      const active = getActiveBudget();
      return active ? active.amount : 0;
    },
    [budgets, getActiveBudget]
  );

  const setMonthBudget = useCallback(
    (month: string, amount: number) => {
      const existing = budgets.find((b) => b.startDate.startsWith(month));
      const [y, m] = month.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
      if (existing) {
        updateBudgetPeriod(existing.id, {
          name: existing.name,
          amount,
          startDate: existing.startDate,
          endDate: existing.endDate,
        });
      } else {
        addBudgetPeriod({
          name: new Date(y, m - 1, 1).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          }),
          amount,
          startDate,
          endDate,
        });
      }
    },
    [budgets, updateBudgetPeriod, addBudgetPeriod]
  );

  const exportJson = useCallback(() => {
    return JSON.stringify(buildExportPayload(), null, 2);
  }, []);

  const importJson = useCallback((json: string) => {
    const payload = JSON.parse(json) as ExportPayload;
    applyImportPayload(payload);
    setCategories(loadCategories());
    setExpenses(loadExpenses());
    setBudgets(loadBudgets());
  }, []);

  const value = useMemo(
    () => ({
      ready,
      categories,
      expenses,
      budgets,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      removeCategory,
      updateCategoryBudgetFlag,
      addBudgetPeriod,
      updateBudgetPeriod,
      deleteBudgetPeriod,
      getActiveBudget,
      getBudgetForMonth,
      setMonthBudget,
      exportJson,
      importJson,
    }),
    [
      ready,
      categories,
      expenses,
      budgets,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      removeCategory,
      updateCategoryBudgetFlag,
      addBudgetPeriod,
      updateBudgetPeriod,
      deleteBudgetPeriod,
      getActiveBudget,
      getBudgetForMonth,
      setMonthBudget,
      exportJson,
      importJson,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
