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
import { BudgetPeriod, Expense } from "@/lib/types";
import {
  formatDateRange,
  formatMoney,
  getCoveredCategories,
  isDateInRange,
  monthKey,
  shiftMonth,
  toLocalDateString,
} from "@/lib/dateUtils";

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

const TREND_PERIODS = 6;

export default function ReportPage() {
  const { ready, categories, expenses, budgets, getActiveBudget } = useData();

  // Mode: "period" (Custom Budget Group) or "month" (Calendar Month)
  const [viewMode, setViewMode] = useState<"period" | "month">(() =>
    budgets.length > 0 ? "period" : "month"
  );

  // Selected budget group ID (if in "period" mode)
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(() => {
    const active = getActiveBudget();
    return active?.id || budgets[0]?.id || "";
  });

  // Selected calendar month (if in "month" mode)
  const [monthCursor, setMonthCursor] = useState(() => monthKey(new Date().toISOString()));

  // Expandable categories set
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Current active budget group object if in period mode
  const currentBudgetPeriod: BudgetPeriod | undefined = useMemo(() => {
    if (viewMode === "period" && budgets.length > 0) {
      return budgets.find((b) => b.id === selectedBudgetId) || budgets[0];
    }
    return undefined;
  }, [viewMode, budgets, selectedBudgetId]);

  // Covered categories for the selected budget group
  const coveredCategories = useMemo(() => {
    if (viewMode === "period" && currentBudgetPeriod) {
      return getCoveredCategories(currentBudgetPeriod, categories);
    }
    return categories;
  }, [viewMode, currentBudgetPeriod, categories]);

  const coveredCategoryIds = useMemo(
    () => new Set(coveredCategories.map((c) => c.id)),
    [coveredCategories]
  );

  // Determine current active date range
  const { startDate, endDate, periodLabel, budgetAmount } = useMemo(() => {
    if (viewMode === "period" && currentBudgetPeriod) {
      return {
        startDate: currentBudgetPeriod.startDate,
        endDate: currentBudgetPeriod.endDate,
        periodLabel: currentBudgetPeriod.name,
        budgetAmount: currentBudgetPeriod.amount,
      };
    }
    // Calendar month mode
    const [y, m] = monthCursor.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${monthCursor}-01`;
    const end = `${monthCursor}-${String(lastDay).padStart(2, "0")}`;
    const matchingBudget = budgets.find((b) => isDateInRange(start, b.startDate, b.endDate));

    return {
      startDate: start,
      endDate: end,
      periodLabel: new Date(y, m - 1, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      budgetAmount: matchingBudget ? matchingBudget.amount : 0,
    };
  }, [viewMode, currentBudgetPeriod, monthCursor, budgets]);

  // Expenses strictly in the current date range and covered categories
  const periodExpenses = useMemo(() => {
    return (expenses as Expense[]).filter(
      (e) =>
        isDateInRange(e.date, startDate, endDate) &&
        (viewMode === "month" || coveredCategoryIds.has(e.categoryId))
    );
  }, [expenses, startDate, endDate, viewMode, coveredCategoryIds]);

  // Expenses grouped by Category ID
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of periodExpenses) {
      const list = map.get(e.categoryId) || [];
      list.push(e);
      map.set(e.categoryId, list);
    }
    // Sort each category's expenses newest first
    for (const list of map.values()) {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return map;
  }, [periodExpenses]);

  // Pie chart data + category items
  const pieData = useMemo(() => {
    const data = [];
    for (const [categoryId, items] of expensesByCategory.entries()) {
      const total = items.reduce((sum, e) => sum + e.amount, 0);
      const cat = categoryById.get(categoryId);
      data.push({
        categoryId,
        name: cat?.name ?? "Uncategorized",
        color: cat?.color ?? "#94a3b8",
        countsTowardBudget: cat?.countsTowardBudget ?? true,
        value: Math.round(total * 100) / 100,
        items,
        count: items.length,
      });
    }
    return data.sort((a, b) => b.value - a.value);
  }, [expensesByCategory, categoryById]);

  const monthTotal = useMemo(() => pieData.reduce((sum, d) => sum + d.value, 0), [pieData]);

  const budgetSpent = useMemo(
    () =>
      viewMode === "period"
        ? monthTotal
        : pieData.filter((d) => d.countsTowardBudget).reduce((sum, d) => sum + d.value, 0),
    [viewMode, monthTotal, pieData]
  );
  const budgetRemaining = budgetAmount - budgetSpent;
  const budgetOver = budgetAmount > 0 && budgetSpent > budgetAmount;
  const budgetPct =
    budgetAmount > 0 ? Math.min(100, Math.round((budgetSpent / budgetAmount) * 100)) : 0;

  // Previous period calculation for comparison
  const { prevTotal, prevCategoryTotals } = useMemo(() => {
    let pStart = "";
    let pEnd = "";
    if (viewMode === "period" && currentBudgetPeriod) {
      const idx = budgets.findIndex((b) => b.id === currentBudgetPeriod.id);
      if (idx >= 0 && idx < budgets.length - 1) {
        pStart = budgets[idx + 1].startDate;
        pEnd = budgets[idx + 1].endDate;
      } else {
        const [sy, sm, sd] = currentBudgetPeriod.startDate.split("-").map(Number);
        const [ey, em, ed] = currentBudgetPeriod.endDate.split("-").map(Number);
        const prevStartObj = new Date(sy, sm - 2, sd);
        const prevEndObj = new Date(ey, em - 2, ed);
        pStart = toLocalDateString(prevStartObj);
        pEnd = toLocalDateString(prevEndObj);
      }
    } else {
      const prevKey = shiftMonth(monthCursor, -1);
      const [y, m] = prevKey.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      pStart = `${prevKey}-01`;
      pEnd = `${prevKey}-${String(lastDay).padStart(2, "0")}`;
    }

    const prevExp = (expenses as Expense[]).filter(
      (e) =>
        isDateInRange(e.date, pStart, pEnd) &&
        (viewMode === "month" || coveredCategoryIds.has(e.categoryId))
    );
    const prevCatMap = new Map<string, number>();
    let total = 0;
    for (const e of prevExp) {
      total += e.amount;
      prevCatMap.set(e.categoryId, (prevCatMap.get(e.categoryId) ?? 0) + e.amount);
    }
    return { prevTotal: total, prevCategoryTotals: prevCatMap };
  }, [viewMode, currentBudgetPeriod, budgets, monthCursor, expenses, coveredCategoryIds]);

  // Trend data across periods/months
  const trendData = useMemo(() => {
    if (viewMode === "period" && budgets.length > 0) {
      const slice = [...budgets].slice(0, TREND_PERIODS).reverse();
      return slice.map((b) => {
        const bCoveredIds = new Set(getCoveredCategories(b, categories).map((c) => c.id));
        const bExp = (expenses as Expense[]).filter(
          (e) => isDateInRange(e.date, b.startDate, b.endDate) && bCoveredIds.has(e.categoryId)
        );
        const catMap = new Map<string, number>();
        for (const e of bExp) catMap.set(e.categoryId, (catMap.get(e.categoryId) ?? 0) + e.amount);
        const row: Record<string, string | number> = {
          name: b.name.length > 12 ? b.name.slice(0, 12) + "…" : b.name,
        };
        for (const c of categories) {
          if (bCoveredIds.has(c.id)) {
            row[c.name] = Math.round((catMap.get(c.id) ?? 0) * 100) / 100;
          }
        }
        return row;
      });
    }

    // Monthly trend
    const keys: string[] = [];
    for (let i = TREND_PERIODS - 1; i >= 0; i--) keys.push(shiftMonth(monthCursor, -i));
    return keys.map((mk) => {
      const [y, m] = mk.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const s = `${mk}-01`;
      const end = `${mk}-${String(lastDay).padStart(2, "0")}`;
      const mExp = (expenses as Expense[]).filter((e) => isDateInRange(e.date, s, end));
      const catMap = new Map<string, number>();
      for (const e of mExp) catMap.set(e.categoryId, (catMap.get(e.categoryId) ?? 0) + e.amount);
      const row: Record<string, string | number> = { name: monthLabel(mk) };
      for (const c of categories) {
        row[c.name] = Math.round((catMap.get(c.id) ?? 0) * 100) / 100;
      }
      return row;
    });
  }, [viewMode, budgets, monthCursor, expenses, categories]);

  // Category changes vs previous period
  const categoryChange = useMemo(() => {
    const curCatMap = new Map(pieData.map((d) => [d.categoryId, d.value]));
    const ids = new Set([...curCatMap.keys(), ...prevCategoryTotals.keys()]);
    return Array.from(ids)
      .map((id) => {
        const cur = curCatMap.get(id) ?? 0;
        const prev = prevCategoryTotals.get(id) ?? 0;
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
  }, [pieData, prevCategoryTotals, categoryById]);

  // Accordion toggle helpers
  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(pieData.map((d) => d.categoryId)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Step through budget periods
  const handleStepPeriod = (direction: -1 | 1) => {
    if (viewMode === "period" && budgets.length > 0) {
      const curIdx = budgets.findIndex((b) => b.id === selectedBudgetId);
      const nextIdx = curIdx - direction;
      if (nextIdx >= 0 && nextIdx < budgets.length) {
        setSelectedBudgetId(budgets[nextIdx].id);
      }
    } else {
      setMonthCursor((m) => shiftMonth(m, direction));
    }
  };

  const canStepNewer =
    viewMode === "period"
      ? budgets.findIndex((b) => b.id === selectedBudgetId) > 0
      : monthCursor < monthKey(new Date().toISOString());

  const canStepOlder =
    viewMode === "period"
      ? budgets.findIndex((b) => b.id === selectedBudgetId) < budgets.length - 1
      : true;

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-400">Loading…</div>
    );
  }

  return (
    <>
      <Header title="Report" />
      <main className="flex-1 px-4 pt-4 pb-10">
        {/* Mode Selector Tab */}
        {budgets.length > 0 && (
          <div className="mb-3 flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              onClick={() => {
                setViewMode("period");
                if (!selectedBudgetId && budgets[0]) setSelectedBudgetId(budgets[0].id);
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                viewMode === "period"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-neutral-900 dark:text-indigo-400"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              📅 Budget Groups
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-neutral-900 dark:text-indigo-400"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              📆 Calendar Months
            </button>
          </div>
        )}

        {/* Period Navigation Bar */}
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleStepPeriod(-1)}
              disabled={!canStepOlder}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
              aria-label="Previous period"
            >
              ‹
            </button>

            <div className="text-center">
              {viewMode === "period" && budgets.length > 1 ? (
                <div className="flex flex-col items-center">
                  <select
                    value={selectedBudgetId}
                    onChange={(e) => setSelectedBudgetId(e.target.value)}
                    className="max-w-[220px] truncate rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {budgets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-0.5 text-[11px] text-neutral-400">
                    {formatDateRange(startDate, endDate)}
                  </span>
                </div>
              ) : (
                <div>
                  <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {periodLabel}
                  </h2>
                  <span className="text-[11px] text-neutral-400">
                    {formatDateRange(startDate, endDate)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleStepPeriod(1)}
              disabled={!canStepNewer}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
              aria-label="Next period"
            >
              ›
            </button>
          </div>

          {/* Group covered category chips in report header */}
          {viewMode === "period" && coveredCategories.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
              <span className="text-[10px] text-neutral-400">Includes:</span>
              {coveredCategories.map((c) => (
                <span
                  key={c.id}
                  className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Budget Summary Card */}
        {budgetAmount > 0 && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {viewMode === "period" ? "Group Budget" : "Monthly Budget"}
              </h2>
              <span className={`text-lg font-bold ${budgetOver ? "text-red-600" : ""}`}>
                ฿{formatMoney(budgetRemaining)}
                <span className="ml-1 text-xs font-normal text-neutral-400">
                  {budgetOver ? "over" : "left"}
                </span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetOver ? "bg-red-500" : budgetPct > 85 ? "bg-amber-500" : "bg-indigo-600"
                }`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-400">
              ฿{formatMoney(budgetSpent)} spent of ฿{formatMoney(budgetAmount)} (
              {viewMode === "period" ? "group categories" : "budgeted categories"})
            </p>
          </div>
        )}

        {/* Spending by Category with Expandable Item Breakdown */}
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Spending by Category
              </h2>
              <p className="text-xs text-neutral-400">{periodExpenses.length} expense(s) total</p>
            </div>
            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              ฿{formatMoney(monthTotal)}
            </span>
          </div>

          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              No expenses recorded in this budget group / period.
            </p>
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
                    onClick={(entry: unknown) => {
                      if (entry && typeof entry === "object" && "categoryId" in entry) {
                        toggleCategoryExpand(String((entry as { categoryId: string }).categoryId));
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.color}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `฿${formatMoney(Number(v))}`} />
                </PieChart>
              </ResponsiveContainer>

              {/* Accordion Controls */}
              <div className="mt-3 mb-2 flex items-center justify-between border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
                <span className="text-xs font-medium text-neutral-400">
                  Tap category to view items
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Expand All
                  </button>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <button
                    onClick={collapseAll}
                    className="text-[11px] font-semibold text-neutral-500 hover:underline dark:text-neutral-400"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Category Breakdown & Item List */}
              <div className="space-y-2">
                {pieData.map((d) => {
                  const isExpanded = expandedCategories.has(d.categoryId);
                  return (
                    <div
                      key={d.categoryId}
                      className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50/50 transition-colors dark:border-neutral-800 dark:bg-neutral-800/40"
                    >
                      {/* Header row */}
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand(d.categoryId)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-neutral-100/70 dark:hover:bg-neutral-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full shadow-sm"
                            style={{ backgroundColor: d.color }}
                          />
                          <div>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {d.name}
                            </span>
                            <span className="ml-2 text-xs text-neutral-400 font-normal">
                              ({d.count} item{d.count > 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-right font-medium">
                            ฿{formatMoney(d.value)}
                            <span className="ml-1 text-xs text-neutral-400">
                              · {monthTotal > 0 ? Math.round((d.value / monthTotal) * 100) : 0}%
                            </span>
                          </span>
                          <span
                            className={`text-xs text-neutral-400 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            ▶
                          </span>
                        </div>
                      </button>

                      {/* Expandable items container */}
                      {isExpanded && (
                        <div className="border-t border-neutral-100 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                          {d.items.length === 0 ? (
                            <p className="py-2 text-xs text-neutral-400">No items</p>
                          ) : (
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                              {d.items.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between py-2 text-xs"
                                >
                                  <div>
                                    <p className="font-medium text-neutral-800 dark:text-neutral-200">
                                      {item.shop}
                                    </p>
                                    <p className="text-[11px] text-neutral-400">
                                      {new Date(item.date).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                    ฿{formatMoney(item.amount)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {prevTotal > 0 && (
            <p className="mt-3 text-xs text-neutral-400">
              Previous period total: ฿{formatMoney(prevTotal)}
            </p>
          )}
        </div>

        {/* Category Trend Chart */}
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Category Trend ({viewMode === "period" ? "Last Budget Groups" : "Last Months"})
          </h2>
          {categories.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-400">No categories to chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip formatter={(v) => `฿${formatMoney(Number(v))}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {categories.map((c) => (
                  <Bar key={c.id} dataKey={c.name} stackId="a" fill={c.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Change vs Previous Period */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Change vs Previous Period
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
