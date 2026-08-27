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
import { Category, Expense, ExportPayload } from "./types";
import {
  applyImportPayload,
  buildExportPayload,
  DEFAULT_CATEGORIES,
  genId,
  loadCategories,
  loadExpenses,
  saveCategories,
  saveExpenses,
} from "./storage";

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
  addExpense: (input: NewExpenseInput) => void;
  updateExpense: (id: string, input: NewExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addCategory: (name: string, color: string) => void;
  removeCategory: (id: string) => void;
  exportJson: () => string;
  importJson: (json: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    setCategories(loadCategories());
    setExpenses(loadExpenses());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);

  useEffect(() => {
    if (ready) saveExpenses(expenses);
  }, [expenses, ready]);

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

  const addCategory = useCallback((name: string, color: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => [
      ...prev,
      { id: genId(), name: trimmed, color },
    ]);
  }, []);

  const removeCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const exportJson = useCallback(() => {
    return JSON.stringify(buildExportPayload(), null, 2);
  }, []);

  const importJson = useCallback((json: string) => {
    const payload = JSON.parse(json) as ExportPayload;
    applyImportPayload(payload);
    setCategories(payload.categories);
    setExpenses(payload.expenses);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      categories,
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      removeCategory,
      exportJson,
      importJson,
    }),
    [ready, categories, expenses, addExpense, updateExpense, deleteExpense, addCategory, removeCategory, exportJson, importJson]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
