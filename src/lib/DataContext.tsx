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
import { Budgets, Category, Expense, ExportPayload } from "./types";
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

// Key used in the budgets map to store the fallback amount applied to any
// month that doesn't have its own explicit budget set.
export const DEFAULT_BUDGET_KEY = "default";

type NewExpenseInput = {
  amount: number;
  shop: string;
  categoryId: string;
  date: string;
};

type DataContextValue = {
  ready: boolean;
  categories: Category[];
  expenses: Expense[];
  budgets: Budgets;
  addExpense: (input: NewExpenseInput) => void;
  updateExpense: (id: string, input: NewExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addCategory: (name: string, color: string, countsTowardBudget: boolean) => void;
  removeCategory: (id: string) => void;
  updateCategoryBudgetFlag: (id: string, countsTowardBudget: boolean) => void;
  setMonthBudget: (month: string, amount: number) => void;
  setDefaultBudget: (amount: number) => void;
  getBudgetForMonth: (month: string) => number;
  exportJson: () => string;
  importJson: (json: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budgets>({});

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
          ? { ...e, amount: input.amount, shop: input.shop, categoryId: input.categoryId, date: input.date }
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

  const removeCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCategoryBudgetFlag = useCallback((id: string, countsTowardBudget: boolean) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, countsTowardBudget } : c))
    );
  }, []);

  const setMonthBudget = useCallback((month: string, amount: number) => {
    setBudgets((prev) => ({ ...prev, [month]: amount }));
  }, []);

  const setDefaultBudget = useCallback((amount: number) => {
    setBudgets((prev) => ({ ...prev, [DEFAULT_BUDGET_KEY]: amount }));
  }, []);

  const getBudgetForMonth = useCallback(
    (month: string) => budgets[month] ?? budgets[DEFAULT_BUDGET_KEY] ?? 0,
    [budgets]
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
      removeCategory,
      updateCategoryBudgetFlag,
      setMonthBudget,
      setDefaultBudget,
      getBudgetForMonth,
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
      removeCategory,
      updateCategoryBudgetFlag,
      setMonthBudget,
      setDefaultBudget,
      getBudgetForMonth,
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
