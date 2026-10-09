import "./PaymentReturn.css";

// Presentation only: the caller owns payment verification and chooses the copy.
export default function PaymentReturnHeader({ tone = "pending", eyebrow, title, description, order, orderLabel }) {
  return (
    <header className={`payment-return-header payment-return-header--${tone}`}>
      <div className="payment-return-header__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {tone === "success" ? <path d="m5 12 4 4L19 6" /> : tone === "cancelled" ? <><path d="m8 8 8 8m0-8-8 8" /><circle cx="12" cy="12" r="9" /></> : <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
        </svg>
      </div>
      <p className="payment-return-header__eyebrow">{eyebrow}</p>
      <h1 className="payment-return-header__title">{title}</h1>
      {description && <p className="payment-return-header__description">{description}</p>}
      {order && <div className="payment-return-header__reference"><span>{orderLabel}</span><strong>{order}</strong></div>}
    </header>
  );
}
