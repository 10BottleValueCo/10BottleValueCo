const words = {
  en: {
    title: "Merit payment fees", loading: "Checking private Merit payment records…",
    unavailable: "Private Merit payment records could not be verified. Fee amounts remain unknown.",
    shorter: "This period contains too many Merit payments for a complete read. Choose a shorter period.",
    empty: "No completed live Merit payments were recorded in this period.",
    eligible: "Payments included", charged: "Recorded card charges", credit: "Store credit redeemed", orderValue: "Order value including card surcharge", surcharge: "Customer card surcharge collected",
    expense: "Estimated processing expense", burden: "Expense after customer surcharge", unknown: "Unknown",
    surchargeHint: "Already included in the charge amount; do not add it again.",
    expenseHint: "Calculated only when the saved percentage and charged-amount basis are known.",
    burdenHint: "Processing expense minus the customer surcharge. A negative value is an excess surcharge before other costs.",
    excluded: "Excluded refund/reversal records", unclear: "Excluded records with unclear status or amounts", missing: "Included payments with unknown processing expense",
    scope: "Only canonical live Merit payment attempts are included, grouped by their recorded paid time. Refunds and unclear order states are excluded. Counts and amounts can change between pages.",
    profit: "Net profit remains unknown. These are saved-rate estimates, not settlement fees; store credit is a separate payment source, not new card revenue. Its original funding, other processor fees, supplier costs and operating costs are not established here.",
    window: "Payment window", checked: "Read at",
  },
  ru: {
    title: "Комиссии платежей Merit", loading: "Проверяем закрытые записи платежей Merit…",
    unavailable: "Закрытые записи платежей Merit не удалось проверить. Суммы комиссий остаются неизвестными.",
    shorter: "За период слишком много платежей Merit для полной выгрузки. Выберите более короткий период.",
    empty: "За этот период завершённые реальные платежи Merit не записаны.",
    eligible: "Учтено платежей", charged: "Записанная сумма списаний с карт", credit: "Использованный кредит магазина", orderValue: "Сумма заказов с доплатой за карту", surcharge: "Полученная доплата клиента за карту",
    expense: "Оценка расходов на обработку", burden: "Расходы после доплаты клиента", unknown: "Неизвестно",
    surchargeHint: "Уже входит в сумму списания; повторно прибавлять её не нужно.",
    expenseHint: "Расчёт возможен только при известных сохранённых проценте и базе полной суммы списания.",
    burdenHint: "Расходы на обработку минус доплата клиента. Отрицательное значение — избыток доплаты до прочих затрат.",
    excluded: "Исключено записей возвратов/оспариваний", unclear: "Исключено записей с неясным статусом или суммами", missing: "Учтено платежей с неизвестными расходами на обработку",
    scope: "Учитываются только канонические реальные попытки оплаты Merit по записанному времени оплаты. Возвраты и неясные статусы заказа исключены. Число записей и суммы могут меняться между страницами.",
    profit: "Чистая прибыль неизвестна. Это оценки по сохранённым ставкам, а не комиссии из взаиморасчётов; кредит магазина — отдельный источник оплаты, а не новое поступление с карты. Его исходное финансирование, прочие комиссии, затраты поставщика и операционные расходы здесь не установлены.",
    window: "Период оплаты", checked: "Прочитано",
  },
};

export default function MeritFeesPanel({ source, language = "en" }) {
  const t = words[language] || words.en;
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const number = value => new Intl.NumberFormat(locale).format(value);
  const money = value => value === null ? t.unknown : new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value / 100);
  const when = value => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
  const ready = source?.status === "ready" ? source.value : null;
  const summary = ready?.summary;
  return <section className="ops-panel ops-finance" aria-label={t.title}>
    <div className="ops-panel-heading"><h2>{t.title}</h2></div>
    {summary ? <>
      {summary.recordedPaidAttempts === 0 ? <p className="ops-empty">{t.empty}</p> : <>
        <p>{t.eligible}: {number(summary.eligibleAttempts)} · {t.charged}: {money(summary.chargedAmountCents)}</p>
        {summary.storeCreditUsedCents > 0 && <p>{t.credit}: {money(summary.storeCreditUsedCents)} · {t.orderValue}: {money(summary.orderValueCents)}</p>}
        <div className="ops-metrics">
          {[[t.surcharge, summary.customerCardSurchargeCents, t.surchargeHint], [t.expense, summary.processorExpenseEstimateCents, t.expenseHint], [t.burden, summary.merchantFeeBurdenEstimateCents, t.burdenHint]].map(([label, value, hint]) => <div className="ops-metric" key={label}><span>{label}</span><strong>{money(value)}</strong><p>{hint}</p></div>)}
        </div>
        <dl className="ops-quality">{[[t.excluded, summary.excludedRefundOrReversal], [t.unclear, summary.excludedUnknown], [t.missing, summary.feeUnknownAttempts]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
      </>}
      <p className="ops-caveat">{t.scope}</p>
      <div className="ops-source"><span>{t.window}: {when(ready.metadata.since)} — {when(ready.metadata.until)} · UTC</span><span>{t.checked}: {when(ready.metadata.fetchedAt)} · UTC</span></div>
    </> : <div className="ops-notice" role={source?.status === "loading" ? "status" : "alert"}>{source?.status === "loading" ? t.loading : source?.error === "range" ? t.shorter : t.unavailable}</div>}
    <p className="ops-caveat">{t.profit}</p>
  </section>;
}
