// @ts-nocheck
import "./AccountDashboard.css";

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
    refresh: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
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
  onRefreshOrders = () => {},
  isRefreshingOrders = false,
  showRefreshOrders = false,
  onSignOut,
  children,
  hideOrdersItem = false,
}) {
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
  const recentOrder = [...orders].sort((a, b) => {
    const dateA = Date.parse(a.paidAt || a.createdAt || "") || 0;
    const dateB = Date.parse(b.paidAt || b.createdAt || "") || 0;
    return dateB - dateA;
  })[0];

  const navItems = [
    { id: "overview", label: tx("Overview", "Обзор", "Огляд", "Übersicht", "Resumen"), icon: "home" },
    { id: "orders", label: tx("Orders", "Заказы", "Замовлення", "Bestellungen", "Pedidos"), icon: "box" },
    { id: "messages", label: tx("Messages", "Сообщения", "Повідомлення", "Nachrichten", "Mensajes"), icon: "message" },
    { id: "shipping", label: tx("Shipping Details", "Доставка", "Доставка", "Versanddaten", "Datos de envío"), icon: "truck" },
    { id: "security", label: tx("Security", "Безопасность", "Безпека", "Sicherheit", "Seguridad"), icon: "lock" },
  ].filter((item) => !hideOrdersItem || item.id !== "orders");

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

        <div className="lab-content">
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
                    <Icon name="arrow" size={15} />
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
              {showRefreshOrders ? (
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
              ) : (
                <button type="button" onClick={() => onNavigate("orders")}>
                  {tx("View all orders", "Все заказы", "Усі замовлення", "Alle Bestellungen", "Ver todos")}
                  <Icon name="arrow" size={13} />
                </button>
              )}
            </div>
            {recentOrder ? (
              <div className="lab-order-preview">
                <div className="lab-order-preview__icon"><Icon name="box" size={27} /></div>
                <div className="lab-order-preview__data">
                  <span className="lab-order-preview__eyebrow">{tx("Most recent order", "Последний заказ", "Останнє замовлення", "Letzte Bestellung", "Pedido más reciente")}</span>
                  <strong className="lab-order-preview__id">{recentOrder.id}</strong>
                  <span className="lab-order-preview__meta">
                    {tx("Paid", "Оплачен", "Оплачено", "Bezahlt", "Pagado")} · {formatPrice(recentOrder.total)}
                  </span>
                </div>
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

          {["orders", "messages", "shipping", "security"].includes(activeSection) ? children : null}
        </div>
      </main>
    </div>
  );
}
