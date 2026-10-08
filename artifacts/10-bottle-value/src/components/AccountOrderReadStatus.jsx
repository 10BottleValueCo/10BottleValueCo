export default function AccountOrderReadStatus({ status, tx }) {
  if (status === "complete") return null;
  return (
    <div className="lab-empty" role="status">
      <p>
        {status === "error"
          ? tx(
              "Order history is unavailable. Use Refresh orders to try again.",
              "История заказов недоступна. Нажмите «Обновить заказы», чтобы повторить попытку.",
              "Історія замовлень недоступна. Натисніть «Оновити замовлення», щоб спробувати ще раз.",
              "Der Bestellverlauf ist nicht verfügbar. Klicken Sie auf „Bestellungen aktualisieren“, um es erneut zu versuchen.",
              "El historial de pedidos no está disponible. Pulsa Actualizar pedidos para intentarlo de nuevo.",
            )
          : tx(
              "Loading your orders…",
              "Загружаем ваши заказы…",
              "Завантажуємо ваші замовлення…",
              "Ihre Bestellungen werden geladen…",
              "Cargando tus pedidos…",
            )}
      </p>
    </div>
  );
}
