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

export type SalaryPeriod = {
  id: string;
  name: string; // e.g. "Aug 25 – Sep 24" or "September Salary"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type Budget = {
  id: string;
  periodId: string; // References SalaryPeriod.id
  name: string; // e.g. "Food & Groceries", "Living Essentials", "Fun & Shopping", "Overall"
  amount: number;
  categoryIds?: string[]; // IDs of categories covered. If empty, covers all categories.
};

// Aliases for backward compatibility
export type BudgetPeriod = SalaryPeriod;
export type BudgetGroup = Budget;
export type Budgets = Budget[];

export type ExportPayload = {
  version: 2 | 3 | 4;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
  salaryPeriods?: SalaryPeriod[];
  budgets?: Budget[] | Record<string, number>;
};
