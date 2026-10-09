import { useState } from "react";
import "./AffiliateProgramPage.css";

const affiliateEmail = "support@10bottlevalue.co";
const applyHref = `mailto:${affiliateEmail}?subject=Affiliate%20Program%20Application`;

function FeatureIcon({ kind }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (kind === "commission") {
    return (
      <svg {...common}>
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    );
  }

  if (kind === "lifetime") {
    return (
      <svg {...common}>
        <path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4z" />
        <path d="M12 12c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z" />
      </svg>
    );
  }

  if (kind === "tracking") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h17" />
        <path d="m7 15 4-4 3 2 6-7" />
        <path d="M16 6h4v4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20 13 11 22l-9-9V2h11l9 9a1.4 1.4 0 0 1-2 2Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 shrink-0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function AffiliateProgramPage({
  tx,
  copiedEmail,
  onCopyEmail,
  onContact,
  getPublicImageUrl = (src) => src,
  onVialImageError,
}) {
  const [openFaq, setOpenFaq] = useState(-1);
  const base = import.meta.env.BASE_URL;
  const publicImage = (path) => getPublicImageUrl(`${base}${path}`);

  const benefits = [
    {
      icon: "commission",
      title: tx("10% COMMISSION", "10% КОМИССИИ", "10% КОМІСІЇ", "10% PROVISION", "10% DE COMISIÓN"),
      description: tx(
        "Earn on qualifying orders tracked through your code.",
        "Получайте комиссию с подходящих заказов, отслеживаемых по вашему коду.",
        "Отримуйте комісію з відповідних замовлень, відстежених за вашим кодом.",
        "Verdiene an qualifizierten Bestellungen, die über Ihren Code erfasst werden.",
        "Gana con los pedidos aptos registrados con tu código.",
      ),
    },
    {
      icon: "lifetime",
      title: tx("LIFETIME ATTRIBUTION", "ПОЖИЗНЕННАЯ АТРИБУЦИЯ", "ДОВІЧНА АТРИБУЦІЯ", "DAUERHAFTE ZUORDNUNG", "ATRIBUCIÓN DE POR VIDA"),
      description: tx(
        "Each referred customer stays linked to your code for life. Earn 10% on every completed order.",
        "Каждый привлечённый клиент навсегда закрепляется за вашим кодом. Получайте 10% с каждого выполненного заказа.",
        "Кожен залучений клієнт назавжди закріплюється за вашим кодом. Отримуйте 10% з кожного виконаного замовлення.",
        "Jeder geworbene Kunde bleibt dauerhaft Ihrem Code zugeordnet. Sie erhalten 10 % auf jede abgeschlossene Bestellung.",
        "Cada cliente referido queda vinculado a tu código para siempre. Gana un 10 % por cada pedido completado.",
      ),
    },
    {
      icon: "tracking",
      title: tx("AUTOMATIC TRACKING", "АВТОМАТИЧЕСКИЙ УЧЁТ", "АВТОМАТИЧНЕ ВІДСТЕЖЕННЯ", "AUTOMATISCHE ERFASSUNG", "SEGUIMIENTO AUTOMÁTICO"),
      description: tx(
        "Eligible referrals and orders are tracked automatically.",
        "Подходящие переходы и заказы отслеживаются автоматически.",
        "Відповідні переходи та замовлення відстежуються автоматично.",
        "Qualifizierte Empfehlungen und Bestellungen werden automatisch erfasst.",
        "Las referencias y los pedidos aptos se registran automáticamente.",
      ),
    },
    {
      icon: "discount",
      title: tx("5% FOR NEW CUSTOMERS", "5% ДЛЯ НОВЫХ КЛИЕНТОВ", "5% ДЛЯ НОВИХ КЛІЄНТІВ", "5% FÜR NEUKUNDEN", "5% PARA NUEVOS CLIENTES"),
      description: tx(
        "Your referred customers get 5% off their first purchase.",
        "Новые клиенты по вашей рекомендации получают скидку 5% на первую покупку.",
        "Нові клієнти за вашою рекомендацією отримують знижку 5% на першу покупку.",
        "Geworbene Neukunden erhalten 5% Rabatt auf ihren ersten Einkauf.",
        "Tus clientes referidos obtienen un 5% de descuento en su primera compra.",
      ),
    },
  ];

  const stories = [
    {
      id: "commission",
      image: "commission-photo.jpg",
      title: tx("10% COMMISSION", "10% КОМИССИИ", "10% КОМІСІЇ", "10% PROVISION", "10% DE COMISIÓN"),
      copy: tx(
        "Earn on eligible tracked orders from customers you refer.",
        "Получайте комиссию с подходящих заказов привлечённых вами клиентов.",
        "Отримуйте комісію з відповідних замовлень залучених вами клієнтів.",
        "Verdienen Sie an qualifizierten erfassten Bestellungen geworbener Kunden.",
        "Gana con los pedidos aptos registrados de los clientes que refieras.",
      ),
      href: "#how-it-works",
    },
    {
      id: "tracking",
      image: "lifetime-earnings-photo.jpg",
      title: tx("LIFETIME ATTRIBUTION", "ПОЖИЗНЕННАЯ АТРИБУЦИЯ", "ДОВІЧНА АТРИБУЦІЯ", "LEBENSLANGE ZUORDNUNG", "ATRIBUCIÓN DE POR VIDA"),
      copy: tx(
        "Each customer you refer stays attributed to your code for life. You earn 10% commission on every order they place. Commission is credited only for completed orders.",
        "Каждый привлечённый вами клиент навсегда закрепляется за вашим кодом. Вы получаете 10% комиссии с каждого его заказа. Комиссия начисляется только за выполненные заказы.",
        "Кожен залучений вами клієнт назавжди закріплюється за вашим кодом. Ви отримуєте 10% комісії з кожного його замовлення. Комісію нараховують лише за виконані замовлення.",
        "Jeder von Ihnen geworbene Kunde bleibt dauerhaft Ihrem Code zugeordnet. Sie erhalten 10 % Provision auf jede Bestellung dieses Kunden. Provision wird nur für abgeschlossene Bestellungen gutgeschrieben.",
        "Cada cliente que refieras quedará vinculado a tu código para siempre. Recibirás una comisión del 10 % por cada pedido que realice. La comisión solo se acredita por pedidos completados.",
      ),
      href: "#affiliate-faq",
    },
    {
      id: "creators",
      image: "creators.jpg",
      title: tx("CREATOR PARTNERS", "АВТОРЫ И ПАРТНЁРЫ", "АВТОРИ Й ПАРТНЕРИ", "CREATOR-PARTNER", "CREADORES SOCIOS"),
      copy: tx(
        "We consider applications from creators with audiences of every size—small and large. Everyone can become part of 10BottleValueCo.",
        "Мы рассматриваем заявки от авторов с любой аудиторией — и небольшой, и большой. Каждый может стать частью 10BottleValueCo.",
        "Ми розглядаємо заявки від авторів з аудиторією будь-якого розміру — і невеликою, і великою. Кожен може стати частиною 10BottleValueCo.",
        "Wir berücksichtigen Bewerbungen von Creators mit jeder Reichweite – klein oder groß. Alle können Teil von 10BottleValueCo werden.",
        "Consideramos solicitudes de creadores con audiencias de cualquier tamaño, pequeñas o grandes. Todos pueden formar parte de 10BottleValueCo.",
      ),
      href: "#affiliate-apply",
    },
  ];

  const steps = [
    {
      number: "01",
      title: tx("APPLY", "ПОДАЙТЕ ЗАЯВКУ", "ПОДАЙТЕ ЗАЯВКУ", "BEWERBEN", "POSTÚLATE"),
      description: tx(
        "Email us a short introduction about what you do. We’ll review your application.",
        "Напишите нам коротко о себе и своей деятельности. Мы рассмотрим заявку.",
        "Коротко розкажіть про себе та свою діяльність електронною поштою. Ми розглянемо заявку.",
        "Schreiben Sie uns kurz, was Sie machen. Wir prüfen Ihre Bewerbung.",
        "Envíanos una breve presentación sobre lo que haces. Revisaremos tu solicitud.",
      ),
    },
    {
      number: "02",
      title: tx("SHARE", "ДЕЛИТЕСЬ", "ДІЛІТЬСЯ", "TEILEN", "COMPARTE"),
      description: tx(
        "If approved, our team will set up your affiliate code for you to share.",
        "После одобрения команда создаст ваш партнёрский код, которым можно делиться.",
        "Після схвалення команда створить ваш партнерський код, яким можна ділитися.",
        "Nach der Freigabe richtet unser Team Ihren Affiliate-Code zum Teilen ein.",
        "Si se aprueba, nuestro equipo configurará tu código de afiliado para que lo compartas.",
      ),
    },
    {
      number: "03",
      title: tx("EARN", "ЗАРАБАТЫВАЙТЕ", "ЗАРОБЛЯЙТЕ", "VERDIENEN", "GANA"),
      description: tx(
        "Earn 10% on qualifying orders after the order is delivered to the customer.",
        "Получайте 10% с подходящих заказов после доставки заказа клиенту.",
        "Отримуйте 10% із відповідних замовлень після доставки замовлення клієнту.",
        "Erhalten Sie 10% auf qualifizierte Bestellungen, sobald die Bestellung beim Kunden zugestellt wurde.",
        "Recibe un 10% en pedidos aptos cuando el pedido se haya entregado al cliente.",
      ),
    },
  ];

  const faqItems = [
    {
      question: tx("How much commission can I earn?", "Какую комиссию я могу получать?", "Яку комісію я можу отримувати?", "Wie viel Provision kann ich verdienen?", "¿Cuánta comisión puedo ganar?"),
      answer: tx(
        "The affiliate commission is 10% on qualifying tracked orders from customers you refer.",
        "Партнёрская комиссия составляет 10% с подходящих отслеживаемых заказов привлечённых вами клиентов.",
        "Партнерська комісія становить 10% із відповідних відстежуваних замовлень залучених вами клієнтів.",
        "Die Affiliate-Provision beträgt 10% auf qualifizierte erfasste Bestellungen geworbener Kunden.",
        "La comisión de afiliado es del 10% en pedidos aptos registrados de los clientes que refieras.",
      ),
    },
    {
      question: tx("Do referred customers get a discount?", "Получают ли привлечённые клиенты скидку?", "Чи отримують залучені клієнти знижку?", "Erhalten geworbene Kunden einen Rabatt?", "¿Los clientes referidos reciben un descuento?"),
      answer: tx(
        "Yes. Your referred customers receive 5% off their first purchase.",
        "Да. Привлечённые вами клиенты получают скидку 5% на первую покупку.",
        "Так. Залучені вами клієнти отримують знижку 5% на першу покупку.",
        "Ja. Geworbene Kunden erhalten 5% Rabatt auf ihren ersten Einkauf.",
        "Sí. Tus clientes referidos reciben un 5% de descuento en su primera compra.",
      ),
    },
    {
      question: tx("How long does attribution last?", "Как долго сохраняется атрибуция?", "Як довго зберігається атрибуція?", "Wie lange bleibt die Zuordnung bestehen?", "¿Cuánto dura la atribución?"),
      answer: tx(
        "Orders from referred customers remain attributed to your code for their lifetime. Commission applies only to eligible tracked orders.",
        "Заказы привлечённых клиентов остаются привязаны к вашему коду пожизненно. Комиссия начисляется только за подходящие отслеживаемые заказы.",
        "Замовлення залучених клієнтів залишаються прив’язаними до вашого коду довічно. Комісія нараховується лише за відповідні відстежувані замовлення.",
        "Bestellungen geworbener Kunden bleiben Ihrem Code dauerhaft zugeordnet. Provision gilt nur für qualifizierte erfasste Bestellungen.",
        "Los pedidos de clientes referidos permanecen vinculados a tu código de por vida. La comisión solo aplica a pedidos aptos registrados.",
      ),
    },
    {
      question: tx("How do I apply?", "Как подать заявку?", "Як подати заявку?", "Wie kann ich mich bewerben?", "¿Cómo puedo postularme?"),
      answer: tx(
        "Email support@10bottlevalue.co with a short introduction about your work and audience. Our team reviews applications and sets up access manually.",
        "Напишите на support@10bottlevalue.co и коротко расскажите о своей работе и аудитории. Команда рассмотрит заявку и вручную настроит доступ.",
        "Напишіть на support@10bottlevalue.co і коротко розкажіть про свою діяльність та аудиторію. Команда розгляне заявку й вручну налаштує доступ.",
        "Schreiben Sie an support@10bottlevalue.co und stellen Sie Ihre Arbeit und Zielgruppe kurz vor. Unser Team prüft Bewerbungen und richtet den Zugang manuell ein.",
        "Escribe a support@10bottlevalue.co con una breve presentación de tu trabajo y audiencia. Nuestro equipo revisa las solicitudes y configura el acceso manualmente.",
      ),
    },
    {
      question: tx("When are commissions paid?", "Когда выплачиваются комиссии?", "Коли виплачуються комісії?", "Wann werden Provisionen ausgezahlt?", "¿Cuándo se pagan las comisiones?"),
      answer: tx(
        "Commissions are released once the customer's order has been delivered. You can receive payment as 10BottleValueCo store credits or cryptocurrency. Fiat payouts are being considered for the future.",
        "Комиссия выплачивается после доставки заказа клиенту. Получить выплату можно кредитами 10BottleValueCo для покупок в магазине или в криптовалюте. Выплаты в фиатной валюте рассматриваются на будущее.",
        "Комісія виплачується після доставки замовлення клієнту. Отримати виплату можна кредитами 10BottleValueCo для покупок у магазині або криптовалютою. Виплати у фіатній валюті розглядаються на майбутнє.",
        "Provisionen werden ausgezahlt, sobald die Bestellung beim Kunden zugestellt wurde. Die Auszahlung ist als 10BottleValueCo-Guthaben für Einkäufe im Shop oder in Kryptowährung möglich. Fiat-Auszahlungen werden für die Zukunft geprüft.",
        "Las comisiones se pagan cuando el pedido se entrega al cliente. El pago puede recibirse en créditos de 10BottleValueCo para compras en la tienda o en criptomonedas. Se están considerando pagos en moneda fiduciaria para el futuro.",
      ),
    },
  ];

  return (
    <main
      className="affiliate-program-page mx-auto w-full max-w-[1240px] px-4 pb-12 pt-2 uppercase sm:px-6 md:px-8 md:pb-16 md:pt-2"
    >
      <section
        id="affiliate-top"
        aria-labelledby="affiliate-title"
        className="affiliate-program-hero relative isolate grid overflow-hidden rounded-2xl border border-white/10 shadow-[0_14px_36px_rgba(0,0,0,.16)] lg:min-h-[370px] lg:grid-cols-[1.02fr_.98fr]"
      >
        <div className="relative z-10 flex flex-col items-start justify-center px-6 pb-2 pt-8 sm:px-9 sm:pt-10 lg:px-12 lg:py-12">
          <h1
            id="affiliate-title"
            className="max-w-[690px] text-[clamp(2rem,4vw,4.5rem)] font-black uppercase leading-[0.9] tracking-[-0.055em] text-white sm:text-[clamp(2.5rem,5.5vw,5.5rem)]"
          >
            {tx("EARN", "ЗАРАБАТЫВАЙТЕ", "ЗАРОБЛЯЙТЕ", "VERDIENEN", "GANA")}{" "}
            <span className="text-white">10%</span>
            <br />
            {tx("COMMISSION", "КОМИССИИ", "КОМІСІЇ", "PROVISION", "DE COMISIÓN")}
          </h1>
          <p className="affiliate-program-description mt-5 max-w-[520px] text-sm leading-relaxed text-white sm:text-base lg:text-lg">
            {tx(
              "Partner with 10BottleValueCo and earn by sharing research products with your audience. Your referrals save 5% on their first purchase.",
              "Станьте партнёром 10BottleValueCo и рассказывайте своей аудитории о наших продуктах для исследований. Ваши клиенты получат скидку 5% на первую покупку.",
              "Станьте партнером 10BottleValueCo та розповідайте своїй аудиторії про наші продукти для досліджень. Ваші клієнти отримають знижку 5% на першу покупку.",
              "Werden Sie Partner von 10BottleValueCo und teilen Sie Forschungsprodukte mit Ihrer Zielgruppe. Geworbene Kunden erhalten 5% Rabatt auf ihren ersten Einkauf.",
              "Colabora con 10BottleValueCo y comparte productos de investigación con tu audiencia. Tus referidos obtienen un 5% de descuento en su primera compra.",
            )}
          </p>
          <div className="mt-7 flex w-full flex-wrap items-center gap-3 pb-7 lg:pb-0">
            <button
              type="button"
              onClick={onContact}
              className="inline-flex min-h-10 items-center justify-center gap-3 rounded-full bg-[#2878ff] px-6 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#1268f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220] lg:min-h-[60px] lg:gap-4 lg:px-10 lg:text-sm"
            >
              {tx("APPLY NOW", "ПОДАТЬ ЗАЯВКУ", "ПОДАТИ ЗАЯВКУ", "JETZT BEWERBEN", "SOLICITAR AHORA")}
              <ArrowRight />
            </button>
          </div>
        </div>

        <div className="affiliate-program-hero-shelf pointer-events-none absolute bottom-[8%] right-[-3%] z-[1] h-11 w-[59%] -skew-y-2 border-y border-[#b9c5db]/20 bg-gradient-to-b from-[#93a3c2]/20 via-[#2b3b55]/90 to-[#111b2a] shadow-[0_-5px_22px_rgba(40,90,190,.1)] lg:right-[-7%]" />
        <div
          className="relative min-h-[250px] overflow-hidden sm:min-h-[330px] lg:absolute lg:inset-y-0 lg:right-0 lg:w-[54%]"
          aria-label={tx("Featured 10BottleValueCo products", "Продукты 10BottleValueCo", "Продукти 10BottleValueCo", "Produkte von 10BottleValueCo", "Productos de 10BottleValueCo")}
        >
          <div className="relative z-10 mx-auto flex h-full min-h-[250px] max-w-[600px] items-end justify-center gap-0 px-4 pb-[5%] sm:min-h-[330px] lg:min-h-[370px] lg:px-2">
            <img
              src={publicImage("vials-c/tb-500-bpc-157-3ab3e8693952.webp")}
              data-original-src={`${base}vials-c/tb-500-bpc-157-3ab3e8693952.webp`}
              alt=""
              aria-hidden="true"
              className="relative z-[1] h-[58%] max-h-[285px] w-[28%] translate-x-8 object-contain drop-shadow-[0_20px_22px_rgba(0,0,0,.55)] sm:translate-x-12 lg:translate-x-16"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={onVialImageError}
            />
            <img
              src={publicImage("vials-c/bpc-157-4a596acd979f.webp")}
              data-original-src={`${base}vials-c/bpc-157-4a596acd979f.webp`}
              alt=""
              aria-hidden="true"
              className="relative z-[2] h-[78%] max-h-[380px] w-[34%] object-contain drop-shadow-[0_24px_28px_rgba(0,0,0,.65)]"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={onVialImageError}
            />
            <img
              src={publicImage("vials-c/retatrutide-glp-3-0efb04b0071d.webp")}
              data-original-src={`${base}vials-c/retatrutide-glp-3-0efb04b0071d.webp`}
              alt=""
              aria-hidden="true"
              className="relative z-[1] h-[62%] max-h-[310px] w-[28%] -translate-x-8 object-contain drop-shadow-[0_20px_22px_rgba(0,0,0,.55)] sm:-translate-x-12 lg:-translate-x-16"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={onVialImageError}
            />
          </div>
        </div>
      </section>

      <section
        aria-label={tx("Affiliate benefits", "Преимущества партнёрства", "Переваги партнерства", "Affiliate-Vorteile", "Ventajas de afiliación")}
        className="relative z-20 -mt-2 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#27292d] shadow-[0_10px_26px_rgba(0,0,0,.16)] md:grid-cols-4"
      >
        {benefits.map((benefit, index) => (
          <div
            key={benefit.title}
            className={`flex min-h-[112px] items-start gap-3 px-4 py-5 sm:px-5 sm:py-6 ${index > 0 ? "border-l border-white/10" : ""} ${index > 1 ? "border-t border-white/10 md:border-t-0" : ""}`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2878ff]/15 text-[#5595ff]">
              <FeatureIcon kind={benefit.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-black uppercase leading-tight tracking-wide text-white sm:text-xs">
                {benefit.title}
              </span>
              <span className="mt-1.5 block text-[11px] leading-relaxed text-white/85 sm:text-xs">
                {benefit.description}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section
        aria-label={tx("Affiliate program details", "Подробности партнёрской программы", "Деталі партнерської програми", "Details zum Affiliate-Programm", "Detalles del programa de afiliados")}
        className="mt-5 grid gap-4 md:grid-cols-3"
      >
        {stories.map((story) => (
          <a
            key={story.id}
            href={story.href}
            className="relative isolate flex min-h-[220px] flex-col justify-start overflow-hidden rounded-xl border border-white/10 bg-[#11151c] p-5 shadow-[0_9px_24px_rgba(0,0,0,.17)] sm:p-6"
          >
            <>
              <img
                src={publicImage(`affiliate/${story.image}`)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 -z-20 h-full w-full object-cover"
                style={{
                  filter: "saturate(.95) brightness(.96) contrast(.98)",
                  objectPosition: "center 52%",
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,8,14,.92)_0%,rgba(4,8,14,.68)_42%,rgba(4,8,14,.1)_100%),linear-gradient(0deg,rgba(4,8,14,.64)_0%,rgba(4,8,14,.04)_70%)]"
              />
            </>
            <span className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#78aaff]">
              {tx("PARTNER BENEFIT", "ПРЕИМУЩЕСТВО ПАРТНЁРА", "ПЕРЕВАГА ПАРТНЕРА", "PARTNERVORTEIL", "VENTAJA PARA SOCIOS")}
            </span>
            <h2 className="text-lg font-black uppercase leading-tight text-white sm:text-xl">
              {story.title}
            </h2>
            <p className="mt-2 max-w-[38rem] text-xs leading-relaxed text-white/75 sm:text-sm">
              {story.copy}
            </p>
          </a>
        ))}
      </section>

      <section id="how-it-works" className="mt-5 w-full rounded-xl border border-white/10 bg-[#292929] px-4 py-4 shadow-[0_9px_24px_rgba(0,0,0,.14)] sm:px-5 sm:py-5">
        <div className="grid gap-3 md:grid-cols-[minmax(130px,.7fr)_repeat(3,minmax(0,1fr))] md:items-center md:gap-0 md:divide-x md:divide-white/10">
          <div className="md:pr-3 lg:pr-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8db5ff]">
              {tx("THREE SIMPLE STEPS", "ТРИ ПРОСТЫХ ШАГА", "ТРИ ПРОСТІ КРОКИ", "DREI EINFACHE SCHRITTE", "TRES PASOS SENCILLOS")}
            </p>
            <h2 className="mt-1 text-base font-black uppercase leading-tight text-white sm:text-lg">
              {tx("HOW IT WORKS", "КАК ЭТО РАБОТАЕТ", "ЯК ЦЕ ПРАЦЮЄ", "SO FUNKTIONIERT ES", "CÓMO FUNCIONA")}
            </h2>
          </div>
          {steps.map((step, index) => (
            <div key={step.number} className={`flex gap-2.5 md:px-3 lg:px-4 ${index === 0 ? "md:pl-3 lg:pl-4" : ""} ${index === steps.length - 1 ? "md:pr-0" : ""}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2878ff] text-[10px] font-black text-white sm:h-8 sm:w-8 sm:text-xs">
                {step.number}
              </span>
              <span>
                <span className="block text-xs font-black uppercase tracking-wide text-white">
                  {step.title}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-white/65 sm:text-xs">
                  {step.description}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="affiliate-apply" className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div
          className="relative isolate flex min-h-[150px] flex-col justify-center overflow-hidden rounded-xl border border-white/10 bg-[#11151c] p-4 shadow-[0_8px_22px_rgba(0,0,0,.14)] sm:p-5"
          style={{
            backgroundImage:
              `linear-gradient(90deg,rgba(4,8,14,.88) 0%,rgba(4,8,14,.56) 55%,rgba(4,8,14,.12) 100%),url("${publicImage("affiliate/creators.jpg")}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <span className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8db5ff]">
            {tx("A PARTNERSHIP BUILT ON TRUST", "ПАРТНЁРСТВО, ОСНОВАННОЕ НА ДОВЕРИИ", "ПАРТНЕРСТВО, ЗАСНОВАНЕ НА ДОВІРІ", "EINE PARTNERSCHAFT AUF VERTRAUEN", "UNA COLABORACIÓN BASADA EN LA CONFIANZA")}
          </span>
          <h2 className="max-w-[560px] text-2xl font-black uppercase leading-tight text-white sm:text-3xl">
            {tx("WHO CAN APPLY?", "КТО МОЖЕТ ПОДАТЬ ЗАЯВКУ?", "ХТО МОЖЕ ПОДАТИ ЗАЯВКУ?", "WER KANN SICH BEWERBEN?", "¿QUIÉN PUEDE POSTULARSE?")}
          </h2>
          <p className="mt-3 max-w-[620px] text-sm leading-relaxed text-white/75">
            {tx(
              "Creators with audiences of any size can apply.",
              "Подать заявку может любой автор с аудиторией любого размера.",
              "Подати заявку може будь-який автор з аудиторією будь-якого розміру.",
              "Creator mit jeder Zielgruppengröße können sich bewerben.",
              "Pueden postularse creadores con audiencias de cualquier tamaño.",
            )}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 rounded-xl border border-white/10 bg-[#292929] p-4 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white">
              {tx("APPLY VIA EMAIL", "ПОДАЙТЕ ЗАЯВКУ ПО EMAIL", "ПОДАЙТЕ ЗАЯВКУ ЕЛЕКТРОННОЮ ПОШТОЮ", "BEWERBUNG PER E-MAIL", "SOLICITA POR CORREO")}
            </p>
          </div>
          <a
            href={applyHref}
            className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-3 text-xs font-bold text-white transition hover:border-[#2878ff]/70 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2878ff]"
          >
            <span className="truncate">{affiliateEmail}</span>
            <ArrowRight />
          </a>
          <button
            type="button"
            onClick={onCopyEmail}
            className="self-start text-[11px] font-semibold text-white/60 underline underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2878ff]"
          >
            {copiedEmail
              ? tx("EMAIL COPIED", "EMAIL СКОПИРОВАН", "EMAIL СКОПІЙОВАНО", "E-MAIL KOPIERT", "CORREO COPIADO")
              : tx("Copy email address", "Скопировать email", "Скопіювати email", "E-Mail-Adresse kopieren", "Copiar correo")}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-[#292929] px-4 py-6 shadow-[0_9px_24px_rgba(0,0,0,.14)] sm:px-5 sm:py-8">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8db5ff]">
              {tx("PARTNER DETAILS", "УСЛОВИЯ ПАРТНЁРСТВА", "УМОВИ ПАРТНЕРСТВА", "PARTNERDETAILS", "DETALLES DEL PROGRAMA")}
            </p>
            <h2 id="affiliate-faq" className="mt-2 text-xl font-black uppercase text-white sm:text-2xl">
              {tx("FREQUENTLY ASKED QUESTIONS", "ЧАСТЫЕ ВОПРОСЫ", "ПОШИРЕНІ ЗАПИТАННЯ", "HÄUFIGE FRAGEN", "PREGUNTAS FRECUENTES")}
            </h2>
          </div>
          <a href={applyHref} className="inline-flex items-center gap-2 self-start text-[11px] font-black uppercase tracking-[0.1em] text-white/90 transition hover:text-white sm:self-auto sm:text-xs">
            {tx("NEED MORE DETAILS? CONTACT US", "НУЖНЫ ПОДРОБНОСТИ? НАПИШИТЕ НАМ", "ПОТРІБНІ ДЕТАЛІ? НАПИШІТЬ НАМ", "NOCH FRAGEN? KONTAKTIEREN SIE UNS", "¿MÁS DETALLES? CONTÁCTANOS")}
            <ArrowRight />
          </a>
        </div>
        <div className="divide-y divide-white/10">
          {faqItems.map((item, index) => {
            const open = openFaq === index;
            const answerId = `affiliate-faq-answer-${index}`;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={answerId}
                  onClick={() => setOpenFaq(open ? -1 : index)}
                  className="flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left text-[13px] font-semibold text-white transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2878ff] sm:text-[15px]"
                >
                  <span>{item.question}</span>
                  <Chevron open={open} />
                </button>
                {open && (
                  <div id={answerId} className="max-w-4xl pb-4 pr-8 text-[13px] leading-relaxed text-white/85 sm:text-[15px]">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}