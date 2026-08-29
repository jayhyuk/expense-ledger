export type Category = {
  id: string;
  name: string;
  color: string;
  countsTowardBudget: boolean;
};

export type Expense = {
  id: string;
  amount: number;
  shop: string;
  categoryId: string;
  date: string; // ISO datetime string, editable by user
  createdAt: string; // ISO datetime string, when the record was created
};

export type BudgetPeriod = {
  id: string;
  name: string; // e.g. "Aug 25 - Sep 24" or "September Salary"
  amount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type Budgets = BudgetPeriod[];

export type ExportPayload = {
  version: 2 | 3;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
  budgets: BudgetPeriod[] | Record<string, number>;
};
