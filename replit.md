# 10BottleValueCo on Replit / на Replit

Read [docs/PAYMENTS.md](docs/PAYMENTS.md) for the full payment map. The storefront is `artifacts/10-bottle-value/src/App.jsx`; shared payment handlers live in root `api/`. The Express entry point is `artifacts/api-server/src/index.ts`.

Карта всей оплаты: [docs/PAYMENTS.md](docs/PAYMENTS.md). Интерфейс находится в `artifacts/10-bottle-value/src/App.jsx`, общий сервер оплаты — в корневом `api/`, запуск Express — в `artifacts/api-server/src/index.ts`.

## Why Card can show Unavailable / Почему карта недоступна

Card is enabled only after same-origin `GET /api/merit-checkout` returns a valid enabled response. An unmounted route, HTML from the frontend server, missing private settings, or failed provider/database readiness keeps it unavailable. Other selectable payment buttons do not prove those providers work. Do not force the frontend flag to true.

Карта включается только после корректного ответа `GET /api/merit-checkout` через тот же адрес Preview. Отсутствующий маршрут, HTML вместо JSON, неполные приватные настройки или неготовность провайдера/базы оставляют её недоступной. Наличие остальных кнопок не доказывает работу этих оплат. Не включайте кнопку принудительно в frontend.

Express now mounts `/api/merit-checkout` through `src/routes/merit-checkout.ts`, delegating to the same root handler as Vercel. Keep the root `api/` directory available next to the workspace when running the built API bundle. The supported server command builds first; directly executing individual route TypeScript files is not the runtime.

Express подключает `/api/merit-checkout` через `src/routes/merit-checkout.ts` к тому же обработчику, что и Vercel. При запуске собранного API сохраняйте корневую папку `api/` в workspace. Штатная команда сначала собирает сервер; отдельные TypeScript-файлы маршрутов напрямую не запускаются.

## Run Preview / Запуск Preview

Use the existing pnpm lockfile with a dependency install for the current OS. Run these as two workflow processes from the repository root:

Используйте существующий pnpm lockfile и установку зависимостей для текущей ОС. Из корня репозитория запускаются два процесса workflow:

```sh
# Express API
PORT=5000 pnpm --filter @workspace/api-server run dev

# Storefront with same-origin /api forwarding to the local API
PORT=3000 BASE_PATH=/ API_PROXY_PORT=5000 pnpm --filter @workspace/10-bottle-value run dev
```

Open the frontend port in Preview. `API_PROXY_PORT` is optional: omit it if the project's existing router already sends `/api` to Express. When set, it proxies `/api` only to that loopback port and preserves the browser Origin; it cannot point to the live store. It also applies to `vite preview`. This does not configure Replit publishing; keep the project's working publication setup and verify its API routing separately.

Откройте frontend-порт в Preview. `API_PROXY_PORT` необязателен: не задавайте его, если существующая маршрутизация проекта уже направляет `/api` в Express. При заданном значении `/api` идёт только на этот локальный порт, исходный Origin браузера сохраняется; прокси не ведёт на рабочий магазин. Настройка действует и для `vite preview`. Это не настройка публикации Replit: сохраните работающий процесс публикации и отдельно проверьте маршрутизацию API.

## Private configuration / Приватные настройки

Use Replit Secrets for API keys and database credentials, and the API process environment for the required private business settings in [config/merit.env.example](config/merit.env.example). A source import does not copy Vercel secrets. Do not put secret values in Git, `VITE_*`, screenshots or an AI prompt. Configure only credentials authorized for this project. Replit documents [Secrets and environment variables](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets).

API-ключи и доступ к базе хранятся в Replit Secrets; обязательные приватные бизнес-настройки для процесса API перечислены в [config/merit.env.example](config/merit.env.example). Импорт исходника не переносит секреты Vercel. Не помещайте значения в Git, `VITE_*`, скриншоты или запрос AI. Используйте доступ, разрешённый для этого проекта. Официальная документация: [Secrets и переменные окружения](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets).

