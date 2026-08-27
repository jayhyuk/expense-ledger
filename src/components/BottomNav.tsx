"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Add", icon: "➕" },
  { href: "/report", label: "Report", icon: "📊" },
  { href: "/categories", label: "Categories", icon: "🏷️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-neutral-950/95">
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
