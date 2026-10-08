import { useMemo, useState } from "react";
import "./AffiliateAccountPanel.css";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getOrderStatusLabel(status, tx) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "done" || normalized === "delivered") {
    return tx("Delivered", "Доставлен", "Доставлено", "Zugestellt", "Entregado");
  }
  if (normalized === "paid") {
    return tx("Paid", "Оплачен", "Оплачено", "Bezahlt", "Pagado");
  }
  if (["checkout", "pending", "pending_payment", "awaiting_payment"].includes(normalized)) {
    return tx("Awaiting payment", "Ожидает оплаты", "Очікує оплати", "Zahlung ausstehend", "Pendiente de pago");
  }
  if (["cancelled", "canceled"].includes(normalized)) {
    return tx("Cancelled", "Отменён", "Скасовано", "Storniert", "Cancelado");
  }
  if (normalized === "refunded") {
    return tx("Refunded", "Возвращён", "Повернено", "Erstattet", "Reembolsado");
  }
  return normalized ? normalized.replaceAll("_", " ") : tx("Order recorded", "Заказ учтён", "Замовлення враховано", "Bestellung erfasst", "Pedido registrado");
}

function finiteAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function money(formatPrice, value) {
  const amount = finiteAmount(value);
  return typeof formatPrice === "function"
    ? formatPrice(amount)
    : `$${amount.toFixed(2)}`;
}

function isPaidOrder(order) {
  return ["paid", "done"].includes(String(order?.status || "").toLowerCase());
}

