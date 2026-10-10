# Payment map / Карта оплаты

Source guide, 2026-10-10. This describes the code in this revision, not provider uptime, a live settlement result or a promise about external response times. Runtime credentials, private pricing rules and database migration state must be verified separately. Never put their values or customer exports in this repository or an AI prompt.

Документация исходника от 10.10.2026. Она описывает код этой версии; это не проверка доступности провайдера, фактической выплаты или скорости внешнего сервиса. Ключи, приватные ценовые правила и применённые миграции проверяются отдельно. Их значения и выгрузки покупателей не включаются в репозиторий или запрос к AI.

## Start here / С чего начать

| Responsibility / Задача | Source / Исходник |
|---|---|
| Actual storefront and payment handlers / Рабочий интерфейс и обработчики | `artifacts/10-bottle-value/src/App.jsx` (`handleStripePayment`, `createPaylioPayment`, `createCatalystPayment`, `persistOrderToServer`) |
| Account authentication and order ownership / Проверка аккаунта и владельца заказа | `api/_auth.js`, `api/_order-access.js` |
| Draft storage and combined hosted checkout / Сохранение и запуск внешней оплаты | `api/order-checkout.js` |
| Server catalog, total and affiliate eligibility / Серверная цена и право на скидку | `api/_catalog.js`, `api/_legacy-checkout-quote.js`, `api/_affiliate-quote.js`, `api/_merit-quote.js` |
| Card creation and reconciliation / Создание и сверка карточной оплаты | `api/merit-checkout.js`, `api/_merit-core.js`, `api/_merit-provider.js`, `api/_merit-storage.js`, `api/_merit-reconcile.js` |
| Paylio creation, immutable binding and callback / Создание, привязка и callback Paylio | `api/create-paylio-payment.js`, `api/_paylio-binding.js`, `api/paylio-callback.js` |
| Cash App via Lightning / Cash App через Lightning | `api/create-catalystpay-session.js`, `api/_catalystpay-provider.js`, `api/_catalystpay-resume.js`, `api/catalystpay-webhook.js` |
| Other legacy crypto routes / Остальные маршруты криптооплаты | `api/create-payment.js`, `api/_nowpayments-provider.js`, `api/verify-nowpayments-payment.js`, `api/nowpayments-webhook.js` |
| Store credit / Баланс магазина | `api/store-credit-checkout.js`, `api/_legacy-store-credit.js`, `supabase/migrations/` |
| Receipts and confirmation mail / Чеки и подтверждения | `api/_merit-receipt.js`, `api/_payment-confirmation-email.js`, `api/send-payment-confirmed-email.js` |
| Request phase timing / Время этапов запроса | `api/_checkout-timing.js` |

## Paylio and Cash App / Paylio и Cash App

1. The final user action acquires the client start lock and shows progress. `prepareLegacyPaymentAttempt` derives a stable attempt from the current checkout snapshot. A previously verified bound URL can be reopened without creating another invoice.
2. The browser sends one authenticated `POST /api/order-checkout` containing `{ order, payment: { kind, body } }`. `kind` is `paylio` or `catalystpay`. This replaces a separate save request followed by a separate provider request.
3. The server verifies the session and confirmed account, matching order IDs and identity claims, then saves the order. It reuses the verified identity only within that same request; every later HTTP request authenticates again. The HttpOnly order cookie keeps its existing `/api/order-checkout` path.
4. The selected existing provider handler checks ownership, payable state, existing credit and competing reservations, then verifies the authoritative quote. Independent order and Paylio-reservation reads may run concurrently; authorization and payment guards remain required.
5. The server reserves before contacting the provider and binds the returned invoice before returning a usable URL. A timeout or lost response can leave a reservation requiring reconciliation. Retrying must never blindly create another invoice.
6. The browser checks the returned amount and URL before navigating. `X-Checkout-Saved: 1` preserves an acknowledged unpaid order in local history if provider creation fails. This header does not confirm payment.
7. Callback/webhook and reconciliation code establish paid state. A browser redirect, local status, invoice URL, successful create response or an amount shown in a dashboard is not settlement evidence.

