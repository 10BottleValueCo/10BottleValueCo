# 10BottleValueCo

Storefront and server payment source. Start with [the payment map / карта оплаты](docs/PAYMENTS.md) when importing this repository into an AI coding tool.

For Replit Preview, follow [the runtime and card checkout setup / настройка Preview и карты](replit.md). Root `api/` functions need an Express route and private runtime configuration; a GitHub import alone does not enable Card.

The running storefront is `artifacts/10-bottle-value/src/App.jsx`; payment endpoints are in `api/`, and database definitions are in `supabase/migrations/`. Import the whole repository: the frontend alone cannot authenticate customers, verify prices, reserve invoices or confirm settlement.

Рабочий интерфейс находится в `artifacts/10-bottle-value/src/App.jsx`, сервер оплаты — в `api/`, изменения базы — в `supabase/migrations/`. Передавайте AI весь репозиторий: одного frontend недостаточно для проверки пользователя, цены, резервирования счёта и подтверждения оплаты.

Use the existing pnpm workspace and lockfile. Build the storefront with `pnpm --filter @workspace/10-bottle-value run build`. Private runtime configuration and deployment/database state are managed separately; cloning this repository does not activate payment accounts or apply migrations.
