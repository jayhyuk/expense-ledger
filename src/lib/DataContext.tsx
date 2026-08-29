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
import { Budget, Category, Expense, ExportPayload, SalaryPeriod } from "./types";
import {
  applyImportPayload,
  buildExportPayload,
  DEFAULT_CATEGORIES,
  genId,
  loadBudgets,
  loadCategories,
  loadExpenses,
  loadSalaryPeriods,
  saveBudgets,
  saveCategories,
  saveExpenses,
  saveSalaryPeriods,
} from "./storage";
import { isDateInRange, toLocalDateString } from "./dateUtils";

type NewExpenseInput = {
  amount: number;
  shop: string;
  categoryId: string;
  date: string;
};

type NewSalaryPeriodInput = {
  name?: string;
  startDate: string;
  endDate: string;
};

type NewBudgetInput = {
  periodId: string;
  name: string;
  amount: number;
  categoryIds?: string[];
};

type DataContextValue = {
  ready: boolean;
  categories: Category[];
  expenses: Expense[];
  salaryPeriods: SalaryPeriod[];
  budgets: Budget[];

  // Expense CRUD
  addExpense: (input: NewExpenseInput) => void;
  updateExpense: (id: string, input: NewExpenseInput) => void;
  deleteExpense: (id: string) => void;

  // Category CRUD
  addCategory: (name: string, color: string, countsTowardBudget: boolean) => void;
  updateCategory: (
    id: string,
    updates: { name?: string; color?: string; countsTowardBudget?: boolean }
  ) => void;
  removeCategory: (id: string) => void;
  updateCategoryBudgetFlag: (id: string, countsTowardBudget: boolean) => void;

  // SalaryPeriod CRUD
  addSalaryPeriod: (input: NewSalaryPeriodInput) => SalaryPeriod;
  updateSalaryPeriod: (id: string, input: NewSalaryPeriodInput) => void;
  deleteSalaryPeriod: (id: string) => void;
  getActiveSalaryPeriod: (dateIsoOrStr?: string) => SalaryPeriod | undefined;

  // Budget CRUD
  addBudget: (input: NewBudgetInput) => Budget;
  updateBudget: (id: string, input: Partial<NewBudgetInput>) => void;
  deleteBudget: (id: string) => void;
  getBudgetsForPeriod: (periodId: string) => Budget[];

  exportJson: () => string;
  importJson: (json: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaryPeriods, setSalaryPeriods] = useState<SalaryPeriod[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    const loadedCategories = loadCategories();
    const loadedExpenses = loadExpenses();
    const loadedPeriods = loadSalaryPeriods();
    const loadedBudgets = loadBudgets(loadedPeriods);

    // Loading localStorage is the provider's external-store initialization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategories(loadedCategories);
    setExpenses(loadedExpenses);
    setSalaryPeriods(loadedPeriods);
    setBudgets(loadedBudgets);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);

  useEffect(() => {
    if (ready) saveExpenses(expenses);
  }, [expenses, ready]);

  useEffect(() => {
    if (ready) saveSalaryPeriods(salaryPeriods);
  }, [salaryPeriods, ready]);

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

  // SalaryPeriod CRUD
  const addSalaryPeriod = useCallback((input: NewSalaryPeriodInput): SalaryPeriod => {
    const newPeriod: SalaryPeriod = {
      id: genId(),
      name: input.name?.trim() || `${input.startDate} – ${input.endDate}`,
      startDate: input.startDate,
      endDate: input.endDate,
    };
    setSalaryPeriods((prev) => {
      const next = [newPeriod, ...prev];
      next.sort((a, b) => b.startDate.localeCompare(a.startDate));
      return next;
    });
    return newPeriod;
  }, []);

  const updateSalaryPeriod = useCallback((id: string, input: NewSalaryPeriodInput) => {
    setSalaryPeriods((prev) => {
      const next = prev.map((p) =>
        p.id === id
          ? {
              ...p,
              name: input.name?.trim() || `${input.startDate} – ${input.endDate}`,
              startDate: input.startDate,
              endDate: input.endDate,
            }
          : p
      );
      next.sort((a, b) => b.startDate.localeCompare(a.startDate));
      return next;
    });
  }, []);

  const deleteSalaryPeriod = useCallback((id: string) => {
    setSalaryPeriods((prev) => prev.filter((p) => p.id !== id));
    // Also remove budgets under this period
    setBudgets((prev) => prev.filter((b) => b.periodId !== id));
  }, []);

  const getActiveSalaryPeriod = useCallback(
    (dateIsoOrStr?: string): SalaryPeriod | undefined => {
      if (salaryPeriods.length === 0) return undefined;
      const targetDate = dateIsoOrStr || toLocalDateString(new Date());
      const enclosing = salaryPeriods.find((p) => isDateInRange(targetDate, p.startDate, p.endDate));
      if (enclosing) return enclosing;
      return salaryPeriods[0];
    },
    [salaryPeriods]
  );

  // Budget CRUD
  const addBudget = useCallback((input: NewBudgetInput): Budget => {
    const newBudget: Budget = {
      id: genId(),
      periodId: input.periodId,
      name: input.name.trim() || "Budget",
      amount: input.amount,
      categoryIds: input.categoryIds,
    };
    setBudgets((prev) => [...prev, newBudget]);
    return newBudget;
  }, []);

  const updateBudget = useCallback((id: string, input: Partial<NewBudgetInput>) => {
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          ...(input.periodId ? { periodId: input.periodId } : {}),
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.categoryIds !== undefined ? { categoryIds: input.categoryIds } : {}),
        };
      })
    );
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const getBudgetsForPeriod = useCallback(
    (periodId: string): Budget[] => {
      return budgets.filter((b) => b.periodId === periodId);
    },
    [budgets]
  );

  // Legacy helper mappings
  const exportJson = useCallback(() => {
    return JSON.stringify(buildExportPayload(), null, 2);
  }, []);

  const importJson = useCallback((json: string) => {
    const payload = JSON.parse(json) as ExportPayload;
    applyImportPayload(payload);
    const loadedCategories = loadCategories();
    const loadedExpenses = loadExpenses();
    const loadedPeriods = loadSalaryPeriods();
    const loadedBudgets = loadBudgets(loadedPeriods);
    setCategories(loadedCategories);
    setExpenses(loadedExpenses);
    setSalaryPeriods(loadedPeriods);
    setBudgets(loadedBudgets);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      categories,
      expenses,
      salaryPeriods,
      budgets,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      removeCategory,
      updateCategoryBudgetFlag,
      addSalaryPeriod,
      updateSalaryPeriod,
      deleteSalaryPeriod,
      getActiveSalaryPeriod,
      addBudget,
      updateBudget,
      deleteBudget,
      getBudgetsForPeriod,
      exportJson,
      importJson,
    }),
    [
      ready,
      categories,
      expenses,
      salaryPeriods,
      budgets,
      addExpense,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      removeCategory,
      updateCategoryBudgetFlag,
      addSalaryPeriod,
      updateSalaryPeriod,
      deleteSalaryPeriod,
      getActiveSalaryPeriod,
      addBudget,
      updateBudget,
      deleteBudget,
      getBudgetsForPeriod,
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
