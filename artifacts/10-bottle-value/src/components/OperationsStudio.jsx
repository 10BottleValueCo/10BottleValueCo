import { useEffect, useState } from "react";
import { loadOperationsStudio } from "../operations-studio.js";
import "./OperationsStudio.css";

const words = {
  en: {
    title: "Operations studio", subtitle: "A current view of recorded orders and browser activity.", private: "ADMIN ONLY", language: "Language / Язык",
    range: "Period", days: "days", day: "day", refresh: "Refresh", loading: "Checking the current records…", checked: "Read at", utc: "UTC",
    auth: "Sign in again with the authorized admin account to read operations data.", unavailable: "This source could not be verified. Refresh to retry; its totals remain unknown.", smaller: "This period contains more orders than a complete read can safely include. Choose a shorter period.",
    orders: "Recorded orders", ordersSub: "Orders created in the selected rolling period, grouped by their current status.", rows: "Order records", paid: "Currently marked paid", paidHint: "A database status, not confirmed settlements.", allHint: "Includes checkout, pending, cancelled and other states.",
    status: "Current status", count: "Records", emptyOrders: "The complete query returned no orders for this creation period.", stateNote: "A refresh reads the database as it stands. Test orders and business duplicates are not independently excluded. Changes during pagination can affect a read even when its count checks pass.",
    dayHeading: "Orders by creation day", dayHint: "UTC creation dates; the first and last day can be partial. The paid column shows current status, not payments received on that day.", date: "Creation date", paidShort: "Now paid", quality: "Payment record gaps", missingPayment: "Paid rows without payment ID", missingPaidAt: "Paid rows without a usable paid date", missingTotal: "Paid rows without a usable amount",
    finance: "Money needs reconciliation", financeText: "Revenue, payout cash, fees, supplier cost and profit remain unknown here. A paid status or payment ID does not establish settlement. Currency and merchant records must be verified before money is combined.",
    traffic: "Browser activity", trafficSub: "A separate browser-reported source. It does not prove payment or verified visitors.", events: "Stored events read", identifiers: "Browser identifiers", identifiersHint: "Mixed legacy browser IDs and newer tab sessions; not people.", legacy: "Legacy events", event: "Event", activity: "Events read", emptyTraffic: "The query returned no stored browser events for this period. This does not prove that nobody visited.", sampled: "PARTIAL SAMPLE", complete: "REQUESTED WINDOW", sampleText: "Only the latest 5,000 events were read. Counts below describe that sample; they are not totals for the selected period.", eventsNote: "Tracking can be blocked or forged. Missing instrumentation remains unknown. Older IDs persisted in the browser; no visitor conversion rate is inferred.",
    instrumentation: "Sign-in and warehouse/strength events are new instrumentation. Counts begin only after deployed events are stored; earlier activity is not backfilled. No linked customer-conversion cohort is available.",
    freshness: "The two sources are read separately and may have slightly different cutoffs. Refresh is manual. Private results stay in memory and clear on sign-out or account changes.", source: "Source window", noMoney: "Not reconciled",
    statuses: { paid: "Paid", pending: "Pending", checkout: "Checkout", "checkout (clicked pay)": "Checkout · clicked pay", cancelled: "Cancelled", canceled: "Cancelled", failed: "Failed", refunded: "Refunded", expired: "Expired", processing: "Processing", shipped: "Shipped", delivered: "Delivered", other: "Other / unspecified" },
    eventNames: { page_view: "Page view", page_exit: "Page exit", product_view: "Product view", add_to_cart: "Add to cart", checkout_started: "Checkout started", checkout_step: "Checkout step", order_placed: "Order submitted in browser", ui_click: "Interface click", form_submit: "Form submitted", auth_started: "Sign-in started", auth_code_sent: "Sign-in code sent", auth_verified: "Sign-in verified in browser", auth_failed: "Sign-in failed", product_selection_changed: "Warehouse / strength changed", other: "Other" },
  },
  ru: {
    title: "Центр управления", subtitle: "Текущие записи заказов и браузерная активность.", private: "ТОЛЬКО АДМИНИСТРАТОР", language: "Language / Язык",
    range: "Период", days: "дней", day: "день", refresh: "Обновить", loading: "Проверяем текущие записи…", checked: "Прочитано", utc: "UTC",
    auth: "Войдите повторно под разрешённым администратором, чтобы загрузить данные.", unavailable: "Источник не удалось проверить. Обновите страницу для повтора; итоги остаются неизвестными.", smaller: "За этот период слишком много заказов для полной ограниченной выгрузки. Выберите более короткий период.",
    orders: "Записи заказов", ordersSub: "Заказы, созданные за выбранный скользящий период, с группировкой по текущему статусу.", rows: "Записей заказов", paid: "Сейчас имеют статус paid", paidHint: "Статус базы, не подтверждённые расчёты.", allHint: "Включая оформление, ожидание, отмену и другие состояния.",
    status: "Текущий статус", count: "Записей", emptyOrders: "Полный запрос не вернул заказов за выбранный период создания.", stateNote: "Обновление читает текущее состояние базы. Тестовые заказы и деловые дубликаты независимо не исключены. Изменения между страницами могут повлиять на чтение, даже если проверки числа строк прошли.",
    dayHeading: "Заказы по дню создания", dayHint: "Даты создания по UTC; первый и последний дни могут быть неполными. Столбец paid показывает текущий статус, а не платежи, полученные в этот день.", date: "Дата создания", paidShort: "Сейчас paid", quality: "Пробелы платёжных записей", missingPayment: "У paid нет payment ID", missingPaidAt: "У paid нет пригодной даты оплаты", missingTotal: "У paid нет пригодной суммы",
    finance: "Деньги требуют сверки", financeText: "Выручка, выплаты, комиссии, закупочная стоимость и прибыль здесь неизвестны. Статус paid или payment ID не подтверждают расчёт. Перед объединением сумм нужно проверить валюту и документы магазина.",
    traffic: "Браузерная активность", trafficSub: "Отдельный источник браузерных событий. Он не доказывает оплату или подтверждённых посетителей.", events: "Прочитано событий", identifiers: "Идентификаторы браузера", identifiersHint: "Смесь старых ID браузеров и новых сессий вкладок; не люди.", legacy: "Старые события", event: "Событие", activity: "Прочитано событий", emptyTraffic: "Запрос не вернул сохранённых браузерных событий за этот период. Это не доказывает отсутствие посещений.", sampled: "ЧАСТИЧНАЯ ВЫБОРКА", complete: "ЗАПРОШЕННЫЙ ПЕРИОД", sampleText: "Прочитаны только последние 5 000 событий. Числа ниже относятся к этой выборке, а не ко всему выбранному периоду.", eventsNote: "Сбор событий может блокироваться, а события — подделываться. Недостающие измерения остаются неизвестными. Старые ID сохранялись в браузере; конверсия посетителей не предполагается.",
    instrumentation: "События входа и выбора склада/дозировки — новые измерения. Отсчёт начинается только после публикации и сохранения событий; прежняя активность не восстановлена. Связанной когорты для расчёта клиентской конверсии нет.",
    freshness: "Источники читаются отдельно; границы времени могут немного отличаться. Обновление ручное. Частные результаты хранятся только в памяти и очищаются при выходе или смене аккаунта.", source: "Период источника", noMoney: "Не сверено",
    statuses: { paid: "Paid", pending: "Ожидание", checkout: "Оформление", "checkout (clicked pay)": "Оформление · нажата оплата", cancelled: "Отменён", canceled: "Отменён", failed: "Ошибка", refunded: "Возврат", expired: "Истёк", processing: "В обработке", shipped: "Отправлен", delivered: "Доставлен", other: "Другое / не указано" },
    eventNames: { page_view: "Просмотр страницы", page_exit: "Выход со страницы", product_view: "Просмотр товара", add_to_cart: "Добавление в корзину", checkout_started: "Начато оформление", checkout_step: "Шаг оформления", order_placed: "Заказ отправлен из браузера", ui_click: "Нажатие в интерфейсе", form_submit: "Отправка формы", auth_started: "Начат вход", auth_code_sent: "Отправлен код входа", auth_verified: "Вход подтверждён в браузере", auth_failed: "Ошибка входа", product_selection_changed: "Изменён склад / дозировка", other: "Другое" },
  },
};