| Settings / Настройки | Requirement / Требование |
|---|---|
| `ATTESTLY_API_KEY`, `ATTESTLY_WEBHOOK_SECRET`, `MERIT_MODE`, `MERIT_ENABLED` | Provider credentials, explicit test/live mode and enable flag. / Доступ провайдера, явный test/live режим и флаг включения. |
| `MERIT_RULE_VERSION`, `MERIT_CARD_SURCHARGE_BPS`, `MERIT_CARD_SURCHARGE_SOURCE`, `MERIT_CARD_SURCHARGE_EFFECTIVE_AT` | Approved surcharge rule, version, source and date. Do not guess rates. / Утверждённое правило доплаты, версия, источник и дата. Ставки не угадывать. |
| `SUPABASE_URL` (or `VITE_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY` | Server access plus applied private Merit/credit schema and RPCs. Source migrations do not apply themselves. / Серверный доступ и применённые приватные Merit/credit-функции. Файлы миграций сами не применяются. |
| `MERIT_ALLOWED_ORIGINS` | Exact authorized Preview HTTPS origin in lowercase, no default :443 port or path/trailing slash; up to ten comma-separated origins. No wildcards. Existing two production origins remain defaults. / Точный разрешённый HTTPS origin Preview в нижнем регистре, без стандартного порта :443, пути и завершающего `/`; до десяти адресов через запятую, без масок. Два рабочих домена остаются разрешёнными по умолчанию. |

Set additional origins only in the environment that needs them; leave the production setting absent unless intentionally required. Optional Stripe account pin and processor-fee/affiliate rules are documented in the env example. Unknown merchant fees must remain unknown.

Дополнительные Origin задаются только в нужной среде; в production настройку оставьте незаданной, если она не требуется намеренно. Необязательная привязка Stripe-аккаунта, комиссии продавца и affiliate-правила описаны в примере. Неизвестные комиссии продавца нельзя заменять догадкой.

Run a safe local configuration report from the repository root:

Безопасная локальная проверка настроек из корня репозитория:

```sh
node scripts/check-merit-setup.mjs
```

It prints missing variable names and configuration booleans, never values, and makes no network/payment requests. `paymentRulesConfigured=true` is not a provider/database readiness result. Then open `/api/merit-checkout` using the actual Preview origin:

Скрипт выводит недостающие имена и булевы признаки без значений, сетевых запросов и запуска оплаты. `paymentRulesConfigured=true` не проверяет провайдера и базу. Затем откройте `/api/merit-checkout` на фактическом адресе Preview:

| Result / Результат | Meaning / Значение |
|---|---|
| 404 or HTML / 404 или HTML | Request did not reach the shared handler; check API process/router/proxy. / Запрос не дошёл до общего обработчика: проверьте процесс API и маршрутизацию. |
| JSON `ok:true, enabled:false` | Handler is mounted; configuration or provider/database readiness is incomplete. / Обработчик подключён; настройки или готовность провайдера/базы не подтверждены. |
| JSON `enabled:true`, `currency:"usd"`, `surchargeBps` | Readiness passed at that time; does not prove completed payment. / На этот момент проверка готовности пройдена; это не подтверждение оплаты. |
| POST `403 MERIT_ORIGIN_REJECTED` | Actual browser origin is not explicitly allowed. / Фактический Origin браузера не разрешён явно. |
| POST 401 / POST 401 | Customer session is missing/invalid; do not bypass authentication. / Нет корректной сессии покупателя; проверку не обходить. |

Provider email verification, authoritative pricing, private reservations and authenticated reconciliation remain required. A standalone production deployment also needs its authorized provider setup and webhook delivery. `api/attestly-webhook.js` requires the raw request body: do not mount it behind Express's JSON body parser. This change mounts the card checkout endpoint, not every root Vercel function. Keep unresolved invoices held for reconciliation; do not replay them to test Preview.

Подтверждение email провайдером, серверная цена, приватное резервирование и авторизованная сверка обязательны. Для отдельного рабочего развёртывания также нужны настройки провайдера и доставка webhook. `api/attestly-webhook.js` требует исходное тело запроса: его нельзя подключать после JSON-парсера Express. Это изменение подключает карточный checkout, а не все функции Vercel. Не повторяйте неопределённые счета ради проверки Preview.

## Stack and checks / Стек и проверки

- pnpm workspaces, Node.js 24, TypeScript, Vite/React, Express 5; Supabase for auth and payment storage.
- Keep Tailwind pinned to 3.4.x; do not replace its PostCSS setup with `@tailwindcss/vite`.
- Supabase URL/anonymous-key mappings in `vite.config.ts` are public frontend configuration; service-role and provider keys stay server-only.
- `pnpm --filter @workspace/api-server run typecheck` and `pnpm --filter @workspace/10-bottle-value run build`.
- `node --test tests/replit-merit-route.test.mjs tests/replit-api-proxy.test.mjs tests/merit-setup-diagnostic.test.mjs api/merit-core.test.mjs api/merit-endpoints.test.mjs` uses synthetic fixtures and local HTTP only.

Сохраняйте существующий стек, Tailwind 3.4.x и разделение публичных параметров Supabase от серверных ключей. Проверки выше используют синтетические данные и локальный HTTP; они не подтверждают настройку чужой среды Replit или реальную оплату.
