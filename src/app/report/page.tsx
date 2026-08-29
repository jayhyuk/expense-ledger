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
import { Budget, Expense, SalaryPeriod } from "@/lib/types";
import {
  budgetSpendForPeriod,
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
  const {
    ready,
    categories,
    expenses,
    salaryPeriods,
    getActiveSalaryPeriod,
    getBudgetsForPeriod,
  } = useData();

  // View Mode: "period" (Salary Period) or "month" (Calendar Month)
  const [viewMode, setViewMode] = useState<"period" | "month">(() =>
    salaryPeriods.length > 0 ? "period" : "month"
  );

  // Selected salary period ID
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    const active = getActiveSalaryPeriod();
    return active?.id || salaryPeriods[0]?.id || "";
  });

  // Selected calendar month
  const [monthCursor, setMonthCursor] = useState(() => monthKey(new Date().toISOString()));

  // Expandable category items state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Optional filter by a specific budget within the salary period
  const [selectedBudgetFilterId, setSelectedBudgetFilterId] = useState<string>("all");

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Current active salary period object
  const currentPeriod: SalaryPeriod | undefined = useMemo(() => {
    if (viewMode === "period" && salaryPeriods.length > 0) {
      return salaryPeriods.find((p) => p.id === selectedPeriodId) || salaryPeriods[0];
    }
    return undefined;
  }, [viewMode, salaryPeriods, selectedPeriodId]);

  // Budgets configured under the current salary period
  const periodBudgets: Budget[] = useMemo(() => {
    if (!currentPeriod) return [];
    return getBudgetsForPeriod(currentPeriod.id);
  }, [currentPeriod, getBudgetsForPeriod]);

  // Active budget filter if one is selected
  const activeBudgetFilter = useMemo(() => {
    if (selectedBudgetFilterId === "all" || !currentPeriod) return null;
    return periodBudgets.find((b) => b.id === selectedBudgetFilterId) || null;
  }, [selectedBudgetFilterId, currentPeriod, periodBudgets]);

  // Active date range & labels
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (viewMode === "period" && currentPeriod) {
      return {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        periodLabel: currentPeriod.name,
      };
    }
    // Calendar month
    const [y, m] = monthCursor.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const s = `${monthCursor}-01`;
    const e = `${monthCursor}-${String(lastDay).padStart(2, "0")}`;
    return {
      startDate: s,
      endDate: e,
      periodLabel: new Date(y, m - 1, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    };
  }, [viewMode, currentPeriod, monthCursor]);

  // All expenses belonging to the salary period / month
  const periodAllExpenses = useMemo(() => {
    return (expenses as Expense[]).filter((e) => isDateInRange(e.date, startDate, endDate));
  }, [expenses, startDate, endDate]);

  // Filtered expenses (if a specific budget is selected as sub-filter)
  const displayedExpenses = useMemo(() => {
    if (!activeBudgetFilter) return periodAllExpenses;
    const coveredIds = new Set(getCoveredCategories(activeBudgetFilter, categories).map((c) => c.id));
    return periodAllExpenses.filter((e) => coveredIds.has(e.categoryId));
  }, [activeBudgetFilter, periodAllExpenses, categories]);

  // Expenses grouped by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of displayedExpenses) {
      const list = map.get(e.categoryId) || [];
      list.push(e);
      map.set(e.categoryId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return map;
  }, [displayedExpenses]);

  // Pie chart data
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

  const totalPeriodSpend = useMemo(() => {
    return periodAllExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [periodAllExpenses]);

  const displayedTotal = useMemo(() => {
    return displayedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [displayedExpenses]);

  // Previous period comparison
  const { prevTotal, prevCategoryTotals } = useMemo(() => {
    let pStart = "";
    let pEnd = "";
    if (viewMode === "period" && currentPeriod) {
      const idx = salaryPeriods.findIndex((p) => p.id === currentPeriod.id);
      if (idx >= 0 && idx < salaryPeriods.length - 1) {
        pStart = salaryPeriods[idx + 1].startDate;
        pEnd = salaryPeriods[idx + 1].endDate;
      } else {
        const [sy, sm, sd] = currentPeriod.startDate.split("-").map(Number);
        const [ey, em, ed] = currentPeriod.endDate.split("-").map(Number);
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

    const prevExp = (expenses as Expense[]).filter((e) => isDateInRange(e.date, pStart, pEnd));
    const prevCatMap = new Map<string, number>();
    let total = 0;
    for (const e of prevExp) {
      total += e.amount;
      prevCatMap.set(e.categoryId, (prevCatMap.get(e.categoryId) ?? 0) + e.amount);
    }
    return { prevTotal: total, prevCategoryTotals: prevCatMap };
  }, [viewMode, currentPeriod, salaryPeriods, monthCursor, expenses]);

  // Trend data
  const trendData = useMemo(() => {
    if (viewMode === "period" && salaryPeriods.length > 0) {
      const slice = [...salaryPeriods].slice(0, TREND_PERIODS).reverse();
      return slice.map((p) => {
        const pExp = (expenses as Expense[]).filter((e) =>
          isDateInRange(e.date, p.startDate, p.endDate)
        );
        const catMap = new Map<string, number>();
        for (const e of pExp) catMap.set(e.categoryId, (catMap.get(e.categoryId) ?? 0) + e.amount);
        const row: Record<string, string | number> = {
          name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
        };
        for (const c of categories) {
          row[c.name] = Math.round((catMap.get(c.id) ?? 0) * 100) / 100;
        }
        return row;
      });
    }

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
  }, [viewMode, salaryPeriods, monthCursor, expenses, categories]);

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

  // Accordion helpers
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

  // Step period navigation
  const handleStepPeriod = (direction: -1 | 1) => {
    if (viewMode === "period" && salaryPeriods.length > 0) {
      const curIdx = salaryPeriods.findIndex((p) => p.id === selectedPeriodId);
      const nextIdx = curIdx - direction;
      if (nextIdx >= 0 && nextIdx < salaryPeriods.length) {
        setSelectedPeriodId(salaryPeriods[nextIdx].id);
        setSelectedBudgetFilterId("all");
      }
    } else {
      setMonthCursor((m) => shiftMonth(m, direction));
    }
  };

  const canStepNewer =
    viewMode === "period"
      ? salaryPeriods.findIndex((p) => p.id === selectedPeriodId) > 0
      : monthCursor < monthKey(new Date().toISOString());

  const canStepOlder =
    viewMode === "period"
      ? salaryPeriods.findIndex((p) => p.id === selectedPeriodId) < salaryPeriods.length - 1
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
        {salaryPeriods.length > 0 && (
          <div className="mb-3 flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              onClick={() => {
                setViewMode("period");
                if (!selectedPeriodId && salaryPeriods[0]) {
                  setSelectedPeriodId(salaryPeriods[0].id);
                }
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                viewMode === "period"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-neutral-900 dark:text-indigo-400"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              📅 Salary Periods
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

        {/* Salary Period Navigation Bar */}
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
              {viewMode === "period" && salaryPeriods.length > 1 ? (
                <div className="flex flex-col items-center">
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => {
                      setSelectedPeriodId(e.target.value);
                      setSelectedBudgetFilterId("all");
                    }}
                    className="max-w-[220px] truncate rounded-lg bg-neutral-50 px-2 py-1 text-sm font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {salaryPeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
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
        </div>

        {/* Salary Period Budgets Summary */}
        {viewMode === "period" && currentPeriod && periodBudgets.length > 0 && (
          <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Budgets for this Period
              </h2>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                ฿{formatMoney(totalPeriodSpend)} spent in total
              </span>
            </div>

            <div className="space-y-2.5">
              {periodBudgets.map((b) => {
                const bSpent = budgetSpendForPeriod(expenses, categories, b, currentPeriod);
                const bOver = b.amount > 0 && bSpent > b.amount;
                const bPct = b.amount > 0 ? Math.min(100, Math.round((bSpent / b.amount) * 100)) : 0;
                const isFilterActive = selectedBudgetFilterId === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() =>
                      setSelectedBudgetFilterId(isFilterActive ? "all" : b.id)
                    }
                    className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                      isFilterActive
                        ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500 dark:bg-indigo-950/30"
                        : "border-neutral-100 bg-neutral-50/50 hover:border-neutral-200 dark:border-neutral-800 dark:bg-neutral-800/40"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {b.name}
                        {isFilterActive && (
                          <span className="ml-1.5 rounded bg-indigo-600 px-1.5 py-0.2 text-[10px] text-white">
                            Filtered
                          </span>
                        )}
                      </span>
                      <span className={bOver ? "font-bold text-red-600" : "text-neutral-500"}>
                        ฿{formatMoney(bSpent)} / ฿{formatMoney(b.amount)}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className={`h-full rounded-full ${
                          bOver ? "bg-red-500" : bPct > 85 ? "bg-amber-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${bPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedBudgetFilterId !== "all" && (
              <button
                onClick={() => setSelectedBudgetFilterId("all")}
                className="mt-2.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                ← Show All Expenses in Period
              </button>
            )}
          </div>
        )}

        {/* Expenses in Period by Category & Items */}
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {activeBudgetFilter
                  ? `Expenses for "${activeBudgetFilter.name}"`
                  : "All Expenses in Period"}
              </h2>
              <p className="text-xs text-neutral-400">
                {displayedExpenses.length} transaction(s)
              </p>
            </div>
            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              ฿{formatMoney(displayedTotal)}
            </span>
          </div>

          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              No expenses recorded in this salary period.
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
                              · {displayedTotal > 0 ? Math.round((d.value / displayedTotal) * 100) : 0}%
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
            Category Trend ({viewMode === "period" ? "Last Salary Periods" : "Last Months"})
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
