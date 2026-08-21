# 10 Bottle Value Co.

E-commerce product site selling research peptides (Semaglutide, Retatrutide, BPC-157, etc.) in 10-vial bulk kits. Uses Supabase for auth/orders and Resend for transactional email.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/10-bottle-value/src/App.jsx` — main app (all pages in one large component)
- `artifacts/10-bottle-value/src/supabase.js` — Supabase client (falls back to a no-op client if env vars missing)
- `artifacts/10-bottle-value/src/styles.css` — Tailwind 3 directives + base styles
- `artifacts/10-bottle-value/src/index.css` — CSS custom properties (design tokens)
- `api/` — original Vercel serverless API routes (send-registration-email, stripe-webhook, etc.) — NOT yet wired to Express
- `artifacts/api-server/src/routes/` — Express API routes (currently only health check)

## Architecture decisions

- **Tailwind 3** — uses PostCSS plugin (autoprefixer + tailwindcss) with `tailwind.config.js`. The scaffold default is Tailwind 4 via `@tailwindcss/vite`; this project overrides that.
- **Supabase env mapping** — vite.config.ts maps `SUPABASE_URL`/`SUPABASE_ANON_KEY` secrets into `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` at build time via `define`. The service-role key stays server-side only.
- **No-op Supabase fallback** — `src/supabase.js` exports a mock client when env vars are absent, so the UI renders without throwing.
- **Original Vercel API routes** (`api/`) not yet ported to Express. Email sending and payment webhooks need to be moved to `artifacts/api-server/src/routes/`.

## Product

- Product page with multi-language support (EN/RU/UA/DE/ES)
- Supabase auth (sign-up, sign-in, account management)
- Order tracking via Supabase
- Multiple payment methods: Stripe, Paylio, CatalystPay, NowPayments, crypto
- Resend for registration and payment-confirmed emails
- Affiliate program with promo codes

## User preferences

- Use Tailwind 3 (not Tailwind 4)

## Gotchas

- Do NOT add `@tailwindcss/vite` — this project uses PostCSS-based Tailwind 3. If you add it the styles break.
- `tailwindcss` version must stay pinned to `3.4.x` in package.json (not `catalog:`, which resolves to v4).
- The `api/` directory contains the original Vercel serverless functions — they are NOT auto-imported; port them to Express before using.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