1. Финальное действие пользователя блокирует повторный запуск и показывает подготовку оплаты. `prepareLegacyPaymentAttempt` связывает попытку с текущим оформлением. Проверенная ссылка существующего счёта открывается повторно без создания нового.
2. Браузер отправляет один авторизованный `POST /api/order-checkout` с `{ order, payment: { kind, body } }`; `kind` — `paylio` или `catalystpay`. Отдельные запросы сохранения и запуска объединены.
3. Сервер проверяет сессию, подтверждённый аккаунт, совпадение ID и личности, затем сохраняет заказ. Проверенная личность повторно используется только внутри этого запроса; следующий HTTP-запрос авторизуется заново. Путь HttpOnly cookie остаётся `/api/order-checkout`.
4. Существующий обработчик провайдера проверяет владельца, состояние заказа, кредит и конкурирующие резервы, затем серверную сумму. Независимые чтения заказа и резерва Paylio могут выполняться параллельно; защитные проверки обязательны.
5. Резерв создаётся до обращения к провайдеру; ссылка возвращается после привязки счёта. Потеря ответа может оставить резерв для сверки. Повтор запроса не должен вслепую создавать новый счёт.
6. Браузер проверяет сумму и URL перед переходом. `X-Checkout-Saved: 1` сохраняет подтверждённый неоплаченный заказ в локальной истории при ошибке провайдера. Заголовок не подтверждает оплату.
7. Оплата подтверждается callback/webhook и сверкой. Возврат браузера, локальный статус, ссылка, успешное создание счёта или сумма на экране кабинета не доказывают поступление денег.

The standalone provider endpoints remain for older frontend bundles. `Server-Timing` and structured duration-only logs separate save, access, credit, quote, reserve, provider and bind phases. Early rejected requests may end before all phases are recorded. Removing an HTTP round trip and duplicate session validation does not eliminate provider processing time.

Отдельные endpoints сохранены для старых версий интерфейса. `Server-Timing` и журнал длительностей разделяют сохранение, доступ, кредит, цену, резерв, провайдера и привязку. При ранней ошибке часть этапов не записывается. Удаление лишнего HTTP-запроса и повторной проверки сессии не устраняет время внешнего провайдера.

## Card and credit boundaries / Карта и кредит

Card checkout uses the private Merit attempt flow after the required customer verification. Do not insert or update a Merit-bound order through generic legacy draft storage: database guards intentionally reject those writes. Keep canonical quote/receipt amounts and idempotency. Show customer-recognizable method names; processor names belong in internal routing/accounting.

Карточная оплата проходит через приватную попытку Merit после необходимой проверки покупателя. Нельзя сохранять связанный с Merit заказ общим маршрутом legacy: база намеренно запрещает такие записи. Сохраняйте серверные суммы и идемпотентность. Покупателю показываются понятные способы оплаты; названия процессоров остаются во внутреннем учёте.

Store credit has its own atomic debit/reservation paths. Legacy hosted creation rejects incompatible credit claims. Do not remove this rejection to make an invoice open faster. Customer surcharge, merchant expense, supplier cost and shipping collected/paid are separate amounts; private business rules and historical cost snapshots retain their own authority.

Баланс магазина использует отдельные атомарные списания и резервы. Legacy-оплата отклоняет несовместимый кредит. Нельзя убирать эту защиту ради скорости. Доплата покупателя, расход продавца, себестоимость и полученная/уплаченная доставка — разные величины; приватные правила и исторические снимки затрат сохраняют свой смысл.

## Validation / Проверка

Use a clean dependency installation for the current OS. General suite:

```sh
node --experimental-test-module-mocks --test tests/*.test.mjs tests/*.test.js api/*.test.mjs
```

Focused evidence is in `tests/checkout-single-request.test.mjs`, `tests/merit-app-wiring.test.mjs`, `api/order-checkout.test.mjs`, the provider/quote tests, and `tests/integration/merit-checkout-postgres.test.mjs`. The native integration harness requires local PostgreSQL/PostgREST executables configured by its documented environment variables; it uses synthetic identities and stubbed external providers. Inspect pass, fail and skip counts: skipped native checks do not prove database behavior. Build and typecheck separately.

Основные проверки: `tests/checkout-single-request.test.mjs`, `tests/merit-app-wiring.test.mjs`, `api/order-checkout.test.mjs`, тесты провайдеров/цены и `tests/integration/merit-checkout-postgres.test.mjs`. Native-набор требует локальные PostgreSQL/PostgREST и переменные, указанные в файле; используются синтетические аккаунты и подмена внешних провайдеров. Проверяйте pass/fail/skip: пропущенный тест не доказывает работу базы. Сборка и проверка типов выполняются отдельно.

Migrations in Git are source definitions, not proof of application. Apply database changes through the established private release workflow, preserve existing financial records, and verify the deployed commit and both domains. Do not replay uncertain customer invoices as tests.

Миграции в Git — исходные определения, а не доказательство применения. Изменения базы проходят существующий приватный процесс релиза; финансовые записи сохраняются, проверяются точный коммит и оба домена. Не повторяйте неопределённые клиентские счета ради тестирования.
