import { useEffect, useRef } from "react";

export default function PaymentOpeningDialog({ open, tx }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog ref={dialogRef} aria-labelledby="payment-opening-title" aria-describedby="payment-opening-detail"
      onCancel={event => event.preventDefault()}
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-[24px] border-0 bg-white p-8 text-center text-black shadow-2xl backdrop:bg-black/65">
      <div role="status" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true" className="mx-auto mb-5 block h-9 w-9 animate-spin rounded-full border-[3px] border-black/10 border-t-black motion-reduce:animate-none" />
        <h2 id="payment-opening-title" className="text-[22px] font-semibold leading-7 tracking-[-0.03em]">
          {tx("Preparing your payment page", "Готовим страницу оплаты", "Готуємо сторінку оплати", "Zahlungsseite wird vorbereitet", "Preparando tu página de pago")}
        </h2>
        <p id="payment-opening-detail" className="mt-3 text-[15px] leading-6 text-black/60">
          {tx("Please keep this tab open. This may take a few seconds.", "Не закрывайте эту вкладку. Это может занять несколько секунд.", "Не закривайте цю вкладку. Це може зайняти кілька секунд.", "Bitte lassen Sie diesen Tab geöffnet. Dies kann einige Sekunden dauern.", "Mantén esta pestaña abierta. Esto puede tardar unos segundos.")}
        </p>
      </div>
    </dialog>
  );
}
