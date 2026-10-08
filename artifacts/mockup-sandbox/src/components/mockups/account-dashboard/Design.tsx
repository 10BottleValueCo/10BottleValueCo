import type { ReactNode } from "react";
import "./_group.css";

type IconName = "home" | "box" | "message" | "truck" | "lock" | "signout" | "arrow" | "pin" | "user" | "cart";

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
    truck: <><path d="M3 6h11v12H3z" /><path d="M14 10h4l3 3v5h-7z" /><circle cx="7.5" cy="19" r="1.8" /><circle cx="17.5" cy="19" r="1.8" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
    signout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    cart: <><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" /><circle cx="10" cy="21" r="1" /><circle cx="18" cy="21" r="1" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const navItems: { label: string; icon: IconName }[] = [
  { label: "Overview", icon: "home" },
  { label: "Orders", icon: "box" },
  { label: "Messages", icon: "message" },
  { label: "Shipping Details", icon: "truck" },
  { label: "Security", icon: "lock" },
];

export function Design() {
  return (
    <div className="lab-account">
      <div className="lab-account__photo" aria-hidden="true" />
      <div className="lab-account__shade" aria-hidden="true" />

      <header className="lab-header">
        <a className="lab-brand" href="#" aria-label="10BottleValueCo home">
          <span className="lab-brand__mark" aria-hidden="true">
            <svg viewBox="0 0 26 38" fill="none">
              <path d="M9 2h8v5l3 3v22a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V10l3-3V2Z" fill="#eaf1f5" stroke="#111820" strokeWidth="1.4" />
              <path d="M7 14h12v13H7z" fill="#1759c2" />
              <text x="13" y="24" textAnchor="middle" fill="white" fontSize="10" fontFamily="Arial" fontWeight="700">10</text>
            </svg>
          </span>
          <span>10BottleValueCo</span>
        </a>
        <nav className="lab-topnav" aria-label="Main navigation">
          <a href="#">Home</a>
          <a href="#">Shop (Worldwide)</a>
          <a href="#">Shop (US Warehouse)</a>
          <a href="#">Shipping Prices</a>
          <a href="#">FAQ</a>
          <a href="#">Contact</a>
          <a href="#">Track Order</a>
        </nav>
        <div className="lab-header__actions">
          <button className="lab-user-button" type="button" aria-label="Account"><Icon name="user" size={17} /></button>
          <button className="lab-cart" type="button"><Icon name="cart" size={13} /> Cart (4)</button>
        </div>
      </header>

      <main className="lab-dashboard">
        <aside className="lab-sidebar">
          <div className="lab-sidebar__eyebrow">My account</div>
          <nav className="lab-sidenav" aria-label="Account navigation">
            {navItems.map((item, index) => (
              <a href="#" key={item.label} className={`lab-sidenav__item${index === 0 ? " is-active" : ""}`}>
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <div className="lab-sidebar__rule" />
          <a href="#" className="lab-sidenav__item lab-signout"><Icon name="signout" size={19} /><span>Sign out</span></a>
        </aside>

        <div className="lab-content">
          <section className="lab-panel lab-welcome">
            <div>
              <h1>Welcome back, Chris.</h1>
              <p>chrisz934@gmail.com</p>
            </div>
            <div className="lab-welcome__right">
              <span className="lab-status"><i />Account active</span>
              <button className="lab-outline-button" type="button">Edit profile <Icon name="arrow" size={15} /></button>
            </div>
          </section>

          <section className="lab-panel lab-orders">
            <div className="lab-panel__heading">
              <h2>Your Orders</h2>
              <a href="#">View all orders <Icon name="arrow" size={13} /></a>
            </div>
            <div className="lab-empty">
              <div className="lab-empty__icon"><Icon name="box" size={28} /></div>
              <h3>No orders yet</h3>
              <p>When you place an order, it will appear here<br className="lab-desktop-break" /> automatically.</p>
              <button className="lab-shop-button" type="button">Shop now <Icon name="arrow" size={14} /></button>
            </div>
          </section>

          <div className="lab-lower-grid">
            <section className="lab-panel lab-info-card">
              <div className="lab-panel__heading">
                <h2>Shipping Details</h2>
                <a href="#">Edit <Icon name="arrow" size={13} /></a>
              </div>
              <div className="lab-info-card__body">
                <div className="lab-round-icon"><Icon name="pin" size={23} /></div>
                <div>
                  <h3>Not added yet</h3>
                  <p>Add your shipping details at checkout<br className="lab-desktop-break" /> for a faster purchase experience.</p>
                  <button className="lab-dark-button" type="button">Add shipping details <Icon name="arrow" size={14} /></button>
                </div>
              </div>
            </section>
            <section className="lab-panel lab-info-card">
              <div className="lab-panel__heading">
                <h2>Messages</h2>
                <a href="#">View inbox <Icon name="arrow" size={13} /></a>
              </div>
              <div className="lab-info-card__body">
                <div className="lab-round-icon"><Icon name="message" size={23} /></div>
                <div>
                  <h3>No messages yet</h3>
                  <p>We’ll notify you here about your orders,<br className="lab-desktop-break" /> shipping updates, and important information.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