export default function AffiliateAccountPanel({
  profile,
  orders = [],
  paidOut = null,
  loading = false,
  ordersError = false,
  payoutError = false,
  affiliateLink = "",
  tx,
  formatPrice,
  onRefresh,
  onCopyAffiliateLink,
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const paidOrders = useMemo(
    () => orders.filter((order) => isPaidOrder(order) && order.commissionEligible),
    [orders],
  );
  const eligibleOrders = useMemo(
    () => paidOrders,
    [paidOrders],
  );
  const pendingEarnings = useMemo(
    () => eligibleOrders
      .filter((order) => !order.commissionAvailable)
      .reduce((sum, order) => sum + finiteAmount(order.commission_amount), 0),
    [eligibleOrders],
  );
  const releasedEarnings = useMemo(
    () => eligibleOrders
      .filter((order) => order.commissionAvailable)
      .reduce((sum, order) => sum + finiteAmount(order.commission_amount), 0),
    [eligibleOrders],
  );
  const trackedSales = useMemo(
    () => eligibleOrders.reduce((sum, order) => sum + finiteAmount(order.order_total), 0),
    [eligibleOrders],
  );
  const payoutKnown = !payoutError && typeof paidOut === "number" && Number.isFinite(paidOut) && paidOut >= 0;
  const balanceKnown = !ordersError && payoutKnown;
  const availableBalance = balanceKnown ? Math.max(0, releasedEarnings - paidOut) : null;
  const profileRate = Number(profile?.commissionRate);
  const commissionRate = Math.round((Number.isFinite(profileRate) && profileRate > 0 ? profileRate : 0.1) * 100);
  const sortedOrders = useMemo(
    () => [...paidOrders].sort((a, b) => {
      const dateA = Date.parse(a.created_at || "") || 0;
      const dateB = Date.parse(b.created_at || "") || 0;
      return dateB - dateA;
    }),
    [paidOrders],
  );

  async function handleCopyLink() {
    if (!affiliateLink || typeof onCopyAffiliateLink !== "function") {
      setCopyStatus("failed");
      return;
    }
    try {
      const copied = await onCopyAffiliateLink();
      setCopyStatus(copied ? "copied" : "failed");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <section className="lab-panel lab-affiliate-panel" aria-labelledby="account-affiliate-title">
      <header className="lab-affiliate-panel__heading">
        <div>
          <h1 id="account-affiliate-title">
            {tx("Affiliate dashboard", "Партнёрская панель", "Партнерська панель", "Affiliate-Dashboard", "Panel de afiliados")}
          </h1>
          <p>
            {tx(
              "Your referral orders, sales, and commission balance.",
              "Ваши заказы по ссылке, продажи и баланс комиссий.",
              "Ваші замовлення за посиланням, продажі та баланс комісій.",
              "Ihre vermittelten Bestellungen, Verkäufe und Provisionen.",
              "Tus pedidos referidos, ventas y saldo de comisiones.",
            )}
          </p>
        </div>
        <button
          className="lab-affiliate-panel__refresh"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-busy={loading}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5" />
            <path d="M5.6 9A7 7 0 0 1 18.3 6.7L20 12M4 12l1.7 5.3A7 7 0 0 0 18.4 15" />
          </svg>
          {loading
            ? tx("Loading…", "Загрузка…", "Завантаження…", "Wird geladen…", "Cargando…")
            : tx("Refresh", "Обновить", "Оновити", "Aktualisieren", "Actualizar")}
        </button>
      </header>

      <div className="lab-affiliate-code-card">
        <div className="lab-affiliate-code-card__details">
          <span className="lab-affiliate-eyebrow">
            {tx("Your referral code", "Ваш партнёрский код", "Ваш партнерський код", "Ihr Empfehlungscode", "Tu código de afiliado")}
          </span>
          <strong>{profile?.code || "—"}</strong>
          {affiliateLink && (
            <input
              className="lab-affiliate-code-card__link"
              type="text"
              aria-label={tx("Affiliate link", "Партнёрская ссылка", "Партнерське посилання", "Affiliate-Link", "Enlace de afiliado")}
              readOnly
              value={affiliateLink}
              onFocus={(event) => event.currentTarget.select()}
            />
          )}
        </div>
        <div className="lab-affiliate-code-card__action">
          <span className="lab-affiliate-rate">
            {tx("Commission", "Комиссия", "Комісія", "Provision", "Comisión")} · {commissionRate}%
          </span>
          <button type="button" onClick={handleCopyLink} disabled={!affiliateLink}>
            {copyStatus === "copied"
              ? tx("Copied", "Скопировано", "Скопійовано", "Kopiert", "Copiado")
              : tx("Copy link", "Скопировать ссылку", "Скопіювати посилання", "Link kopieren", "Copiar enlace")}
          </button>
          {copyStatus === "failed" && (
            <span className="lab-affiliate-copy-status" role="status">
              {tx("Select the link above to copy it.", "Выделите ссылку выше и скопируйте её.", "Виділіть посилання вище та скопіюйте його.", "Markieren Sie den Link oben und kopieren Sie ihn.", "Selecciona y copia el enlace de arriba.")}
            </span>
          )}
        </div>
      </div>

      <div className="lab-affiliate-stats" aria-label={tx("Affiliate summary", "Сводка партнёрства", "Зведення партнерства", "Affiliate-Übersicht", "Resumen de afiliación")}>
        <article className="lab-affiliate-stat">
          <span>{tx("Paid orders", "Оплаченные заказы", "Оплачені замовлення", "Bezahlte Bestellungen", "Pedidos pagados")}</span>
          <strong>{ordersError ? "—" : paidOrders.length}</strong>
        </article>
        <article className="lab-affiliate-stat">
          <span>{tx("Paid sales", "Продажи по оплаченным заказам", "Продажі за оплаченими замовленнями", "Umsatz aus bezahlten Bestellungen", "Ventas de pedidos pagados")}</span>
          <strong>{ordersError ? "—" : money(formatPrice, trackedSales)}</strong>
        </article>
        <article className="lab-affiliate-stat">
          <span>{tx("Commission earned", "Начислено комиссий", "Нараховано комісій", "Verdiente Provision", "Comisiones generadas")}</span>
          <strong>{ordersError ? "—" : money(formatPrice, pendingEarnings + releasedEarnings)}</strong>
        </article>
        <article className="lab-affiliate-stat">
          <span>{tx("Pending", "Ожидает разблокировки", "Очікує розблокування", "Ausstehend", "Pendiente")}</span>
          <strong>{ordersError ? "—" : money(formatPrice, pendingEarnings)}</strong>
        </article>
        <article className="lab-affiliate-stat lab-affiliate-stat--available">
          <span>{tx("Available balance", "Доступно к выплате", "Доступно до виплати", "Verfügbares Guthaben", "Saldo disponible")}</span>
          <strong>{loading ? "…" : balanceKnown ? money(formatPrice, availableBalance) : "—"}</strong>
        </article>
        <article className="lab-affiliate-stat lab-affiliate-stat--paid">
          <span>{tx("Paid out", "Уже выплачено", "Вже виплачено", "Ausgezahlt", "Pagado")}</span>
          <strong>{loading ? "…" : payoutKnown ? money(formatPrice, paidOut) : "—"}</strong>
        </article>
      </div>

      {!loading && !payoutKnown && (
        <div className="lab-affiliate-empty" role="status">
          {tx("Payout history is unavailable. Use Refresh to verify your paid-out total and available balance.", "История выплат недоступна. Нажмите «Обновить», чтобы проверить сумму выплат и доступный баланс.", "Історія виплат недоступна. Натисніть «Оновити», щоб перевірити суму виплат і доступний баланс.", "Auszahlungsverlauf nicht verfügbar. Aktualisieren Sie die Daten, um ausgezahlte Summe und verfügbares Guthaben zu prüfen.", "El historial de pagos no está disponible. Pulsa Actualizar para verificar el total pagado y el saldo disponible.")}
        </div>
      )}

      {!loading && ordersError && (
        <div className="lab-affiliate-empty" role="status">
          {tx("Order history is incomplete or unavailable. Use Refresh to verify commission and available balance.", "История заказов неполна или недоступна. Нажмите «Обновить», чтобы проверить комиссию и доступный баланс.", "Історія замовлень неповна або недоступна. Натисніть «Оновити», щоб перевірити комісію та доступний баланс.", "Der Bestellverlauf ist unvollständig oder nicht verfügbar. Aktualisieren Sie die Daten, um Provision und verfügbares Guthaben zu prüfen.", "El historial de pedidos está incompleto o no disponible. Pulsa Actualizar para verificar las comisiones y el saldo disponible.")}
        </div>
      )}

      <section className="lab-affiliate-orders" aria-labelledby="account-affiliate-orders-title">
        <div className="lab-affiliate-orders__heading">
          <div>
            <h2 id="account-affiliate-orders-title">
              {tx("Paid referral orders", "Оплаченные заказы по вашей ссылке", "Оплачені замовлення за вашим посиланням", "Bezahlte vermittelte Bestellungen", "Pedidos referidos pagados")}
            </h2>
            <p>
              {tx("Order values and commission status. Customer details are not shown.", "Суммы заказов и статус комиссии. Данные покупателей не показываются.", "Суми замовлень і статус комісії. Дані покупців не показуються.", "Bestellwerte und Provisionsstatus. Kundendaten werden nicht angezeigt.", "Importes y estado de comisión. No se muestran datos de los clientes.")}
            </p>
          </div>
          <span className="lab-affiliate-orders__count">{ordersError ? "—" : sortedOrders.length}</span>
        </div>

        {loading && sortedOrders.length === 0 ? (
          <div className="lab-affiliate-empty" role="status">
            {tx("Loading your affiliate activity…", "Загружаем партнёрские данные…", "Завантажуємо партнерські дані…", "Affiliate-Aktivität wird geladen…", "Cargando actividad de afiliación…")}
          </div>
        ) : sortedOrders.length === 0 && !ordersError ? (
          <div className="lab-affiliate-empty">
            {tx("No referred orders have been recorded yet.", "Пока нет заказов по вашей ссылке.", "Поки немає замовлень за вашим посиланням.", "Es wurden noch keine vermittelten Bestellungen erfasst.", "Aún no hay pedidos referidos.")}
          </div>
        ) : (
          <div className="lab-affiliate-order-list">
            {sortedOrders.map((order) => {
              const orderStatus = String(order.status || "").toLowerCase();
              const shippingLabel = [order.from_warehouse, order.shipping_type]
                .filter(Boolean)
                .map((value) => String(value).replaceAll("_", " "))
                .join(" · ");
              const commissionEligible = Boolean(order.commissionEligible);
              const commissionStatus = !commissionEligible
                ? tx("No commission yet", "Комиссия пока не начислена", "Комісію ще не нараховано", "Noch keine Provision", "Sin comisión todavía")
                : order.commissionAvailable
                  ? tx("Available", "Доступна", "Доступна", "Verfügbar", "Disponible")
                  : tx("Pending until", "Ожидает до", "Очікує до", "Ausstehend bis", "Pendiente hasta");

              return (
                <article className="lab-affiliate-order" key={order.order_id}>
                  <div className="lab-affiliate-order__main">
                    <div className="lab-affiliate-order__title">
                      <strong>{order.order_id}</strong>
                      <span className={`lab-affiliate-order__status is-${orderStatus.replace(/[^a-z0-9_-]/g, "-") || "unknown"}`}>
                        {getOrderStatusLabel(orderStatus, tx)}
                      </span>
                      {shippingLabel && (
                        <span className="lab-affiliate-order__shipping">{shippingLabel}</span>
                      )}
                    </div>
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <p className="lab-affiliate-order__items">
                        {order.items
                          .map((item) => [item?.name, item?.dose].filter(Boolean).join(" "))
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    <span className="lab-affiliate-order__date">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="lab-affiliate-order__amount">
                    <span>{tx("Order total", "Сумма заказа", "Сума замовлення", "Bestellwert", "Total del pedido")}</span>
                    <strong>{order.order_total == null ? "—" : money(formatPrice, order.order_total)}</strong>
                  </div>
                  <div className="lab-affiliate-order__commission">
                    <span>{tx("Commission", "Комиссия", "Комісія", "Provision", "Comisión")}</span>
                    <strong>{money(formatPrice, order.commission_amount)}</strong>
                    <small>
                      {commissionStatus}
                      {commissionEligible && !order.commissionAvailable && order.available_at
                        ? ` ${formatDate(order.available_at)}`
                        : ""}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="lab-affiliate-note">
        {tx(
          "Commissions are released after the return window: 6 days for US warehouse orders, 10 days for Express, and 15 days for Standard.",
          "Комиссии становятся доступными после периода возврата: 6 дней для заказов со склада США, 10 дней для Express и 15 дней для Standard.",
          "Комісії стають доступними після періоду повернення: 6 днів для замовлень зі складу США, 10 днів для Express і 15 днів для Standard.",
          "Provisionen werden nach Ablauf der Rückgabefrist freigegeben: 6 Tage für US-Lager, 10 Tage für Express und 15 Tage für Standard.",
          "Las comisiones se liberan tras el plazo de devolución: 6 días para almacén de EE. UU., 10 días para Express y 15 días para Standard.",
        )}
      </p>
    </section>
  );
}
