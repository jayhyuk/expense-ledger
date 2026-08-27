# Expense Ledger

A mobile-friendly expense tracker. All data is stored locally in your browser's
`localStorage` — there is no backend or database, so your data never leaves
your device unless you export it.

## Features

- **Add Expense** (home screen) — amount, shop name, category, and date/time
  (defaults to now, fully editable).
- **Report** — pie chart of spending by category for any month, a 6-month
  stacked trend chart per category, and a month-over-month increase/decrease
  breakdown per category.
- **Categories** — add or remove your own expense categories with colors.
- **Backup** — hidden behind the ⚙️ gear icon on every page: export your data
  as JSON (copy to clipboard or download a file), or import a JSON backup to
  restore/replace your data.

## Getting started locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this project to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Keep the default Next.js build settings and click **Deploy**.

No environment variables or database setup are required — everything runs
client-side using `localStorage`.
