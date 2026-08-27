"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import Header from "@/components/Header";

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HomePage() {
  const { ready, categories, expenses, addExpense, deleteExpense } = useData();

  const [amount, setAmount] = useState("");
  const [shop, setShop] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(() => toDatetimeLocal(new Date()));
  const [error, setError] = useState("");

  const activeCategoryId = categoryId || categories[0]?.id || "";

  const recent = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15),
    [expenses]
  );

  const categoryById = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c]));
    return map;
  }, [categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!activeCategoryId) {
      setError("Add a category first (Categories tab).");
      return;
    }
    addExpense({
      amount: amt,
      shop: shop.trim() || "Untitled",
      categoryId: activeCategoryId,
      date: new Date(date).toISOString(),
    });
    setAmount("");
    setShop("");
    setDate(toDatetimeLocal(new Date()));
    setError("");
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-400">Loading…</div>
    );
  }

  return (
    <>
      <Header title="Add Expense" />
      <main className="flex-1 px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Amount</label>
            <div className="flex items-center rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900">
              <span className="mr-1 text-xl text-neutral-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-semibold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Shop / Merchant</label>
            <input
              type="text"
              placeholder="e.g. Starbucks"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Category</label>
            {categories.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No categories yet. Add one in the Categories tab.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = c.id === activeCategoryId;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCategoryId(c.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "border-transparent text-white"
                          : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                      }`}
                      style={active ? { backgroundColor: c.color } : undefined}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Date & Time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow hover:bg-indigo-700 active:scale-[0.99]"
          >
            Save Expense
          </button>
        </form>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Recent</h2>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">No expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((exp) => {
                const cat = categoryById.get(exp.categoryId);
                return (
                  <li
                    key={exp.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat?.color ?? "#999" }}
                      />
                      <div>
                        <p className="text-sm font-medium">{exp.shop}</p>
                        <p className="text-xs text-neutral-400">
                          {cat?.name ?? "Uncategorized"} · {new Date(exp.date).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">${formatMoney(exp.amount)}</span>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        aria-label="Delete"
                        className="rounded-full p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
