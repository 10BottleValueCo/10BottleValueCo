import {
  ArrowRight,
  FileText,
  Gift,
  Globe,
  Headphones,
  Info,
  PackageCheck,
  Settings,
  ShieldCheck,
  Star,
  Truck,
  Zap,
} from "lucide-react";

const assetBase = import.meta.env.BASE_URL;
const shippingImage = (name) => `${assetBase}shipping/${name}.jpg`;
const featuredVials = [
  { name: "KPV", src: `${assetBase}vials-c/kpv-3bda87926280.webp` },
  { name: "MOTS-C", src: `${assetBase}vials-c/mots-c-ead676f909ff.webp` },
  { name: "DSIP", src: `${assetBase}vials-c/dsip-0f74d3cf1e6a.webp` },
];

const shippingBackground = (name, side = "left") => {
  const image = `url("${shippingImage(name)}")`;
  const overlay =
    side === "right"
      ? "linear-gradient(90deg, rgba(5, 9, 14, .97) 0%, rgba(5, 9, 14, .82) 45%, rgba(5, 9, 14, .24) 100%), linear-gradient(0deg, rgba(4, 7, 11, .75), transparent 58%)"
      : side === "warehouse"
        ? "linear-gradient(90deg, rgba(5, 9, 14, .97) 0%, rgba(5, 9, 14, .88) 34%, rgba(5, 9, 14, .48) 62%, rgba(5, 9, 14, .04) 100%), linear-gradient(0deg, rgba(4, 7, 11, .52), transparent 62%)"
      : "linear-gradient(90deg, rgba(5, 9, 14, .95) 0%, rgba(5, 9, 14, .78) 50%, rgba(5, 9, 14, .18) 100%), linear-gradient(0deg, rgba(4, 7, 11, .75), transparent 58%)";
  return {
    backgroundImage: `${overlay}, ${image}`,
    ...(side === "warehouse" ? { backgroundPosition: "center, center, right center" } : {}),
  };
};

