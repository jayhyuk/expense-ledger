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
  name: string; // e.g. "Living Essentials", "Fun & Leisure"
  amount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  categoryIds?: string[]; // IDs of categories covered by this budget group. If omitted, covers all budgeted categories.
};

export type BudgetGroup = BudgetPeriod;
export type Budgets = BudgetPeriod[];

export type ExportPayload = {
  version: 2 | 3;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
  budgets: BudgetPeriod[] | Record<string, number>;
};
