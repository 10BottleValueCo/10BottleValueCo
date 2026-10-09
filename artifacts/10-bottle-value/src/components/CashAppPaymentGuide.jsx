import { useEffect, useRef, useState } from "react";

export default function CashAppPaymentGuide({ tx, loading, disabled, amount, onContinue }) {
  const [open, setOpen] = useState(false);
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

  function continueToPayment() {
    if (loading || disabled) return;
    setOpen(false);
    void onContinue();
  }

  return (
    <>
      <button
        type="button"
        disabled={loading || disabled}
        aria-haspopup="dialog"
        aria-describedby="cashapp-lightning-help"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-4 rounded-[1.2rem] bg-[#00D64F] px-5 py-4 text-left text-[14px] font-bold text-white hover:bg-[#00b844] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{loading
          ? tx("Creating invoice…", "Создаём инвойс…", "Створюємо інвойс…", "Rechnung wird erstellt…", "Creando factura…")
          : tx("Pay with Cash App", "Оплатить через Cash App", "Оплатити через Cash App", "Mit Cash App zahlen", "Pagar con Cash App")}</span>
        {!loading && <span className="shrink-0">${amount.toFixed(2)}</span>}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="cashapp-guide-title"
        aria-describedby="cashapp-guide-instructions cashapp-guide-computer"
        onCancel={() => setOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
        className="m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-[420px] overflow-y-auto rounded-[24px] border-0 bg-white p-0 text-black shadow-2xl backdrop:bg-black/65"
      >
        <div className="p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="cashapp-guide-title" className="text-[22px] font-semibold leading-7 tracking-[-0.03em]">{tx("Pay with Cash App", "Оплата через Cash App", "Оплата через Cash App", "Mit Cash App zahlen", "Pagar con Cash App")}</h2>
              <p className="mt-1 text-[12px] text-black/50">{tx("via Bitcoin Lightning", "через Bitcoin Lightning", "через Bitcoin Lightning", "über Bitcoin Lightning", "a través de Bitcoin Lightning")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={tx("Close", "Закрыть", "Закрити", "Schließen", "Cerrar")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-[22px] leading-none hover:bg-black/10">×</button>
          </div>
          <p id="cashapp-guide-instructions" className="text-[16px] leading-6">
            {tx(
              "On the next page, tap “Open Wallet” to open Cash App. If your phone asks which app to use, choose Cash App.",
              "На следующей странице нажмите «Open Wallet», чтобы открыть Cash App. Если телефон предложит выбрать приложение, выберите Cash App.",
              "На наступній сторінці натисніть «Open Wallet», щоб відкрити Cash App. Якщо телефон запропонує вибрати застосунок, виберіть Cash App.",
              "Tippen Sie auf der nächsten Seite auf „Open Wallet“, um Cash App zu öffnen. Falls Ihr Telefon nach einer App fragt, wählen Sie Cash App.",
              "En la siguiente página, pulsa «Open Wallet» para abrir Cash App. Si tu teléfono pregunta qué aplicación usar, elige Cash App."
            )}
          </p>
          <div className="my-5 rounded-2xl bg-[#1c2056] px-5 py-5 text-center" aria-hidden="true">
            <span className="inline-flex rounded-full border border-white/70 px-6 py-3 text-[15px] font-semibold text-white">Open Wallet <span className="ml-3">↗</span></span>
          </div>
          <p id="cashapp-guide-computer" className="mb-5 rounded-xl bg-black/[0.04] px-4 py-3 text-[13px] leading-5 text-black/70">
            {tx(
              "On a computer? Scan the QR code on the next page with Cash App on your phone.",
              "Вы на компьютере? Отсканируйте QR-код на следующей странице через Cash App на телефоне.",
              "Ви на комп’ютері? Відскануйте QR-код на наступній сторінці через Cash App на телефоні.",
              "Am Computer? Scannen Sie den QR-Code auf der nächsten Seite mit Cash App auf Ihrem Telefon.",
              "¿Estás en un ordenador? Escanea el código QR de la siguiente página con Cash App en tu teléfono."
            )}
          </p>
          <button type="button" onClick={continueToPayment} disabled={loading || disabled}
            className="w-full rounded-2xl bg-[#00D64F] px-4 py-3.5 text-[14px] font-bold text-white hover:bg-[#00b844] disabled:cursor-not-allowed disabled:opacity-60">
            {tx("Got it — continue", "Понятно — продолжить", "Зрозуміло — продовжити", "Verstanden — weiter", "Entendido — continuar")}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-xl px-4 py-2 text-[13px] text-black/55 hover:bg-black/5">
            {tx("Back to checkout", "Вернуться к оформлению", "Повернутися до оформлення", "Zurück zur Kasse", "Volver al pedido")}
          </button>
        </div>
      </dialog>
    </>
  );
}
