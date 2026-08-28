"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useData } from "@/lib/DataContext";
import Header from "@/components/Header";
import { Expense } from "@/lib/types";
import { formatMoney, monthKey, shiftMonth } from "@/lib/dateUtils";

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

const TREND_MONTHS = 6;

export default function ReportPage() {
  const { ready, categories, expenses, getBudgetForMonth } = useData();
  const [monthCursor, setMonthCursor] = useState(() => monthKey(new Date().toISOString()));

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const monthlyTotals = useMemo(() => {
    const byMonth = new Map<string, Map<string, number>>();
    for (const e of expenses as Expense[]) {
      const mk = monthKey(e.date);
      if (!byMonth.has(mk)) byMonth.set(mk, new Map());
      const catMap = byMonth.get(mk)!;
      catMap.set(e.categoryId, (catMap.get(e.categoryId) ?? 0) + e.amount);
    }
    return byMonth;
  }, [expenses]);

  const pieData = useMemo(() => {
    const catMap = monthlyTotals.get(monthCursor) ?? new Map<string, number>();
    return Array.from(catMap.entries())
      .map(([categoryId, total]) => ({
        categoryId,
        name: categoryById.get(categoryId)?.name ?? "Uncategorized",
        color: categoryById.get(categoryId)?.color ?? "#94a3b8",
        value: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyTotals, monthCursor, categoryById]);

  const monthTotal = pieData.reduce((sum, d) => sum + d.value, 0);

  const budgetAmount = getBudgetForMonth(monthCursor);
  const budgetSpent = useMemo(
    () =>
      pieData
        .filter((d) => categoryById.get(d.categoryId)?.countsTowardBudget)
        .reduce((sum, d) => sum + d.value, 0),
    [pieData, categoryById]
  );
  const budgetRemaining = budgetAmount - budgetSpent;
  const budgetOver = budgetAmount > 0 && budgetSpent > budgetAmount;
  const budgetPct = budgetAmount > 0 ? Math.min(100, Math.round((budgetSpent / budgetAmount) * 100)) : 0;

  const prevMonthTotal = useMemo(() => {
    const prevKey = shiftMonth(monthCursor, -1);
    const catMap = monthlyTotals.get(prevKey) ?? new Map<string, number>();
    return Array.from(catMap.values()).reduce((s, v) => s + v, 0);
  }, [monthlyTotals, monthCursor]);

  const trendMonths = useMemo(() => {
    const keys: string[] = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) keys.push(shiftMonth(monthCursor, -i));
    return keys;
  }, [monthCursor]);

  const trendData = useMemo(() => {
    return trendMonths.map((mk) => {
      const catMap = monthlyTotals.get(mk) ?? new Map<string, number>();
      const row: Record<string, string | number> = { month: monthLabel(mk) };
      for (const c of categories) {
        row[c.name] = Math.round((catMap.get(c.id) ?? 0) * 100) / 100;
      }
      return row;
    });
  }, [trendMonths, monthlyTotals, categories]);

  const categoryChange = useMemo(() => {
    const prevKey = shiftMonth(monthCursor, -1);
    const curMap = monthlyTotals.get(monthCursor) ?? new Map<string, number>();
    const prevMap = monthlyTotals.get(prevKey) ?? new Map<string, number>();
    const ids = new Set([...curMap.keys(), ...prevMap.keys()]);
    return Array.from(ids)
      .map((id) => {
        const cur = curMap.get(id) ?? 0;
        const prev = prevMap.get(id) ?? 0;
        const diff = cur - prev;
        const pct = prev > 0 ? (diff / prev) * 100 : cur > 0 ? 100 : 0;
        return {
          id,
          name: categoryById.get(id)?.name ?? "Uncategorized",
          color: categoryById.get(id)?.color ?? "#94a3b8",
          cur,
          prev,
          diff,
          pct,
        };
      })
      .filter((r) => r.cur > 0 || r.prev > 0)
      .sort((a, b) => b.cur - a.cur);
  }, [monthlyTotals, monthCursor, categoryById]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-400">Loading…</div>
    );
  }

  const isCurrentMonth = monthCursor === monthKey(new Date().toISOString());

  return (
    <>
      <Header title="Report" />
      <main className="flex-1 px-4 pt-4 pb-6">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => setMonthCursor((m) => shiftMonth(m, -1))}
            className="rounded-full px-3 py-1 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="font-semibold">{monthLabel(monthCursor)}</span>
          <button
            onClick={() => setMonthCursor((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
            className="rounded-full px-3 py-1 text-lg hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {budgetAmount > 0 && (
          <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-neutral-500">Budget</h2>
              <span className={`text-lg font-bold ${budgetOver ? "text-red-600" : ""}`}>
                ฿{formatMoney(budgetRemaining)}
                <span className="ml-1 text-xs font-normal text-neutral-400">
                  {budgetOver ? "over" : "left"}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full ${budgetOver ? "bg-red-500" : "bg-indigo-600"}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              ฿{formatMoney(budgetSpent)} spent of ฿{formatMoney(budgetAmount)} (budgeted categories only)
            </p>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-neutral-500">Spending by category</h2>
            <span className="text-lg font-bold">฿{formatMoney(monthTotal)}</span>
          </div>
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">No expenses this month.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `฿${formatMoney(Number(v))}`} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1">
                {pieData.map((d) => (
                  <li key={d.categoryId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-neutral-500">
                      ฿{formatMoney(d.value)} · {monthTotal > 0 ? Math.round((d.value / monthTotal) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {prevMonthTotal > 0 && (
            <p className="mt-3 text-xs text-neutral-400">
              Previous month total: ฿{formatMoney(prevMonthTotal)}
            </p>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">
            Category trend (last {TREND_MONTHS} months)
          </h2>
          {categories.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">No categories to chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip formatter={(v) => `฿${formatMoney(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {categories.map((c) => (
                  <Bar key={c.id} dataKey={c.name} stackId="a" fill={c.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">
            Change vs previous month
          </h2>
          {categoryChange.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">Not enough data yet.</p>
          ) : (
            <ul className="space-y-2">
              {categoryChange.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-neutral-500">฿{formatMoney(r.cur)}</span>
                    <span
                      className={`text-xs font-semibold ${
                        r.diff > 0
                          ? "text-red-500"
                          : r.diff < 0
                          ? "text-green-600"
                          : "text-neutral-400"
                      }`}
                    >
                      {r.diff === 0 ? "—" : `${r.diff > 0 ? "▲" : "▼"} ${Math.abs(Math.round(r.pct))}%`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
