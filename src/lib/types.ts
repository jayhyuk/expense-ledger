export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Expense = {
  id: string;
  amount: number;
  shop: string;
  categoryId: string;
  date: string; // ISO datetime string, editable by user
  createdAt: string; // ISO datetime string, when the record was created
};

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
};
