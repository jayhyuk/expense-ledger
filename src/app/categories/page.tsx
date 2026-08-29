"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import Header from "@/components/Header";
import { Category } from "@/lib/types";

const COLOR_PALETTE = [
  "#f97316", // Orange
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#eab308", // Yellow
  "#a855f7", // Purple
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#f43f5e", // Rose
  "#6366f1", // Indigo
  "#84cc16", // Lime
  "#d97706", // Amber
  "#64748b", // Slate
  "#0ea5e9", // Sky
];

export default function CategoriesPage() {
  const {
    ready,
    categories,
    expenses,
    addCategory,
    updateCategory,
    removeCategory,
    updateCategoryBudgetFlag,
  } = useData();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [countsTowardBudget, setCountsTowardBudget] = useState(true);

  // Edit modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editBudgetFlag, setEditBudgetFlag] = useState(true);

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

  const startEdit = (c: Category) => {
    setEditingCategory(c);
    setEditName(c.name);
    setEditColor(c.color);
    setEditBudgetFlag(c.countsTowardBudget);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;
    updateCategory(editingCategory.id, {
      name: editName.trim(),
      color: editColor,
      countsTowardBudget: editBudgetFlag,
    });
    setEditingCategory(null);
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
      <main className="flex-1 px-4 pt-4 pb-8">
        <form
          onSubmit={handleAdd}
          className="mb-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            New category
          </label>
          <input
            type="text"
            placeholder="e.g. Groceries, Rent, Coffee"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
          />

          <div>
            <span className="mb-1.5 block text-xs font-medium text-neutral-500">
              Color in graphs & tags
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Choose color ${c}`}
                  className={`h-7 w-7 rounded-full transition-transform active:scale-95 ${
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-neutral-900 ring-offset-2 dark:ring-white"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label
                className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-xs text-neutral-600 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                title="Custom color picker"
              >
                🎨
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={countsTowardBudget}
              onChange={(e) => setCountsTowardBudget(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            Counts toward budget
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.99]"
          >
            Add Category
          </button>
        </form>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
            Your categories ({categories.length})
          </h2>
          <span className="text-xs text-neutral-400">Click color or edit to customize</span>
        </div>

        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">No categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="group relative flex h-6 w-6 items-center justify-center rounded-full shadow-sm ring-1 ring-black/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: c.color }}
                    title="Click to change color"
                  >
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-white drop-shadow">
                      ✎
                    </span>
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="text-xs text-neutral-400">
                        {usageCount.get(c.id) ?? 0} expense(s)
                      </span>
                    </div>
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
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

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(c)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(c.id, c.name)}
                    aria-label="Remove category"
                    className="rounded-full p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">Edit Category</h3>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                    Category Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-7 w-7 rounded-full transition-transform active:scale-95 ${
                          editColor.toLowerCase() === c.toLowerCase()
                            ? "ring-2 ring-neutral-900 ring-offset-2 dark:ring-white"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label
                      className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-xs text-neutral-600 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      title="Custom color picker"
                    >
                      🎨
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: editColor }}
                    />
                    <span className="font-mono text-xs text-neutral-500 uppercase">{editColor}</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={editBudgetFlag}
                    onChange={(e) => setEditBudgetFlag(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Counts toward budget
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
