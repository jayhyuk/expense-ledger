"use client";

import { useMemo, useState } from "react";
import { useData } from "@/lib/DataContext";
import {
  budgetedSpendForPeriod,
  formatDateRange,
  formatMoney,
  getDefaultSalaryCycle,
  getDaysRemaining,
  toLocalDateString,
} from "@/lib/dateUtils";
import { BudgetPeriod } from "@/lib/types";

export default function BudgetCard() {
  const {
    categories,
    expenses,
    budgets,
    getActiveBudget,
    addBudgetPeriod,
    updateBudgetPeriod,
    deleteBudgetPeriod,
  } = useData();

  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Active or selected budget
  const activeBudget: BudgetPeriod | undefined = useMemo(() => {
    if (selectedBudgetId) {
      const found = budgets.find((b) => b.id === selectedBudgetId);
      if (found) return found;
    }
    return getActiveBudget();
  }, [budgets, selectedBudgetId, getActiveBudget]);

  // Form states for creating / editing
  const [draftAmount, setDraftAmount] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftName, setDraftName] = useState("");
  const [formError, setFormError] = useState("");

  const spent = useMemo(() => {
    if (!activeBudget) return 0;
    return budgetedSpendForPeriod(
      expenses,
      categories,
      activeBudget.startDate,
      activeBudget.endDate
    );
  }, [expenses, categories, activeBudget]);

  const hasBudgetedCategories = categories.some((c) => c.countsTowardBudget);
  const budget = activeBudget?.amount ?? 0;
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;
  const daysRemaining = activeBudget ? getDaysRemaining(activeBudget.endDate) : 0;

  const openEditor = (targetBudget?: BudgetPeriod) => {
    if (targetBudget) {
      setDraftAmount(String(targetBudget.amount || ""));
      setDraftStartDate(targetBudget.startDate);
      setDraftEndDate(targetBudget.endDate);
      setDraftName(targetBudget.name || "");
    } else {
      // Default to salary cycle (e.g. 25th to 24th) or current month
      const salaryCycle = getDefaultSalaryCycle(25);
      setDraftAmount("");
      setDraftStartDate(salaryCycle.startDate);
      setDraftEndDate(salaryCycle.endDate);
      setDraftName(salaryCycle.name);
    }
    setFormError("");
    setEditing(true);
  };

  const handleApplyPreset = (type: "salary25" | "month" | "next30") => {
    const today = new Date();
    if (type === "salary25") {
      const cycle = getDefaultSalaryCycle(25, today);
      setDraftStartDate(cycle.startDate);
      setDraftEndDate(cycle.endDate);
      setDraftName(cycle.name);
    } else if (type === "month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setDraftStartDate(start);
      setDraftEndDate(end);
      setDraftName(
        today.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      );
    } else if (type === "next30") {
      const start = toLocalDateString(today);
      const endObj = new Date(today);
      endObj.setDate(endObj.getDate() + 30);
      const end = toLocalDateString(endObj);
      setDraftStartDate(start);
      setDraftEndDate(end);
      setDraftName(formatDateRange(start, end));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(draftAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid budget amount.");
      return;
    }
    if (!draftStartDate || !draftEndDate) {
      setFormError("Please select both start and end dates.");
      return;
    }
    if (draftStartDate > draftEndDate) {
      setFormError("Start date cannot be after end date.");
      return;
    }

    if (activeBudget && editing) {
      updateBudgetPeriod(activeBudget.id, {
        name: draftName.trim() || formatDateRange(draftStartDate, draftEndDate),
        amount: amt,
        startDate: draftStartDate,
        endDate: draftEndDate,
      });
      setSelectedBudgetId(activeBudget.id);
    } else {
      const created = addBudgetPeriod({
        name: draftName.trim() || formatDateRange(draftStartDate, draftEndDate),
        amount: amt,
        startDate: draftStartDate,
        endDate: draftEndDate,
      });
      setSelectedBudgetId(created.id);
    }
    setEditing(false);
    setFormError("");
  };

  const handleDeleteCurrent = () => {
    if (!activeBudget) return;
    if (window.confirm(`Delete budget period "${activeBudget.name}"?`)) {
      deleteBudgetPeriod(activeBudget.id);
      setSelectedBudgetId(null);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {activeBudget ? "Edit Budget Period" : "Set New Budget Period"}
          </h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          {/* Quick preset buttons */}
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Start Date</label>
              <input
                type="date"
                required
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">End Date</label>
              <input
                type="date"
                required
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
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
                placeholder="20000.00"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                className="w-full bg-transparent text-base font-semibold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Period Name / Label <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Salary Cycle: Aug 25 - Sep 24"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex gap-2 pt-1">
            {activeBudget && (
              <button
                type="button"
                onClick={handleDeleteCurrent}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700 active:scale-[0.99]"
            >
              Save Budget Period
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!activeBudget || budget <= 0) {
    return (
      <div className="mb-4 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Set Your Budget Period
            </h3>
            <p className="text-xs text-neutral-400">
              Track spending from your salary start date to end date
            </p>
          </div>
          <button
            onClick={() => openEditor()}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700"
          >
            + Set Budget
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Budget
          </h2>
          {budgets.length > 1 && (
            <select
              value={activeBudget.id}
              onChange={(e) => setSelectedBudgetId(e.target.value)}
              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || formatDateRange(b.startDate, b.endDate)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditor(activeBudget)}
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Edit
          </button>
          <button
            onClick={() => openEditor(undefined)}
            className="rounded-md border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            title="Add another budget period"
          >
            + New Period
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {activeBudget.name}
          </p>
          <p className="text-[11px] text-neutral-400">
            {formatDateRange(activeBudget.startDate, activeBudget.endDate)}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
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

      <div className="mb-2 flex items-baseline justify-between">
        <span className={`text-2xl font-bold tracking-tight ${over ? "text-red-600" : ""}`}>
          ฿{formatMoney(remaining)}
          <span className="ml-1.5 text-xs font-normal text-neutral-400">
            {over ? "over budget" : "remaining"}
          </span>
        </span>
        <span className="text-xs text-neutral-400">
          ฿{formatMoney(spent)} / ฿{formatMoney(budget)}
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            over ? "bg-red-500" : pct > 85 ? "bg-amber-500" : "bg-indigo-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {!hasBudgetedCategories && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          ⚠️ No categories are set to count toward budget. Configure this in Categories.
        </p>
      )}
    </div>
  );
}
