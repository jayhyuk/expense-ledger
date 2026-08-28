"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import { budgetedSpendForMonth, formatMoney, monthKey } from "@/lib/dateUtils";

export default function BudgetCard() {
  const { categories, expenses, getBudgetForMonth, setMonthBudget } = useData();
  const currentMonth = monthKey(new Date().toISOString());
  const budget = getBudgetForMonth(currentMonth);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budget || ""));

  const spent = useMemo(
    () => budgetedSpendForMonth(expenses, categories, currentMonth),
    [expenses, categories, currentMonth]
  );

  const hasBudgetedCategories = categories.some((c) => c.countsTowardBudget);
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;

  const handleSave = () => {
    const amt = parseFloat(draft);
    setMonthBudget(currentMonth, isNaN(amt) || amt < 0 ? 0 : amt);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Monthly budget for this month
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-neutral-300 px-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (budget <= 0) {
    return (
      <button
        onClick={() => {
          setDraft("");
          setEditing(true);
        }}
        className="mb-4 w-full rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-3 text-left text-sm text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        + Set a monthly budget
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-500">Monthly budget</h2>
        <button
          onClick={() => {
            setDraft(String(budget));
            setEditing(true);
          }}
          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Edit
        </button>
      </div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className={`text-xl font-bold ${over ? "text-red-600" : ""}`}>
          ฿{formatMoney(remaining)}
          <span className="ml-1 text-xs font-normal text-neutral-400">
            {over ? "over budget" : "remaining"}
          </span>
        </span>
        <span className="text-xs text-neutral-400">
          ฿{formatMoney(spent)} / ฿{formatMoney(budget)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-indigo-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!hasBudgetedCategories && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          No categories are set to count toward budget. Configure this in Categories.
        </p>
      )}
    </div>
  );
}
