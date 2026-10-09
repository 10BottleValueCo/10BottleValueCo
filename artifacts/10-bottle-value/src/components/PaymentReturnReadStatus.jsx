import PaymentReturnHeader from "./PaymentReturnHeader.jsx";

export default function PaymentReturnReadStatus({ status = "checking", orderId, tx, onSignIn, onRetry, onSupport }) {
  const active = status === "checking" || status === "pending";
  const title = status === "signin"
    ? tx("Sign in to check payment", "Войдите для проверки оплаты", "Увійдіть для перевірки оплати", "Zur Zahlungsprüfung anmelden", "Inicia sesión para verificar el pago")
    : active
      ? tx("Checking payment", "Проверка оплаты", "Перевірка оплати", "Zahlung wird geprüft", "Verificando el pago")
      : tx("Payment not yet verified", "Оплата пока не проверена", "Оплату ще не перевірено", "Zahlung noch nicht verifiziert", "Pago aún no verificado");
  const message = status === "signin"
    ? tx("Sign in with the account used for this order to view its payment status.", "Войдите в аккаунт, с которого оформлен заказ, чтобы проверить статус оплаты.", "Увійдіть в акаунт, з якого оформлено замовлення, щоб перевірити оплату.", "Melden Sie sich mit dem Konto dieser Bestellung an, um den Zahlungsstatus zu sehen.", "Inicia sesión con la cuenta de este pedido para ver el estado del pago.")
    : status === "not-found"
      ? tx("This order could not be found for your account. Check the order number or contact support.", "Заказ не найден в вашем аккаунте. Проверьте номер заказа или обратитесь в поддержку.", "Замовлення не знайдено у вашому акаунті. Перевірте номер або зверніться до підтримки.", "Diese Bestellung wurde für Ihr Konto nicht gefunden. Prüfen Sie die Nummer oder kontaktieren Sie den Support.", "No se encontró este pedido en tu cuenta. Comprueba el número o contacta con soporte.")
      : status === "unconfirmed"
        ? tx("This order is not currently recorded as paid. Check your account or contact support before making another payment.", "Этот заказ сейчас не отмечен как оплаченный. Проверьте личный кабинет или обратитесь в поддержку перед новой оплатой.", "Це замовлення зараз не позначено як оплачене. Перевірте акаунт або зверніться до підтримки перед новою оплатою.", "Diese Bestellung ist derzeit nicht als bezahlt erfasst. Prüfen Sie Ihr Konto oder kontaktieren Sie den Support, bevor Sie erneut zahlen.", "Este pedido no figura actualmente como pagado. Consulta tu cuenta o contacta con soporte antes de pagar de nuevo.")
      : status === "unavailable"
        ? tx("We could not read the payment status. This does not mean the payment failed. Check again or contact support before paying again.", "Не удалось прочитать статус оплаты. Это не означает, что платёж отклонён. Повторите проверку или обратитесь в поддержку перед новой оплатой.", "Не вдалося прочитати статус. Це не означає відмову платежу. Перевірте знову або зверніться до підтримки перед повторною оплатою.", "Der Zahlungsstatus konnte nicht gelesen werden. Dies bedeutet keinen Zahlungsfehler. Prüfen Sie erneut oder kontaktieren Sie den Support, bevor Sie erneut zahlen.", "No pudimos consultar el estado. Esto no significa que el pago fallara. Verifica de nuevo o contacta con soporte antes de volver a pagar.")
        : status === "exhausted"
          ? tx("Automatic checking has stopped; payment is still unconfirmed. Check your account or contact support before paying again.", "Автоматическая проверка остановлена; оплата ещё не подтверждена. Проверьте личный кабинет или обратитесь в поддержку перед новой оплатой.", "Автоматичну перевірку зупинено; оплату ще не підтверджено. Перевірте акаунт або зверніться до підтримки перед повторною оплатою.", "Die automatische Prüfung wurde beendet; die Zahlung ist unbestätigt. Prüfen Sie Ihr Konto oder kontaktieren Sie den Support, bevor Sie erneut zahlen.", "La verificación automática terminó; el pago sigue sin confirmar. Consulta tu cuenta o contacta con soporte antes de volver a pagar.")
          : tx("Waiting for payment confirmation. Check the status before trying another payment.", "Ожидаем подтверждение оплаты. Проверьте статус, прежде чем оплачивать повторно.", "Очікуємо підтвердження оплати. Перевірте статус, перш ніж оплачувати повторно.", "Die Zahlungsbestätigung steht noch aus. Prüfen Sie den Status, bevor Sie erneut zahlen.", "Esperando la confirmación del pago. Consulta el estado antes de volver a pagar.");
  return (
    <section className="payment-return-card" aria-live="polite">
      <PaymentReturnHeader
        eyebrow={tx("Payment status", "Статус оплаты", "Статус оплати", "Zahlungsstatus", "Estado del pago")}
        title={title} description={message} order={orderId}
        orderLabel={tx("Order", "Заказ", "Замовлення", "Bestellung", "Pedido")}
      />
      <div className="payment-return-pending-body">
        {active && <p role="status" className="text-sm text-white/70">{tx("Checking automatically…", "Проверяем автоматически…", "Перевіряємо автоматично…", "Automatische Prüfung…", "Verificando automáticamente…")}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {status === "signin" && <button type="button" onClick={onSignIn} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black">{tx("Sign in", "Войти", "Увійти", "Anmelden", "Iniciar sesión")}</button>}
          {!active && status !== "signin" && <button type="button" onClick={onRetry} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black">{tx("Check again", "Проверить ещё раз", "Перевірити ще раз", "Erneut prüfen", "Verificar de nuevo")}</button>}
          <button type="button" onClick={onSupport} className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white">{tx("Contact support", "Написать в поддержку", "Написати в підтримку", "Support kontaktieren", "Contactar soporte")}</button>
        </div>
      </div>
    </section>
  );
}
