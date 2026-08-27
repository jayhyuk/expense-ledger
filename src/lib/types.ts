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

// Monthly budget amounts keyed by "YYYY-MM". A special "default" key holds
// the fallback amount used for any month without an explicit override.
export type Budgets = Record<string, number>;

export type ExportPayload = {
  version: 2;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
  budgets: Budgets;
};