function IconBadge({ children, tone }) {
  const tones = {
    red: "border-red-300/30 bg-red-950/80 text-red-300 shadow-[0_0_20px_rgba(248,113,113,.16)]",
    blue: "border-cyan-300/30 bg-sky-950/80 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,.16)]",
    purple: "border-violet-300/30 bg-violet-950/80 text-violet-300 shadow-[0_0_20px_rgba(167,139,250,.16)]",
    neutral: "border-white/20 bg-white/10 text-white/80 shadow-[0_0_20px_rgba(255,255,255,.08)]",
    amber: "border-amber-300/30 bg-amber-950/80 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,.16)]",
    green: "border-emerald-300/30 bg-emerald-950/80 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.16)]",
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function PriceTable({ rows, tx }) {
  return (
    <div className="mt-4 max-w-[58%]">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/20 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/65">
        <span>{tx("Order value", "Сумма заказа", "Сума замовлення", "Bestellwert", "Valor del pedido")}</span>
        <span className="pr-2">{tx("Price", "Цена", "Ціна", "Preis", "Precio")}</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map(([range, price]) => (
          <div key={range} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2 text-[13px] font-medium text-white sm:text-sm">
            <span>{range}</span>
            <span className="min-w-[72px] rounded-md bg-white/10 px-3 py-1 text-center font-bold shadow-inner shadow-white/5">
              {price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShippingPricesPage({ tx }) {
  const standardRows = [
    ["$0 – $99", "$59.99"],
    ["$100 – $299", "$39.99"],
    ["$300+", "FREE"],
  ];
  const expressRows = [
    ["$0 – $299", "$99.99"],
    ["$300 – $549", "$19.99"],
    ["$550+", "FREE"],
  ];
  const shippingBenefits = [
    {
      id: "tracking",
      Icon: PackageCheck,
      tone: "green",
      title: tx("Tracking Included", "Отслеживание включено", "Відстеження включено", "Sendungsverfolgung inklusive", "Seguimiento incluido"),
      description: tx(
        "Tracking is available 1–3 business days after payment. We’ll email you the tracking number, and it will also be in your account.",
        "Трекинг появится через 1–3 рабочих дня после оплаты заказа. Номер пришлём на электронную почту — его также можно посмотреть в личном кабинете.",
        "Відстеження з’явиться через 1–3 робочі дні після оплати замовлення. Номер надішлемо на електронну пошту — його також можна переглянути в особистому кабінеті.",
        "Die Sendungsverfolgung ist 1–3 Werktage nach der Zahlung verfügbar. Wir senden Ihnen die Nummer per E-Mail; sie ist auch in Ihrem Konto verfügbar.",
        "El seguimiento estará disponible entre 1 y 3 días hábiles después del pago. Te enviaremos el número por correo electrónico; también podrás consultarlo en tu cuenta.",
      ),
    },
    {
      id: "packaging",
      Icon: ShieldCheck,
      tone: "purple",
      title: tx("Discreet Packaging", "Неприметная упаковка", "Непомітне пакування", "Diskrete Verpackung", "Embalaje discreto"),
      description: tx(
        "Plain, unbranded packaging for your privacy.",
        "Нейтральная упаковка без обозначений для вашей конфиденциальности.",
        "Непомітне пакування без брендування для вашої приватності.",
        "Unmarkierte Verpackung ohne Branding für Ihre Privatsphäre.",
        "Embalaje sencillo y sin marca para proteger tu privacidad.",
      ),
    },
    {
      id: "processing",
      Icon: Settings,
      tone: "neutral",
      title: tx("Order Processing", "Обработка заказа", "Обробка замовлення", "Bestellbearbeitung", "Procesamiento del pedido"),
      description: tx(
        "Delivery time starts once payment is received. The delivery address cannot be changed after your order has shipped.",
        "Срок доставки начинается с момента оплаты заказа. После отправки посылки изменить адрес доставки нельзя.",
        "Термін доставки починається з моменту оплати замовлення. Після відправлення посилки змінити адресу доставки не можна.",
        "Die Lieferzeit beginnt mit Zahlungseingang. Nach dem Versand kann die Lieferadresse nicht mehr geändert werden.",
        "El plazo de entrega comienza una vez recibido el pago. Una vez enviado el paquete, no se podrá cambiar la dirección de entrega.",
      ),
    },
    {
      id: "customs",
      Icon: FileText,
      tone: "blue",
      title: tx("Customs & Import Fees", "Таможенные пошлины и налоги", "Митні збори та податки", "Zoll- und Einfuhrgebühren", "Aduanas e impuestos de importación"),
      description: tx(
        "No customs duties are due. If any customs duties become payable, we’ll inform you in advance.",
        "Таможенные пошлины платить не нужно. Если они всё же потребуются, мы заранее вас проинформируем.",
        "Митні збори сплачувати не потрібно. Якщо вони все ж будуть потрібні, ми повідомимо вас заздалегідь.",
        "Zollgebühren müssen nicht bezahlt werden. Sollten sie dennoch anfallen, informieren wir Sie im Voraus.",
        "No es necesario pagar aranceles aduaneros. Si llegara a ser necesario, te avisaremos con antelación.",
      ),
    },
    {
      id: "support",
      Icon: Headphones,
      tone: "amber",
      title: tx("Delivery Support", "Помощь с доставкой", "Допомога з доставкою", "Versandhilfe", "Ayuda con el envío"),
      description: tx(
        "Package delayed, damaged or lost? Contact our support team and we’ll help.",
        "Посылка задержалась, повреждена или потерялась? Свяжитесь с поддержкой — мы поможем.",
        "Посилка затрималася, пошкоджена або загубилася? Зверніться до служби підтримки — ми допоможемо.",
        "Paket verspätet, beschädigt oder verloren? Kontaktieren Sie unseren Support — wir helfen.",
        "¿Paquete retrasado, dañado o perdido? Contacta con soporte y te ayudaremos.",
      ),
      contact: true,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[2000px] px-4 pb-10 pt-[9px] uppercase sm:px-5 md:px-6 md:pt-[17px] 2xl:px-8 2xl:pt-[25px]">
      <header className="mb-5 text-center md:mb-6 2xl:mb-8">
        <h1 className="text-[25px] font-extrabold leading-none tracking-[0.055em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.45)] sm:text-3xl md:text-4xl 2xl:text-5xl">
          {tx("SHIPPING & DISCOUNTS", "ДОСТАВКА И СКИДКИ", "ДОСТАВКА ТА ЗНИЖКИ", "VERSAND & RABATTE", "ENVÍOS Y DESCUENTOS")}
        </h1>
      </header>

      <section aria-label={tx("Shipping options", "Варианты доставки", "Варіанти доставки")} className="grid gap-3 sm:gap-4 lg:grid-cols-3 2xl:gap-6">
        <article
          className="relative flex min-h-[238px] flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-slate-950 bg-cover bg-center p-4 shadow-[0_12px_30px_rgba(0,0,0,.28)] transition-colors duration-300 hover:border-white/30 sm:min-h-[224px] sm:p-4 xl:min-h-[248px] xl:p-5 2xl:min-h-[280px] 2xl:p-6"
          style={shippingBackground("shipping-warehouse", "warehouse")}
        >
          <div className="relative z-10 flex items-center gap-3">
            <IconBadge tone="red"><Truck size={21} strokeWidth={2.1} /></IconBadge>
            <div>
              <h2 className="text-[15px] font-extrabold leading-tight text-white sm:text-base">
                {tx("US Warehouse Shipping", "Доставка со склада в США", "Доставка зі складу в США", "Versand aus dem US-Lager", "Envío desde el almacén de EE. UU.")}
              </h2>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/75">
                {tx("(US WAREHOUSE)", "(СКЛАД В США)", "(СКЛАД У США)", "(US-LAGER)", "(ALMACÉN DE EE. UU.)")}
              </p>
            </div>
          </div>

          <div className="relative z-10 grid max-w-[72%] grid-cols-3 divide-x divide-white/20 py-4 sm:max-w-[64%] xl:max-w-[70%] 2xl:max-w-[68%]">
            <div className="px-2 first:pl-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/65">{tx("Delivery", "Доставка", "Доставка", "Lieferung", "Entrega")}</p>
              <p className="mt-1 text-lg font-black leading-none text-white">2–5</p>
              <p className="mt-1 text-[9px] text-white/80">{tx("business days", "рабочих дней", "робочих днів", "Werktage", "días hábiles")}</p>
            </div>
            <div className="px-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/65">{tx("Ships from", "Отправка из", "Відправлення з", "Versand aus", "Envío desde")}</p>
              <p className="mt-2 text-lg font-black leading-none text-white">USA</p>
            </div>
            <div className="pl-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/65">{tx("Shipping cost", "Стоимость доставки", "Вартість доставки", "Versandkosten", "Coste de envío")}</p>
              <p className="mt-2 text-lg font-black leading-none text-white">{tx("FREE", "БЕСПЛАТНО", "БЕЗКОШТОВНО", "KOSTENLOS", "GRATIS")}</p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-xs leading-snug text-white/90 backdrop-blur-sm sm:text-[13px] 2xl:text-sm">
            <Info size={16} className="shrink-0 text-white" />
            <p className="translate-y-3">
              {tx(
                <>Select the <strong>"SHOP (US WAREHOUSE)"</strong> tab to get free delivery from our U.S. warehouse in 2–5 business days.</>,
                <>Выберите вкладку <strong>«SHOP (US WAREHOUSE)»</strong>, чтобы получить бесплатную доставку со склада в США за 2–5 рабочих дней.</>,
                <>Виберіть вкладку <strong>«SHOP (US WAREHOUSE)»</strong>, щоб отримати безкоштовну доставку зі складу у США за 2–5 робочих днів.</>,
                <>Wählen Sie den Tab <strong>„SHOP (US WAREHOUSE)"</strong> für kostenlosen Versand aus unserem US-Lager in 2–5 Werktagen.</>,
                <>Elige la pestaña <strong>«SHOP (US WAREHOUSE)»</strong> para obtener envío gratuito desde nuestro almacén de EE. UU. en 2–5 días hábiles.</>
              )}
            </p>
          </div>
        </article>

        <article
          className="relative flex min-h-[238px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 bg-cover bg-center p-4 shadow-[0_12px_30px_rgba(0,0,0,.28)] transition-colors duration-300 hover:border-white/30 sm:min-h-[224px] sm:p-4 xl:min-h-[248px] xl:p-5 2xl:min-h-[280px] 2xl:p-6"
          style={shippingBackground("shipping-worldwide")}
        >
          <div className="relative z-10 flex items-center gap-3">
            <IconBadge tone="blue"><Globe size={21} strokeWidth={2} /></IconBadge>
            <div>
              <h2 className="text-[14px] font-extrabold uppercase leading-tight tracking-wide text-white sm:text-[15px]">
                {tx("Standard Shipping", "Стандартная доставка", "Стандартна доставка", "Standardversand", "Envío estándar")}
              </h2>
              <p className="text-[10px] text-white/70">({tx("worldwide", "по всему миру", "по всьому світу", "weltweit", "mundial")})</p>
            </div>
          </div>
          <div className="relative z-10 flex-1">
            <PriceTable rows={standardRows} tx={tx} />
          </div>
          <div className="relative z-10 mt-2 flex items-center gap-2 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-xs leading-snug text-white/90 backdrop-blur-sm sm:text-[13px] 2xl:text-sm">
            <Truck size={18} className="shrink-0 text-white" />
            <p className="translate-y-3">{tx(
              "Standard worldwide shipping takes approximately 8–12 business days depending on location.",
              "Стандартная доставка по всему миру занимает примерно 8–12 рабочих дней в зависимости от местоположения.",
              "Стандартна доставка по всьому світу займає приблизно 8–12 робочих днів залежно від місця.",
              "Der weltweite Standardversand dauert je nach Standort etwa 8–12 Werktage.",
              "El envío estándar internacional tarda aproximadamente 8–12 días hábiles, según el destino."
            )}</p>
          </div>
        </article>

        <article
          className="relative flex min-h-[238px] flex-col overflow-hidden rounded-2xl border border-[#202024] bg-slate-950 p-4 shadow-[0_12px_30px_rgba(0,0,0,.28)] transition-colors duration-300 hover:border-white/30 sm:min-h-[224px] sm:p-4 xl:min-h-[248px] xl:p-5 2xl:min-h-[280px] 2xl:p-6"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] z-0 rounded-[14px] bg-cover bg-center"
            style={shippingBackground("shipping-express")}
          />
          <div className="relative z-10 flex items-center gap-3">
            <IconBadge tone="amber"><Zap size={21} strokeWidth={2.2} /></IconBadge>
            <div>
              <h2 className="text-[14px] font-extrabold uppercase leading-tight tracking-wide text-white sm:text-[15px]">
                {tx("Express Shipping", "Экспресс-доставка", "Експрес-доставка", "Expressversand", "Envío exprés")}
              </h2>
              <p className="text-[10px] text-white/70">({tx("worldwide", "по всему миру", "по всьому світу", "weltweit", "mundial")})</p>
            </div>
          </div>
          <div className="relative z-10 flex-1">
            <PriceTable rows={expressRows} tx={tx} />
          </div>
          <div className="relative z-10 mt-2 flex items-center gap-2 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-xs leading-snug text-white/90 backdrop-blur-sm sm:text-[13px] 2xl:text-sm">
            <Zap size={17} className="shrink-0 text-amber-300" />
            <p className="translate-y-3">{tx(
              "Express worldwide shipping takes approximately 5–7 business days depending on location.",
              "Экспресс-доставка по всему миру занимает примерно 5–7 рабочих дней в зависимости от местоположения.",
              "Експрес-доставка по всьому світу займає приблизно 5–7 робочих днів залежно від місця.",
              "Der weltweite Expressversand dauert je nach Standort etwa 5–7 Werktage.",
              "El envío exprés internacional tarda aproximadamente 5–7 días hábiles, según el destino."
            )}</p>
          </div>
        </article>
      </section>

      <section
        aria-label={tx("Shipping benefits", "Преимущества доставки", "Переваги доставки", "Versandvorteile", "Ventajas de envío")}
        className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/85 shadow-[0_12px_30px_rgba(0,0,0,.24)]"
      >
        <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
          {shippingBenefits.map(({ id, Icon, tone, title, description, contact }) => (
            <article
              key={id}
              className={`flex min-w-0 items-start gap-3 bg-[#101214] p-3 sm:p-4 ${id === "support" ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
              <IconBadge tone={tone}>
                <Icon size={19} strokeWidth={2} />
              </IconBadge>
              <div className="min-w-0">
                <h3 className="text-xs font-extrabold leading-tight tracking-wide text-white">{title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-white/70 sm:text-xs">{description}</p>
                {contact && (
                  <a
                    href="mailto:support@10bottlevalue.co"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-black transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {tx("Contact Support", "Связаться с поддержкой", "Зв’язатися з підтримкою", "Support kontaktieren", "Contactar con soporte")}
                    <ArrowRight size={13} aria-hidden="true" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={tx("Bonuses and discounts", "Бонусы и скидки", "Бонуси та знижки")} className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2 2xl:mt-6 2xl:gap-6">
        <article
          className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950 bg-cover bg-center p-5 shadow-[0_12px_30px_rgba(0,0,0,.28)] sm:min-h-[300px] sm:p-6 2xl:min-h-[380px] 2xl:p-8"
          style={shippingBackground("shipping-community-reference")}
        >
          <div className="relative z-10 max-w-[76%] uppercase sm:max-w-[68%] 2xl:max-w-[60%]">
            <div className="mb-1 flex items-center gap-2">
              <IconBadge tone="green"><Star size={21} fill="currentColor" /></IconBadge>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-xs 2xl:text-sm">
                {tx("Community Bonus", "Бонус сообщества", "Бонус спільноти", "Community-Bonus", "Bono de la comunidad")}
              </p>
            </div>
            <h2 className="text-[28px] font-black leading-[1.02] text-white sm:text-[32px] 2xl:text-4xl">
              {tx("Get 10% OFF", "Получите скидку 10%", "Отримайте знижку 10%", "10 % RABATT ERHALTEN", "OBTÉN UN 10 % DE DESCUENTO")}
              <br />
              <span className="text-white/90">{tx("Your Next Order", "На следующий заказ", "На наступне замовлення", "auf Ihre nächste Bestellung", "en tu próximo pedido")}</span>
            </h2>
            <ol className="mt-4 space-y-2 text-xs leading-snug text-white/95 sm:text-sm 2xl:text-[15px]">
              {[
                tx("Receive your order", "Получите заказ", "Отримайте замовлення", "Bestellung erhalten", "Recibe tu pedido"),
                tx("Leave a review on Trustpilot", "Оставьте отзыв на Trustpilot", "Залиште відгук на Trustpilot", "Bewerte uns auf Trustpilot", "Deja una reseña en Trustpilot"),
                tx("Email us to get your 10% promo code within 24h", "Напишите нам, чтобы получить промокод на скидку 10% в течение 24 часов", "Напишіть нам, щоб отримати промокод на знижку 10% протягом 24 годин", "Schreib uns, um deinen 10%-Gutscheincode innerhalb von 24 Stunden zu erhalten", "Escríbenos para recibir tu código de descuento del 10 % en 24 horas"),
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/45 bg-black/40 text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://www.trustpilot.com/review/10bottlevalue.co"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-900 shadow-lg transition hover:bg-emerald-50 sm:px-4 sm:text-xs sm:py-3 2xl:text-sm"
            >
              <Star size={16} fill="#00b67a" className="shrink-0 text-[#00b67a]" />
              {tx("Write a review on Trustpilot", "Написать отзыв на Trustpilot", "Написати відгук на Trustpilot", "Bewertung auf Trustpilot schreiben", "Escribir una reseña en Trustpilot")}
              <ArrowRight size={15} className="shrink-0" />
            </a>
          </div>
        </article>

        <article
          className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/15 bg-slate-950 bg-cover bg-center p-5 shadow-[0_12px_30px_rgba(0,0,0,.28)] sm:min-h-[300px] sm:p-6 2xl:min-h-[380px] 2xl:p-8"
          style={shippingBackground("shipping-order-bonus-lab", "left")}
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 z-0 flex w-[38%] items-center justify-center pr-1 sm:pr-3 2xl:w-[42%]">
            {featuredVials.map(({ name, src }, index) => (
              <img
                key={name}
                src={src}
                alt={name}
                className={index === 1
                  ? "relative z-10 h-[122px] w-auto object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,.65)] sm:h-[200px] 2xl:h-[270px]"
                  : `h-[94px] w-auto ${index === 0 ? "-mr-4" : "-ml-4"} translate-y-3 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,.55)] sm:h-[156px] ${index === 0 ? "sm:-mr-6" : "sm:-ml-6"} 2xl:h-[190px] ${index === 0 ? "2xl:-mr-8" : "2xl:-ml-8"}`}
              />
            ))}
          </div>
          <div className="relative z-10 max-w-[62%] sm:max-w-[64%] 2xl:max-w-[60%]">
            <div className="mb-1 flex items-center gap-2">
              <IconBadge tone="amber"><Gift size={21} /></IconBadge>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 sm:text-xs 2xl:text-sm">
                {tx("Order Bonus", "Бонус за заказ", "Бонус за замовлення", "Bestellbonus", "Bono por pedido")}
              </p>
            </div>
            <h2 className="text-[26px] font-black leading-[1.02] text-white sm:text-[30px] 2xl:text-[34px]">
              {tx("Save More", "Экономьте больше", "Заощаджуйте більше", "Mehr sparen", "Ahorra más")}
              <br />
              <span className="text-white/90">{tx("on Larger Orders", "на крупных заказах", "на великих замовленнях", "bei größeren Bestellungen", "en pedidos grandes")}</span>
            </h2>
            <p className="mt-2 text-xs leading-snug text-white/85 sm:text-[13px] 2xl:text-sm">
              {tx("Automatic discounts at checkout. No code needed.", "Автоматические скидки при оформлении заказа. Код не нужен.", "Автоматичні знижки під час оформлення. Код не потрібен.", "Automatische Rabatte an der Kasse. Kein Code erforderlich.", "Descuentos automáticos al pagar. No necesitas un código.")}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[["$1000+", "10%"], ["$2000+", "15%"], ["$4000+", "20%"]].map(([amount, discount]) => (
                <div key={amount} className="rounded-lg border border-white/25 bg-black/50 px-2 py-2.5 text-center backdrop-blur-sm sm:py-3 2xl:px-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-white/75 sm:text-[10px]">{tx("Order from", "Заказ от", "Замовлення від", "Bestellung ab", "Pedido desde")}</p>
                  <p className="mt-1 text-sm font-bold leading-none text-white sm:text-base">{amount}</p>
                  <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/75 sm:text-[10px]">{tx("Discount", "Скидка", "Знижка", "Rabatt", "Descuento")}</p>
                  <p className="text-lg font-black leading-none text-white sm:text-xl">{discount}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] uppercase leading-snug tracking-wide text-white/75 sm:text-[10px]">
              {tx("Discounts do not stack. The highest eligible discount applies.", "Скидки не складываются. Применяется максимальная доступная скидка.", "Знижки не додаються. Застосовується найбільша доступна знижка.", "Rabatte sind nicht kombinierbar. Es gilt der höchste berechtigte Rabatt.", "Los descuentos no se acumulan. Se aplica el descuento más alto que corresponda.")}
            </p>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300/25 bg-black/55 px-2.5 py-2 backdrop-blur-sm max-sm:w-[155%]">
              <Gift size={17} className="mt-0.5 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-snug text-white/95 sm:text-xs 2xl:text-[13px]">
                <strong className="block text-white">{tx("Orders above $350 receive a FREE BAC WATER bonus", "Заказы от $350 получают БЕСПЛАТНЫЙ BAC WATER", "Замовлення від $350 отримують БЕЗКОШТОВНИЙ BAC WATER", "Bestellungen über $350 erhalten einen KOSTENLOSEN BAC-WATER-Bonus", "Los pedidos superiores a $350 reciben BAC WATER GRATIS")}</strong>
                {tx("(10 vials × 3 ml each). Applies to Shop Worldwide tab only.", "(10 флаконов × 3 мл). Только для вкладки Shop Worldwide.", "(10 флаконів × 3 мл). Лише для вкладки Shop Worldwide.", "(10 Fläschchen à 3 ml). Nur im Tab Shop Worldwide.", "(10 viales de 3 ml). Solo se aplica a la pestaña Shop Worldwide.")}
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}