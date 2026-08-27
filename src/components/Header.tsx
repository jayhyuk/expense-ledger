"use client";

import { useState } from "react";
import SettingsSheet from "./SettingsSheet";

export default function Header({ title }: { title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <h1 className="text-lg font-semibold">{title}</h1>
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        ⚙️
      </button>
      {open && <SettingsSheet onClose={() => setOpen(false)} />}
    </header>
  );
}
