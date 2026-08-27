"use client";

import { useRef, useState } from "react";
import { useData } from "@/lib/DataContext";

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { exportJson, importJson, categories, expenses } = useData();
  const [tab, setTab] = useState<"export" | "import">("export");
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const json = exportJson();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage({ type: "error", text: "Could not copy. Select and copy manually." });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
  };

  const handleImport = () => {
    try {
      importJson(importText);
      setMessage({ type: "ok", text: "Import successful!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Invalid JSON file.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings & Backup</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
              tab === "export" ? "bg-white shadow dark:bg-neutral-700" : "text-neutral-500"
            }`}
            onClick={() => setTab("export")}
          >
            Export
          </button>
          <button
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
              tab === "import" ? "bg-white shadow dark:bg-neutral-700" : "text-neutral-500"
            }`}
            onClick={() => setTab("import")}
          >
            Import
          </button>
        </div>

        {tab === "export" ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              {expenses.length} expenses · {categories.length} categories
            </p>
            <textarea
              readOnly
              value={json}
              className="h-48 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Download file
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              Paste your backup JSON below, or pick a file. Importing replaces all current data.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste exported JSON here..."
              className="h-40 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex gap-2">
              <button
                onClick={handleFilePick}
                className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Choose file
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Import
              </button>
            </div>
            {message && (
              <p className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
