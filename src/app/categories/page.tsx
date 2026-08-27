"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import Header from "@/components/Header";

const COLOR_PALETTE = [
  "#f97316",
  "#3b82f6",
  "#ec4899",
  "#eab308",
  "#a855f7",
  "#22c55e",
  "#64748b",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
];

export default function CategoriesPage() {
  const { ready, categories, expenses, addCategory, removeCategory, updateCategoryBudgetFlag } =
    useData();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [countsTowardBudget, setCountsTowardBudget] = useState(true);

  const usageCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) {
      counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [expenses]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory(name, color, countsTowardBudget);
    setName("");
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setCountsTowardBudget(true);
  };

  const handleRemove = (id: string, catName: string) => {
    const count = usageCount.get(id) ?? 0;
    const msg =
      count > 0
        ? `"${catName}" is used by ${count} expense(s). Remove it anyway? Those expenses will show as Uncategorized.`
        : `Remove category "${catName}"?`;
    if (window.confirm(msg)) {
      removeCategory(id);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-400">Loading…</div>
    );
  }

  return (
    <>
      <Header title="Categories" />
      <main className="flex-1 px-4 pt-4">
        <form onSubmit={handleAdd} className="mb-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-xs font-medium text-neutral-500">New category</label>
          <input
            type="text"
            placeholder="e.g. Groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Choose color ${c}`}
                className={`h-7 w-7 rounded-full ring-offset-2 ${
                  color === c ? "ring-2 ring-neutral-900 dark:ring-white" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={countsTowardBudget}
              onChange={(e) => setCountsTowardBudget(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            Counts toward monthly budget
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add Category
          </button>
        </form>

        <h2 className="mb-2 text-sm font-semibold text-neutral-500">
          Your categories ({categories.length})
        </h2>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">No categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="ml-2 text-xs text-neutral-400">
                      {usageCount.get(c.id) ?? 0} expense(s)
                    </span>
                    <label className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                      <input
                        type="checkbox"
                        checked={c.countsTowardBudget}
                        onChange={(e) => updateCategoryBudgetFlag(c.id, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Counts toward budget
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(c.id, c.name)}
                  aria-label="Remove category"
                  className="rounded-full p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
