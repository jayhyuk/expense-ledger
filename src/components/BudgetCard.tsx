"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import {
  budgetSpendForPeriod,
  formatDateRange,
  formatMoney,
  getCoveredCategories,
  getDefaultSalaryCycle,
  getDaysRemaining,
  toLocalDateString,
} from "@/lib/dateUtils";
import { Budget, SalaryPeriod } from "@/lib/types";

export default function BudgetCard() {
  const {
    categories,
    expenses,
    salaryPeriods,
    getActiveSalaryPeriod,
    addSalaryPeriod,
    updateSalaryPeriod,
    deleteSalaryPeriod,
    addBudget,
    updateBudget,
    deleteBudget,
    getBudgetsForPeriod,
  } = useData();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Active Salary Period
  const activePeriod: SalaryPeriod | undefined = useMemo(() => {
    if (selectedPeriodId) {
      const found = salaryPeriods.find((p) => p.id === selectedPeriodId);
      if (found) return found;
    }
    return getActiveSalaryPeriod();
  }, [salaryPeriods, selectedPeriodId, getActiveSalaryPeriod]);

  // Budgets for the active salary period
  const periodBudgets: Budget[] = useMemo(() => {
    if (!activePeriod) return [];
    return getBudgetsForPeriod(activePeriod.id);
  }, [activePeriod, getBudgetsForPeriod]);

  // Period Editor Modal State
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [periodName, setPeriodName] = useState("");
  const [periodFormError, setPeriodFormError] = useState("");

  // Budget Editor Modal State
  const [editingBudget, setEditingBudget] = useState(false);
  const [targetBudget, setTargetBudget] = useState<Budget | null>(null);
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategoryIds, setBudgetCategoryIds] = useState<string[]>([]);
  const [budgetFormError, setBudgetFormError] = useState("");

  // Period-level total spending & total budget
  const daysRemaining = activePeriod ? getDaysRemaining(activePeriod.endDate) : 0;

  // --- Handlers for Salary Period ---
  const openPeriodEditor = (period?: SalaryPeriod) => {
    if (period) {
      setPeriodStartDate(period.startDate);
      setPeriodEndDate(period.endDate);
      setPeriodName(period.name);
    } else {
      const salaryCycle = getDefaultSalaryCycle(25);
      setPeriodStartDate(salaryCycle.startDate);
      setPeriodEndDate(salaryCycle.endDate);
      setPeriodName(salaryCycle.name);
    }
    setPeriodFormError("");
    setEditingPeriod(true);
  };

  const handleApplyPreset = (type: "salary25" | "month" | "next30") => {
    const today = new Date();
    if (type === "salary25") {
      const cycle = getDefaultSalaryCycle(25, today);
      setPeriodStartDate(cycle.startDate);
      setPeriodEndDate(cycle.endDate);
      setPeriodName(cycle.name);
    } else if (type === "month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setPeriodStartDate(start);
      setPeriodEndDate(end);
      setPeriodName(today.toLocaleDateString(undefined, { month: "long", year: "numeric" }));
    } else if (type === "next30") {
      const start = toLocalDateString(today);
      const endObj = new Date(today);
      endObj.setDate(endObj.getDate() + 30);
      const end = toLocalDateString(endObj);
      setPeriodStartDate(start);
      setPeriodEndDate(end);
      setPeriodName(formatDateRange(start, end));
    }
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStartDate || !periodEndDate) {
      setPeriodFormError("Please select both start and end dates.");
      return;
    }
    if (periodStartDate > periodEndDate) {
      setPeriodFormError("Start date cannot be after end date.");
      return;
    }

    if (activePeriod && editingPeriod && activePeriod.id === selectedPeriodId) {
      updateSalaryPeriod(activePeriod.id, {
        name: periodName.trim() || formatDateRange(periodStartDate, periodEndDate),
        startDate: periodStartDate,
        endDate: periodEndDate,
      });
    } else {
      const created = addSalaryPeriod({
        name: periodName.trim() || formatDateRange(periodStartDate, periodEndDate),
        startDate: periodStartDate,
        endDate: periodEndDate,
      });
      setSelectedPeriodId(created.id);
    }
    setEditingPeriod(false);
    setPeriodFormError("");
  };

  const handleDeletePeriod = () => {
    if (!activePeriod) return;
    if (
      window.confirm(
        `Delete salary period "${activePeriod.name}" and all its associated budgets?`
      )
    ) {
      deleteSalaryPeriod(activePeriod.id);
      setSelectedPeriodId(null);
      setEditingPeriod(false);
    }
  };

  // --- Handlers for Budgets ---
  const openBudgetEditor = (b?: Budget) => {
    if (b) {
      setTargetBudget(b);
      setBudgetName(b.name);
      setBudgetAmount(String(b.amount || ""));
      setBudgetCategoryIds(
        b.categoryIds && b.categoryIds.length > 0 ? [...b.categoryIds] : categories.map((c) => c.id)
      );
    } else {
      setTargetBudget(null);
      setBudgetName(
        periodBudgets.length === 0
          ? "Living Essentials"
          : periodBudgets.length === 1
          ? "Fun & Shopping"
          : `Budget ${periodBudgets.length + 1}`
      );
      setBudgetAmount("");
      setBudgetCategoryIds(categories.map((c) => c.id));
    }
    setBudgetFormError("");
    setEditingBudget(true);
  };

  const toggleCategoryInBudget = (catId: string) => {
    setBudgetCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeriod) return;
    const amt = parseFloat(budgetAmount);
    if (isNaN(amt) || amt <= 0) {
      setBudgetFormError("Please enter a valid budget amount.");
      return;
    }
    if (!budgetName.trim()) {
      setBudgetFormError("Please enter a budget name.");
      return;
    }

    const payloadCatIds =
      budgetCategoryIds.length === categories.length || budgetCategoryIds.length === 0
        ? undefined
        : budgetCategoryIds;

    if (targetBudget) {
      updateBudget(targetBudget.id, {
        name: budgetName.trim(),
        amount: amt,
        categoryIds: payloadCatIds,
      });
    } else {
      addBudget({
        periodId: activePeriod.id,
        name: budgetName.trim(),
        amount: amt,
        categoryIds: payloadCatIds,
      });
    }
    setEditingBudget(false);
    setBudgetFormError("");
  };

  const handleDeleteBudget = (id: string, name: string) => {
    if (window.confirm(`Delete budget "${name}"?`)) {
      deleteBudget(id);
    }
  };

  // --- Render Period Editor ---
  if (editingPeriod) {
    return (
      <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {activePeriod ? "Edit Salary Period" : "Set New Salary Period"}
          </h3>
          <button
            type="button"
            onClick={() => setEditingPeriod(false)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSavePeriod} className="space-y-3">
          <div>
            <span className="mb-1 block text-[11px] font-medium text-neutral-500">
              Quick presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset("salary25")}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                📅 Pay Day (25th)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("month")}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                📆 Calendar Month
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("next30")}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                ⏳ 30 Days
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Salary Period Name
            </label>
            <input
              type="text"
              placeholder="e.g. Aug 25 – Sep 24, September Salary"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Start Date</label>
              <input
                type="date"
                required
                value={periodStartDate}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">End Date</label>
              <input
                type="date"
                required
                value={periodEndDate}
                onChange={(e) => setPeriodEndDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
          </div>

          {periodFormError && <p className="text-xs text-red-500">{periodFormError}</p>}

          <div className="flex gap-2 pt-1">
            {activePeriod && (
              <button
                type="button"
                onClick={handleDeletePeriod}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 active:scale-[0.99]"
            >
              Save Salary Period
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Render Budget Editor (Create / Edit Budget under Period) ---
  if (editingBudget && activePeriod) {
    return (
      <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              {targetBudget ? "Edit Budget" : "Add Budget to Period"}
            </h3>
            <p className="text-[11px] text-neutral-400">
              Under {activePeriod.name} ({formatDateRange(activePeriod.startDate, activePeriod.endDate)})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingBudget(false)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSaveBudget} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Budget Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Food & Groceries, Living Essentials, Fun & Leisure"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Budget Amount</label>
            <div className="flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950">
              <span className="mr-1 text-base text-neutral-400">฿</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                placeholder="6000.00"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full bg-transparent text-base font-semibold outline-none"
              />
            </div>
          </div>

          {/* Category selection */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-500">Covered Categories</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBudgetCategoryIds(categories.map((c) => c.id))}
                  className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Select All
                </button>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <button
                  type="button"
                  onClick={() => setBudgetCategoryIds([])}
                  className="text-[11px] font-medium text-neutral-500 hover:underline dark:text-neutral-400"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50/70 p-2 dark:border-neutral-800 dark:bg-neutral-950">
              {categories.map((c) => {
                const isSelected = budgetCategoryIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCategoryInBudget(c.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-transparent bg-white text-neutral-900 shadow-sm ring-1 ring-black/10 dark:bg-neutral-800 dark:text-neutral-100"
                        : "border-transparent text-neutral-400 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                    {isSelected && <span className="text-[10px] text-indigo-600 dark:text-indigo-400">✓</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              {budgetCategoryIds.length === 0 || budgetCategoryIds.length === categories.length
                ? "Covers all categories"
                : `Covers ${budgetCategoryIds.length} selected category(ies)`}
            </p>
          </div>

          {budgetFormError && <p className="text-xs text-red-500">{budgetFormError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 active:scale-[0.99]"
            >
              {targetBudget ? "Save Changes" : "Create Budget"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- If No Active Salary Period Exists ---
  if (!activePeriod) {
    return (
      <div className="mb-4 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Set Up Your Salary Period
            </h3>
            <p className="text-xs text-neutral-400">
              Define your salary pay cycle (e.g. 25th to 24th) to budget over it
            </p>
          </div>
          <button
            onClick={() => openPeriodEditor()}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700"
          >
            + Set Period
          </button>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Display ---
  return (
    <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Salary Period Navigation Bar */}
      <div className="mb-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              📅 Salary Period
            </span>
            {salaryPeriods.length > 1 && (
              <select
                value={activePeriod.id}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {salaryPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openPeriodEditor(activePeriod)}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:underline dark:hover:text-neutral-200"
            >
              Edit Dates
            </button>
            <button
              onClick={() => openPeriodEditor(undefined)}
              className="rounded-md border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              title="Add another salary period"
            >
              + New Period
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {activePeriod.name}
            </h2>
            <p className="text-xs text-neutral-400">
              {formatDateRange(activePeriod.startDate, activePeriod.endDate)}
            </p>
          </div>
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
              daysRemaining > 5
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : daysRemaining >= 0
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
            }`}
          >
            {daysRemaining > 0
              ? `${daysRemaining} day${daysRemaining > 1 ? "s" : ""} left`
              : daysRemaining === 0
              ? "Ends today"
              : "Period ended"}
          </span>
        </div>
      </div>

      {/* Budgets Header & Add Button */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Budgets in this Period ({periodBudgets.length})
        </h3>
        <button
          onClick={() => openBudgetEditor()}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          + Add Budget
        </button>
      </div>

      {/* List of Budgets sharing this Salary Period */}
      {periodBudgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-center dark:border-neutral-800">
          <p className="text-xs text-neutral-400">No budgets defined for this salary period yet.</p>
          <button
            onClick={() => openBudgetEditor()}
            className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400"
          >
            + Create First Budget (e.g. Food, Bills, Total)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {periodBudgets.map((b) => {
            const bSpent = budgetSpendForPeriod(expenses, categories, b, activePeriod);
            const bRemaining = b.amount - bSpent;
            const bOver = b.amount > 0 && bSpent > b.amount;
            const bPct = b.amount > 0 ? Math.min(100, Math.round((bSpent / b.amount) * 100)) : 0;
            const covered = getCoveredCategories(b, categories);

            return (
              <div
                key={b.id}
                className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 transition-all dark:border-neutral-800 dark:bg-neutral-800/40"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {b.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openBudgetEditor(b)}
                      className="text-[11px] text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(b.id, b.name)}
                      className="text-[11px] text-neutral-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Covered category chips */}
                <div className="mb-2 flex flex-wrap gap-1">
                  {covered.length === 0 || covered.length === categories.length ? (
                    <span className="text-[10px] text-neutral-400">All categories</span>
                  ) : (
                    covered.map((c) => (
                      <span
                        key={c.id}
                        className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 shadow-sm dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    ))
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span
                    className={`text-sm font-bold ${
                      bOver ? "text-red-600" : "text-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    ฿{formatMoney(bSpent)}
                    <span className="ml-1 text-xs font-normal text-neutral-400">
                      / ฿{formatMoney(b.amount)}
                    </span>
                  </span>
                  <span className={`text-xs ${bOver ? "font-semibold text-red-600" : "text-neutral-400"}`}>
                    {bOver ? `฿${formatMoney(Math.abs(bRemaining))} over` : `฿${formatMoney(bRemaining)} left`}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bOver ? "bg-red-500" : bPct > 85 ? "bg-amber-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${bPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
