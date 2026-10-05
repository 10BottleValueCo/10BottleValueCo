import "./AccountDashboard.css";
import { useEffect, useState } from "react";
import { ACCOUNT_AVATARS, ACCOUNT_AVATAR_CATEGORIES, getAccountAvatar } from "../account-avatars.js";
import AffiliateAccountPanel from "./AffiliateAccountPanel.jsx";

function Icon({ name, size = 19 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
    truck: <><path d="M3 6h11v12H3z" /><path d="M14 10h4l3 3v5h-7z" /><circle cx="7.5" cy="19" r="1.8" /><circle cx="17.5" cy="19" r="1.8" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
    signout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    refresh: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    avatars: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    affiliate: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export default function AccountDashboard({
  user,
  orders = [],
  storeCredit = 0,
  hasUnreadReply = false,
  activeSection = "overview",
  tx,
  formatPrice,
  onNavigate,
  onOpenMessages,
  onEditProfile,
  onShopNow,
  onRefreshOrders,
  onTrackOrder,
  onViewOrderConfirmation,
  isRefreshingOrders = false,
  avatarSaving = false,
  avatarSaveError = "",
  avatarSaveStatus = "",
  onChooseAvatar = () => {},
  onSignOut,
  affiliateProfile = null,
  affiliateOrders = [],
  affiliatePaidOut = 0,
  affiliateLoading = false,
  affiliateOrdersError = false,
  affiliatePayoutError = false,
  affiliateLink = "",
  onRefreshAffiliate,
  onCopyAffiliateLink,
  children,
}) {
  const getVisibleAvatarCategory = (avatarId) => {
    const savedCategory = getAccountAvatar(avatarId)?.category;
    return ACCOUNT_AVATAR_CATEGORIES.some((category) => category.id === savedCategory)
      ? savedCategory
      : ACCOUNT_AVATAR_CATEGORIES[0]?.id || "cartoon";
  };
  const [avatarCategory, setAvatarCategory] = useState(() => getVisibleAvatarCategory(user?.avatarId));
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [copiedTrackingNumber, setCopiedTrackingNumber] = useState("");
  const activeAvatars = ACCOUNT_AVATARS.filter((avatar) => avatar.category === avatarCategory);

  useEffect(() => {
    setAvatarCategory(getVisibleAvatarCategory(user?.avatarId));
  }, [user?.avatarId]);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const greetingName = user?.firstName?.trim() || "Researcher";
  const shippingParts = [
    user?.address,
    user?.address2,
    user?.city,
    user?.state,
    user?.postalCode,
    user?.country,
  ].filter(Boolean);
  const hasShippingDetails = shippingParts.length > 0 || Boolean(user?.phone);
  const sortedOrders = [...orders].sort((a, b) => {
    const dateA = Date.parse(a.paidAt || a.createdAt || "") || 0;
    const dateB = Date.parse(b.paidAt || b.createdAt || "") || 0;
    return dateB - dateA;
  });

  const navItems = [
    { id: "overview", label: tx("Overview", "Обзор", "Огляд", "Übersicht", "Resumen"), icon: "home" },
    { id: "messages", label: tx("Messages", "Сообщения", "Повідомлення", "Nachrichten", "Mensajes"), icon: "message" },
    { id: "shipping", label: tx("Shipping Details", "Доставка", "Доставка", "Versanddaten", "Datos de envío"), icon: "truck" },
    { id: "security", label: tx("Security", "Безопасность", "Безпека", "Sicherheit", "Seguridad"), icon: "lock" },
    { id: "avatars", label: tx("Avatars", "Аватары", "Аватари", "Avatare", "Avatares"), icon: "avatars" },
    ...(affiliateProfile?.code
      ? [{ id: "affiliate", label: tx("Affiliate", "Партнёрка", "Партнерка", "Affiliate", "Afiliados"), icon: "affiliate" }]
      : []),
  ];

  return (
    <div className="lab-account" data-active-section={activeSection}>
      <main className="lab-dashboard" id="account-dashboard-overview">
        <aside className="lab-sidebar">
          <div className="lab-sidebar__eyebrow">
            {tx("My account", "Мой аккаунт", "Мій акаунт", "Mein Konto", "Mi cuenta")}
          </div>
          <nav className="lab-sidenav" aria-label={tx("Account navigation", "Навигация по аккаунту", "Навігація акаунтом", "Kontonavigation", "Navegación de cuenta")}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`lab-sidenav__item${activeSection === item.id ? " is-active" : ""}`}
                aria-current={activeSection === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="lab-sidebar__rule" />
          <button type="button" className="lab-sidenav__item lab-signout" onClick={onSignOut}>
            <Icon name="signout" size={19} />
            <span>{tx("Sign out", "Выйти", "Вийти", "Abmelden", "Cerrar sesión")}</span>
          </button>
        </aside>

        <div className={`lab-content${expandedOrderId ? " has-expanded-order" : ""}`}>
          {activeSection === "overview" && (
            <section className="lab-panel lab-welcome">
              <div>
                <h1>
                  {tx("Welcome back", "С возвращением", "З поверненням", "Willkommen zurück", "Te damos la bienvenida")}, {greetingName}.
                </h1>
                <p>{user?.email}</p>
                {fullName && <span className="sr-only">{fullName}</span>}
              </div>
              <div className="lab-welcome__right">
                <div className="lab-welcome__right-actions">
                  {storeCredit > 0 && <span className="lab-credit">{tx("Credit", "Баланс", "Баланс", "Guthaben", "Crédito")} {formatPrice(storeCredit)}</span>}
                  <button className="lab-outline-button" type="button" onClick={onEditProfile}>
                    {tx("Edit profile", "Изменить профиль", "Змінити профіль", "Profil bearbeiten", "Editar perfil")}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === "overview" && (
            <>
          <section className="lab-panel lab-orders" id="account-orders-preview">
            <div className="lab-panel__heading">
              <h2>{tx("Your Orders", "Ваши заказы", "Ваші замовлення", "Ihre Bestellungen", "Tus pedidos")}</h2>
              <button
                className="lab-orders__refresh"
                type="button"
                onClick={onRefreshOrders}
                disabled={isRefreshingOrders}
                aria-busy={isRefreshingOrders}
              >
                <span className={`lab-orders__refresh-icon${isRefreshingOrders ? " is-spinning" : ""}`}>
                  <Icon name="refresh" size={14} />
                </span>
                {tx("Refresh orders", "Обновить заказы", "Оновити замовлення", "Bestellungen aktualisieren", "Actualizar pedidos")}
              </button>
            </div>
            {sortedOrders.length > 0 ? (
              <div
                className={`lab-order-history${expandedOrderId ? " lab-order-history--expanded" : ""}`}
                role="list"
                aria-label={tx("Order history", "История заказов", "Історія замовлень", "Bestellverlauf", "Historial de pedidos")}
              >
                {sortedOrders.map((order, index) => {
                  const orderKey = String(order.id || order.invoiceId || `order-${index}`);
                  const isExpanded = expandedOrderId === orderKey;
                  const detailsId = `lab-order-details-${index}`;
                  const orderDateValue = order.paidAt || order.createdAt;
                  const parsedOrderDate = orderDateValue ? new Date(orderDateValue) : null;
                  const orderDate = parsedOrderDate && Number.isFinite(parsedOrderDate.getTime())
                    ? parsedOrderDate
                    : null;
                  const items = Array.isArray(order.items) ? order.items : [];
                  const status = String(order.status || "paid").toLowerCase();
                  const statusLabel = status === "done"
                    ? tx("Completed", "Завершён", "Завершено", "Abgeschlossen", "Completado")
                    : status === "paid"
                      ? tx("Paid", "Оплачен", "Оплачено", "Bezahlt", "Pagado")
                      : status;
                  const shippingType = String(order.shippingType || "standard").toLowerCase();
                  const shippingLabel = shippingType === "us-warehouse"
                    ? tx("US Warehouse", "Склад в США", "Склад у США", "US-Lager", "Almacén de EE. UU.")
                    : `${shippingType} ${tx("shipping", "доставка", "доставка", "Versand", "envío")}`;
                  const orderNotes = String(order.orderNotes || "");
                  const carrier = (orderNotes.match(/Carrier preference: (\S+)/i) || [])[1] || "";
                  const customerNotes = orderNotes
                    .replace(/\nCarrier preference: \S+/i, "")
                    .replace(/Carrier preference: \S+\n?/i, "")
                    .trim();
                  const customerDetails = [
                    { label: tx("Email", "Email", "Email", "E-Mail", "Correo"), value: order.email },
                    {
                      label: tx("Name", "Имя", "Ім’я", "Name", "Nombre"),
                      value: [order.firstName, order.lastName].filter(Boolean).join(" "),
                      emphasis: true,
                    },
                    { label: tx("Address", "Адрес", "Адреса", "Adresse", "Dirección"), value: order.address },
                    { label: tx("Apt/Suite", "Квартира/офис", "Квартира/офіс", "Wohnung/Zusatz", "Apartamento/Unidad"), value: order.address2 },
                    { label: tx("City", "Город", "Місто", "Stadt", "Ciudad"), value: order.city },
                    { label: tx("Postal code", "Индекс", "Поштовий индекс", "Postleitzahl", "Código postal"), value: order.postalCode },
                    { label: tx("State", "Область", "Область", "Bundesland", "Estado"), value: order.state },
                    { label: tx("Country", "Страна", "Країна", "Land", "País"), value: order.country },
                    { label: tx("Phone", "Телефон", "Телефон", "Telefon", "Teléfono"), value: order.phone },
                    { label: tx("Tax ID", "Налоговый номер", "Податковий номер", "Steuernummer", "NIF"), value: order.taxId },
                    { label: tx("Carrier", "Перевозчик", "Перевізник", "Versanddienst", "Transportista"), value: carrier, accent: true },
                    { label: tx("Notes", "Примечания", "Примітки", "Hinweise", "Notas"), value: customerNotes },
                  ].map((detail) => ({
                    ...detail,
                    value: detail.value == null ? "" : String(detail.value).trim(),
                  }));
                  const trackingNumbers = [
                    {
                      label: tx("Tracking #1 — tap to copy", "Трекинг №1 — нажмите, чтобы скопировать", "Трекінг №1 — натисніть, щоб скопіювати", "Tracking #1 — zum Kopieren tippen", "Seguimiento n.º 1 — toca para copiar"),
                      value: order.trackingNumber,
                    },
                    {
                      label: tx("Tracking #2 — tap to copy", "Трекинг №2 — нажмите, чтобы скопировать", "Трекінг №2 — натисніть, щоб скопіювати", "Tracking #2 — zum Kopieren tippen", "Seguimiento n.º 2 — toca para copiar"),
                      value: order.trackingNumber2,
                    },
                  ]
                    .filter((tracking) => typeof tracking.value === "string" && tracking.value.trim())
                    .map((tracking) => ({ ...tracking, value: tracking.value.trim() }));

                  return (
                    <article className={`lab-order-card${isExpanded ? " is-expanded" : ""}`} key={`${orderKey}-${index}`} role="listitem">
                      <button
                        type="button"
                        className="lab-order-card__trigger"
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        onClick={() => setExpandedOrderId((current) => current === orderKey ? null : orderKey)}
                      >
                        <div className="lab-order-card__header">
                          <div className="lab-order-card__identity">
                            {orderDate && (
                              <time className="lab-order-card__date" dateTime={orderDate.toISOString()}>
                                {orderDate.toLocaleString(undefined, {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </time>
                            )}
                            <strong className="lab-order-card__id">{order.id || order.invoiceId || "—"}</strong>
                          </div>
                          <div className="lab-order-card__payment">
                            <strong className="lab-order-card__total">{formatPrice(order.total)}</strong>
                            <span className="lab-order-card__chevron">
                              <Icon name="chevron" size={16} />
                            </span>
                          </div>
                        </div>
                        <div className="lab-order-card__summary-meta">
                          <span className="lab-order-card__status">{statusLabel}</span>
                          <span className="lab-order-card__shipping">{shippingLabel}</span>
                          {(order.trackingNumber || order.trackingNumber2) && (
                            <span className="lab-order-card__tracked">
                              {tx("Tracked", "Отслеживается", "Відстежується", "Sendung verfolgt", "Con seguimiento")}
                            </span>
                          )}
                        </div>
                      </button>
                      {items.length > 0 && (
                        <ul className="lab-order-card__items">
                          {items.map((item, itemIndex) => {
                            const itemRecord = item && typeof item === "object" && !Array.isArray(item)
                              ? item
                              : { name: String(item || "") };
                            const dose = String(itemRecord.dose || "").replace(/ each$/i, "").trim();
                            const itemName = [itemRecord.name, dose].filter(Boolean).join(" ");
                            const quantity = itemRecord.quantity ?? itemRecord.qty ?? 1;

                            return (
                              <li
                                className="lab-order-card__item"
                                key={`${itemRecord.id || itemName || "product"}-${itemIndex}`}
                              >
                                <span>{itemName || tx("Product", "Товар", "Товар", "Produkt", "Producto")}</span>
                                <span className="lab-order-card__quantity">× {quantity}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {isExpanded && (
                        <div className="lab-order-card__details" id={detailsId}>
                          {trackingNumbers.length > 0 ? (
                            <div className="lab-order-card__tracking">
                              <div className="lab-order-card__tracking-list">
                                {trackingNumbers.map((tracking, trackingIndex) => {
                                  const copyKey = `${orderKey}-${trackingIndex}`;
                                  return (
                                    <button
                                      className="lab-order-card__tracking-copy"
                                      key={copyKey}
                                      type="button"
                                      aria-label={tx("Copy tracking number", "Скопировать трек-номер", "Скопіювати трек-номер", "Sendungsnummer kopieren", "Copiar número de seguimiento")}
                                      onClick={() => {
                                        if (!navigator.clipboard?.writeText) return;
                                        navigator.clipboard.writeText(tracking.value).then(() => {
                                          setCopiedTrackingNumber(copyKey);
                                          window.setTimeout(() => {
                                            setCopiedTrackingNumber((current) => current === copyKey ? "" : current);
                                          }, 1800);
                                        }).catch(() => {});
                                      }}
                                    >
                                      <span className="lab-order-card__tracking-label">
                                        {copiedTrackingNumber === copyKey
                                          ? tx("Copied!", "Скопировано!", "Скопійовано!", "Kopiert!", "¡Copiado!")
                                          : tracking.label}
                                      </span>
                                      <strong>{tracking.value}</strong>
                                    </button>
                                  );
                                })}
                              </div>
                              {onTrackOrder && (
                                <button className="lab-order-card__track-button" type="button" onClick={onTrackOrder}>
                                  {tx("Track order", "Отследить заказ", "Відстежити замовлення", "Bestellung verfolgen", "Rastrear pedido")}
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="lab-order-card__no-tracking">
                              {tx("Tracking will appear here once your order ships.", "Трек-номер появится здесь после отправки заказа.", "Трек-номер з’явиться тут після відправлення замовлення.", "Die Sendungsverfolgung erscheint hier, sobald Ihre Bestellung versandt wurde.", "El seguimiento aparecerá aquí cuando se envíe el pedido.")}
                            </p>
                          )}
                          <dl className="lab-order-card__customer-details">
                            {customerDetails.map((detail) => (
                              <div className="lab-order-card__detail-row" key={detail.label}>
                                <dt>{detail.label}</dt>
                                <dd className={[
                                  detail.emphasis ? "is-emphasis" : "",
                                  detail.accent ? "is-accent" : "",
                                  !detail.value ? "is-empty" : "",
                                ].filter(Boolean).join(" ")}>
                                  {detail.value || "—"}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          <div className="lab-order-card__actions">
                            {onOpenMessages && (
                              <button type="button" onClick={onOpenMessages}>
                                <Icon name="message" size={13} />
                                {tx("Got questions? Message us", "Есть вопросы? Напишите нам", "Є питання? Напишіть нам", "Fragen? Schreiben Sie uns", "¿Preguntas? Escríbenos")}
                              </button>
                            )}
                            {onViewOrderConfirmation && (
                              <button type="button" onClick={() => onViewOrderConfirmation(order)}>
                                {tx("View order confirmation", "Подтверждение заказа", "Підтвердження замовлення", "Bestellbestätigung ansehen", "Ver confirmación")}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="lab-empty">
                <div className="lab-empty__icon"><Icon name="box" size={28} /></div>
                <h3>{tx("No orders yet", "Заказов пока нет", "Замовлень поки немає", "Noch keine Bestellungen", "Aún no hay pedidos")}</h3>
                <p>
                  {tx(
                    "When you place an order, it will appear here automatically.",
                    "После оформления заказа он автоматически появится здесь.",
                    "Після оформлення замовлення воно автоматично з’явиться тут.",
                    "Sobald Sie eine Bestellung aufgeben, erscheint sie hier automatisch.",
                    "Cuando hagas un pedido, aparecerá aquí automáticamente."
                  )}
                </p>
                <button className="lab-shop-button" type="button" onClick={onShopNow}>
                  {tx("Shop now", "Перейти в магазин", "До магазину", "Jetzt einkaufen", "Comprar ahora")}
                  <Icon name="arrow" size={14} />
                </button>
              </div>
            )}
          </section>

          <div className="lab-lower-grid">
            <section className="lab-panel lab-info-card" id="account-shipping-preview">
              <div className="lab-panel__heading">
                <h2>{tx("Shipping Details", "Данные доставки", "Дані доставки", "Versanddaten", "Datos de envío")}</h2>
                <button type="button" onClick={onEditProfile}>
                  {tx("Edit", "Изменить", "Змінити", "Bearbeiten", "Editar")}
                  <Icon name="arrow" size={13} />
                </button>
              </div>
              <div className="lab-info-card__body">
                <div className="lab-round-icon"><Icon name="pin" size={23} /></div>
                <div>
                  <h3>{hasShippingDetails ? (fullName || tx("Saved address", "Сохранённый адрес", "Збережена адреса", "Gespeicherte Adresse", "Dirección guardada")) : tx("Not added yet", "Пока не добавлены", "Ще не додані", "Noch nicht hinterlegt", "Aún no añadidos")}</h3>
                  <p>
                    {hasShippingDetails
                      ? shippingParts.join(", ")
                      : tx(
                          "Add your shipping details at checkout for a faster purchase experience.",
                          "Добавьте адрес доставки, чтобы быстрее оформлять покупки.",
                          "Додайте адресу доставки, щоб швидше оформлювати покупки.",
                          "Hinterlegen Sie Ihre Versanddaten für einen schnelleren Einkauf.",
                          "Añade tus datos de envío para comprar más rápido."
                        )}
                  </p>
                  {!hasShippingDetails && (
                    <button className="lab-dark-button" type="button" onClick={onEditProfile}>
                      {tx("Add shipping details", "Добавить адрес", "Додати адресу", "Versanddaten hinzufügen", "Añadir datos")}
                      <Icon name="arrow" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="lab-panel lab-info-card">
              <div className="lab-panel__heading">
                <h2>{tx("Messages", "Сообщения", "Повідомлення", "Nachrichten", "Mensajes")}</h2>
                <button type="button" onClick={onOpenMessages}>
                  {tx("View inbox", "Открыть", "Відкрити", "Postfach öffnen", "Abrir")}
                  <Icon name="arrow" size={13} />
                </button>
              </div>
              <div className="lab-info-card__body">
                <div className="lab-round-icon"><Icon name="message" size={23} /></div>
                <div>
                  <h3>{hasUnreadReply ? tx("New reply waiting", "Есть новый ответ", "Є нова відповідь", "Neue Antwort", "Nueva respuesta") : tx("Support messages", "Сообщения поддержки", "Повідомлення підтримки", "Support-Nachrichten", "Mensajes de soporte")}</h3>
                  <p>
                    {tx(
                      "Open your inbox for support replies and account updates.",
                      "Откройте сообщения, чтобы посмотреть ответы поддержки и обновления.",
                      "Відкрийте повідомлення, щоб переглянути відповіді підтримки та оновлення.",
                      "Öffnen Sie Ihr Postfach für Support-Antworten und Kontoaktualisierungen.",
                      "Abre tu bandeja para ver respuestas de soporte y novedades."
                    )}
                  </p>
                </div>
              </div>
            </section>
          </div>
            </>
          )}

          {activeSection === "avatars" && (
            <section className="lab-panel lab-avatar-panel" aria-labelledby="account-avatars-title" data-testid="panel-account-avatars">
              <div className="lab-avatar-panel__heading">
                <div>
                  <h1 id="account-avatars-title">
                    {tx("Choose your avatar", "Выберите аватар", "Оберіть аватар", "Avatar auswählen", "Elige tu avatar")}
                  </h1>
                  <p>
                    {tx(
                      "Choose a style, then pick an avatar for your account icon and messages.",
                      "Выберите категорию, затем аватар для значка аккаунта и сообщений.",
                      "Виберіть категорію, а потім аватар для значка акаунта та повідомлень.",
                      "Wähle zuerst einen Stil und dann einen Avatar für Konto und Nachrichten.",
                      "Elige un estilo y luego un avatar para tu cuenta y tus mensajes."
                    )}
                  </p>
                </div>
                {user?.avatarId && (
                  <button
                    className="lab-avatar-panel__reset"
                    type="button"
                    onClick={() => onChooseAvatar("")}
                    disabled={avatarSaving}
                  >
                    {tx("Use default icon", "Вернуть стандартный значок", "Повернути стандартний значок", "Standardsymbol verwenden", "Usar icono predeterminado")}
                  </button>
                )}
              </div>

              {(avatarSaving || avatarSaveError || avatarSaveStatus) && (
                <p
                  className={`lab-avatar-panel__status${avatarSaveError ? " is-error" : ""}`}
                  role={avatarSaveError ? "alert" : "status"}
                  aria-live="polite"
                >
                  {avatarSaveError ||
                    (avatarSaving
                      ? tx("Saving your avatar…", "Сохраняем аватар…", "Зберігаємо аватар…", "Avatar wird gespeichert…", "Guardando tu avatar…")
                      : avatarSaveStatus === "removed"
                        ? tx("Default account icon restored.", "Стандартный значок аккаунта восстановлен.", "Стандартний значок акаунта відновлено.", "Standardsymbol wiederhergestellt.", "Se restauró el icono predeterminado.")
                        : tx("Avatar saved to your account.", "Аватар сохранён в аккаунте.", "Аватар збережено в акаунті.", "Avatar im Konto gespeichert.", "Avatar guardado en tu cuenta."))}
                </p>
              )}

              <div
                className="lab-avatar-categories"
                role="group"
                aria-label={tx("Avatar styles", "Категории аватаров", "Категорії аватарів", "Avatar-Stile", "Estilos de avatar")}
              >
                {ACCOUNT_AVATAR_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    className={`lab-avatar-category${avatarCategory === category.id ? " is-active" : ""}`}
                    type="button"
                    aria-pressed={avatarCategory === category.id}
                    onClick={() => setAvatarCategory(category.id)}
                  >
                    <span>{tx(...category.label)}</span>
                    <span className="lab-avatar-category__count">{category.count}</span>
                  </button>
                ))}
              </div>

              <div
                className="lab-avatar-grid"
                role="group"
                aria-label={tx("Available avatars", "Доступные аватары", "Доступні аватари", "Verfügbare Avatare", "Avatares disponibles")}
              >
                {activeAvatars.map((avatar) => {
                  const isSelected = getAccountAvatar(user?.avatarId)?.id === avatar.id;
                  const label = tx(...avatar.label);
                  return (
                    <button
                      key={avatar.id}
                      className={`lab-avatar-option${isSelected ? " is-selected" : ""}`}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onChooseAvatar(avatar.id)}
                      disabled={avatarSaving}
                    >
                      <span className={`lab-avatar-option__image${avatar.category === "animals" ? " is-animal" : ""}`}>
                        <img src={avatar.src} alt="" />
                        {isSelected && (
                          <span className="lab-avatar-option__check" aria-hidden="true">
                            <Icon name="check" size={16} />
                          </span>
                        )}
                      </span>
                      <span className="lab-avatar-option__label">{label}</span>
                      {isSelected && (
                        <span className="lab-avatar-option__selected">
                          {tx("Selected", "Выбрано", "Вибрано", "Ausgewählt", "Seleccionado")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activeSection === "affiliate" && affiliateProfile?.code && (
            <AffiliateAccountPanel
              profile={affiliateProfile}
              orders={affiliateOrders}
              paidOut={affiliatePaidOut}
              loading={affiliateLoading}
              ordersError={affiliateOrdersError}
              payoutError={affiliatePayoutError}
              affiliateLink={affiliateLink}
              tx={tx}
              formatPrice={formatPrice}
              onRefresh={onRefreshAffiliate}
              onCopyAffiliateLink={onCopyAffiliateLink}
            />
          )}

          {["orders", "messages", "shipping", "security"].includes(activeSection) ? children : null}
        </div>
      </main>
    </div>
  );
}