function Metric({ label, value, hint }) {
  return <div className="ops-metric"><span>{label}</span><strong>{value}</strong><p>{hint}</p></div>;
}
function SourceWindow({ metadata, t, formatDate }) {
  return <div className="ops-source"><span>{t.source}: {formatDate(metadata.since)} — {formatDate(metadata.until)} · {t.utc}</span><span>{t.checked}: {formatDate(metadata.fetchedAt)} · {t.utc}</span></div>;
}
function LoadNotice({ state, t }) {
  return <div className="ops-notice" role={state?.status === "error" ? "alert" : "status"}>{state?.status === "loading" ? t.loading : state?.error === "range" ? t.smaller : t.unavailable}</div>;
}

export default function OperationsStudio({ supabase, expectedEmail }) {
  const [language, setLanguage] = useState("en");
  const [days, setDays] = useState(30);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState({ status: "loading" });
  const email = String(expectedEmail || "").trim().toLowerCase();
  const key = `${email}:${days}:${refresh}`;
  const current = state.key === key ? state : { status: "loading" };
  const t = words[language];
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const formatCount = value => new Intl.NumberFormat(locale).format(value);
  const formatDate = value => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));

  useEffect(() => {
    let active = true;
    let sessionUserId = null;
    const controller = new AbortController();
    setState({ key, status: "loading" });
    const observeSession = session => {
      const id = session?.user?.id;
      if (typeof id !== "string" || !id || String(session.user?.email || "").trim().toLowerCase() !== email
        || (sessionUserId !== null && sessionUserId !== id)) {
        active = false;
        controller.abort();
        setState({ key, status: "auth" });
      } else sessionUserId = id;
    };
    const subscription = supabase.auth.onAuthStateChange?.((_event, session) => observeSession(session));
    loadOperationsStudio({ supabase, expectedEmail: email, days, signal: controller.signal, isCurrent: () => active, onSession: observeSession })
      .then(value => { if (active && value) setState({ key, status: "ready", ...value }); })
      .catch(error => { if (active) setState({ key, status: error?.code === "auth" ? "auth" : "error" }); });
    return () => {
      active = false;
      controller.abort();
      subscription?.data?.subscription?.unsubscribe();
    };
  }, [supabase, email, days, refresh]);

  const loading = current.status === "loading";
  const ordersState = current.orders || { status: current.status };
  const trafficState = current.traffic || { status: current.status };
  const orders = ordersState.status === "ready" ? ordersState.value : null;
  const traffic = trafficState.status === "ready" ? trafficState.value : null;

  return <section className="ops-studio" aria-label={t.title} aria-busy={loading}>
    <header className="ops-header">
      <div><span className="ops-eyebrow">10BVC · {t.private}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <div className="ops-language" role="group" aria-label={t.language}>
        {Object.keys(words).map(code => <button type="button" key={code} aria-pressed={language === code} onClick={() => setLanguage(code)}>{code.toUpperCase()}</button>)}
      </div>
    </header>
    <div className="ops-controls">
      <label>{t.range}<select value={days} onChange={event => setDays(Number(event.target.value))}>{[1, 7, 30, 90].map(value => <option key={value} value={value}>{value} {value === 1 ? t.day : t.days}</option>)}</select></label>
      <button type="button" className="ops-refresh" disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? t.loading : t.refresh}</button>
    </div>
    {current.status === "auth" ? <div className="ops-notice" role="alert">{t.auth}</div> : <>
      <section className="ops-panel">
        <div className="ops-panel-heading"><h2>{t.orders}</h2><p>{t.ordersSub}</p></div>
        {orders ? <>
          <div className="ops-metrics"><Metric label={t.rows} value={formatCount(orders.summary.totalOrders)} hint={t.allHint} /><Metric label={t.paid} value={formatCount(orders.summary.paidStatusOrders)} hint={t.paidHint} /><Metric label={t.finance} value="—" hint={t.noMoney} /></div>
          {orders.summary.statuses.length ? <div className="ops-table-scroll"><table><thead><tr><th scope="col">{t.status}</th><th scope="col">{t.count}</th></tr></thead><tbody>{orders.summary.statuses.map(row => <tr key={row.status}><td>{t.statuses[row.status]}</td><td>{formatCount(row.count)}</td></tr>)}</tbody></table></div> : <p className="ops-empty">{t.emptyOrders}</p>}
          <p className="ops-caveat">{t.stateNote}</p><SourceWindow metadata={orders.metadata} t={t} formatDate={formatDate} />
        </> : <LoadNotice state={ordersState} t={t} />}
      </section>
      <div className="ops-columns">
        <section className="ops-panel"><div className="ops-panel-heading"><h2>{t.quality}</h2></div>{orders ? <dl className="ops-quality">{[["paidMissingPaymentId", t.missingPayment], ["paidMissingPaidAt", t.missingPaidAt], ["paidMissingTotal", t.missingTotal]].map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{formatCount(orders.summary[field])}</dd></div>)}</dl> : <LoadNotice state={ordersState} t={t} />}</section>
        <section className="ops-panel ops-finance"><div className="ops-panel-heading"><h2>{t.finance}</h2></div><p>{t.financeText}</p></section>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading"><h2>{t.traffic}</h2><p>{t.trafficSub}</p></div>
        {traffic ? <>
          <div className={`ops-coverage ${traffic.metadata.truncated ? "ops-partial" : ""}`}><strong>{traffic.metadata.truncated ? t.sampled : t.complete}</strong>{traffic.metadata.truncated && <p>{t.sampleText}</p>}</div>
          <div className="ops-metrics"><Metric label={t.events} value={formatCount(traffic.totalEvents)} hint={t.trafficSub} /><Metric label={t.identifiers} value={formatCount(traffic.browserIdentifiers)} hint={t.identifiersHint} /><Metric label={t.legacy} value={formatCount(traffic.legacyEvents)} hint={t.identifiersHint} /></div>
          {traffic.events.length ? <div className="ops-table-scroll"><table><thead><tr><th scope="col">{t.event}</th><th scope="col">{t.activity}</th></tr></thead><tbody>{traffic.events.map(row => <tr key={row.event}><td>{t.eventNames[row.event]}</td><td>{formatCount(row.count)}</td></tr>)}</tbody></table></div> : <p className="ops-empty">{t.emptyTraffic}</p>}
          <p className="ops-caveat">{t.eventsNote}</p><p className="ops-caveat">{t.instrumentation}</p><SourceWindow metadata={traffic.metadata} t={t} formatDate={formatDate} />
        </> : <LoadNotice state={trafficState} t={t} />}
      </section>
      {orders?.summary.daily.length > 0 && <section className="ops-panel"><div className="ops-panel-heading"><h2>{t.dayHeading}</h2><p>{t.dayHint}</p></div><div className="ops-table-scroll ops-daily"><table><thead><tr><th scope="col">{t.date}</th><th scope="col">{t.count}</th><th scope="col">{t.paidShort}</th></tr></thead><tbody>{orders.summary.daily.map(row => <tr key={row.date}><td>{row.date}</td><td>{formatCount(row.orders)}</td><td>{formatCount(row.paidStatusOrders)}</td></tr>)}</tbody></table></div></section>}
    </>}
    <footer className="ops-footer">{t.freshness}</footer>
  </section>;
}
