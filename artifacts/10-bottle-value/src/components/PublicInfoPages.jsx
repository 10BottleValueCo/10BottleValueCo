import { memo, useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { buildFaqs } from "../data/faqData.js";

let cachedFaqSearchInput = "";
// Keep the same per-visit persistence when routes unmount, without storing FAQ
// interaction state in App (which also retains the hidden product catalog).
let cachedFaqOpenSections = { shipping: -1, orders: -1, product: -1 };

function getFaqParagraphs(text) {
  if (!text) return [];

  if (text.includes("\n\n")) {
    return text
      .split("\n\n")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (text.length > 120) {
    const parts = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
    if (parts && parts.length > 1) {
      return parts.map((part) => part.trim()).filter(Boolean);
    }
  }

  return [text];
}

const FaqResults = memo(function FaqResults({ language, tx, faqs, faqSearchQuery }) {
  const [openFaqs, setOpenFaqs] = useState(() => cachedFaqOpenSections);
  function toggleFaq(sectionKey, index) {
    const next = {
      ...openFaqs,
      [sectionKey]: openFaqs[sectionKey] === index ? -1 : index,
    };
    cachedFaqOpenSections = next;
    setOpenFaqs(next);
  }
  const faqSearchMatchIds = useMemo(
    () =>
      new Set(
        faqs
          .filter((faq) =>
            `${faq.q} ${faq.a}`.toLocaleLowerCase().includes(faqSearchQuery),
          )
          .map((faq) => faq.id),
      ),
    [faqs, faqSearchQuery],
  );

  return (
    <>
          {faqSearchQuery && faqSearchMatchIds.size === 0 && (
            <div
              className="mb-8 rounded-2xl border border-white/15 bg-black/20 px-5 py-6 text-sm text-white/65"
              role="status"
            >
              {tx(
                "No matching questions. Try a different search.",
                "Ничего не найдено. Попробуйте изменить запрос.",
                "Нічого не знайдено. Спробуйте змінити запит.",
                "Keine passenden Fragen gefunden. Ändern Sie Ihre Suche.",
                "No se encontraron preguntas. Prueba otra búsqueda.",
              )}
            </div>
          )}

          <div className="space-y-10">
            {[
              {
                key: "shipping",
                title: tx("SHIPPING", "ДОСТАВКА", "ДОСТАВКА"),
                label: tx(
                  "Delivery & tracking",
                  "Доставка и отслеживание",
                  "Доставка та відстеження",
                  undefined,
                  "Entrega y seguimiento"
                ),
                items: faqs.filter((f) =>
                  [
                    "ship-worldwide",
                    "shipping-time",
                    "track-order",
                    "tracking-stops",
                  ].includes(f.id)
                ),
              },
              {
                key: "orders",
                title: tx("ORDERS", "ЗАКАЗЫ", "ЗАМОВЛЕННЯ"),
                label: tx(
                  "Changes & support",
                  "Изменения и поддержка",
                  "Зміни та підтримка",
                  "Änderungen & Support",
                  "Cambios y soporte"
                ),
                items: faqs.filter((f) =>
                  [
                    "modify-cancel-order",
                    "wrong-shipping-address",
                    "confirmation-email",
                    "order-issue",
                    "billing-descriptor",
                  ].includes(f.id)
                ),
              },
              {
                key: "product",
                title: tx("PRODUCT", "ПРОДУКТ", "ПРОДУКТ"),
                label: tx(
                  "Quality, reports & pricing",
                  "Качество, отчёты и цены",
                  "Якість, звіти та ціни",
                  "Qualität, Berichte & Preise",
                  "Calidad, informes y precios"
                ),
                items: faqs.filter((f) =>
                  [
                    "lyophilized",
                    "high-quality",
                    "cheapest",
                    "ten-vial-kits",
                    "combine-discounts",
                    "usage-instructions",
                    "coa",
                    "not-all-products-in-catalog",
                  ].includes(f.id)
                ),
              },
            ].map((section) => {
              const visibleItems = section.items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => faqSearchMatchIds.has(item.id));
              if (visibleItems.length === 0) return null;

              return (
                <section
                  key={section.title}
                  className="rounded-[1.5rem] border border-white/20 bg-black/40 p-5 md:rounded-[2rem] md:p-8 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
                >
                  <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 md:mb-8 md:pb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white">
                        {section.label}
                      </div>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                        {section.title}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 md:text-[15px]">
                        {section.key === "shipping"
                          ? tx(
                              "Fast worldwide delivery, tracking details, and what to expect if a shipment slows down.",
                              "Быстрая доставка по всему миру, детали отслеживания и что ожидать, если отправление замедлится.",
                              "Швидка доставка по всьому світу, деталі відстеження і що очікувати, якщо відправлення сповільниться.",
                              undefined,
                              "Entrega rápida a nivel mundial, detalles de seguimiento y qué esperar si un envío se retrasa."
                            )
                          : section.key === "orders"
                          ? tx(
                              "Order changes, wrong addresses, confirmation emails, and support-related questions.",
                              "Изменения заказа, неправильные адреса, письма подтверждения и вопросы поддержки.",
                              "Зміни замовлення, неправильні адреси, листи підтвердження та питання підтримки.",
                              "Bestelländerungen, falsche Adressen, Bestätigungs-E-Mails und Supportanfragen.",
                              "Cambios en pedidos, direcciones incorrectas, correos de confirmación y preguntas relacionadas con soporte."
                            )
                          : tx(
                              "Quality, reports, pricing, and discount-related details.",
                              "Качество, отчёты, цены и детали скидок.",
                              "Якість, звіти, ціни та деталі знижок.",
                              "Qualität, Berichte, Preise und Details zu Rabatten.",
                              "Calidad, informes, precios y detalles relacionados con descuentos."
                            )}
                      </p>
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                      {visibleItems.length}{" "}
                      {tx("questions", "вопросов", "питань")}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {visibleItems.map(({ item, index }) => {
                      const isOpen = openFaqs[section.key] === index;

                      return (
                        <div
                          key={item.q}
                          className={`rounded-[1.4rem] border px-4 md:rounded-[1.6rem] md:px-6 transition-all duration-200 ${
                            isOpen
                              ? "border-white/20 bg-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                              : "border-white/20 bg-black/40 hover:bg-black/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(section.key, index)}
                            className="flex w-full items-center justify-between gap-4 py-4 text-left md:gap-6 md:py-5"
                          >
                            <div className="text-[0.98rem] font-bold leading-6 tracking-[-0.02em] text-white md:text-[1.15rem] md:leading-7">
                              {item.q}
                            </div>
                            <div
                              className={`shrink-0 text-xl font-light text-white/75 transition-transform duration-200 ${
                                isOpen ? "rotate-45" : "rotate-0"
                              }`}
                            >
                              +
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-white/10 pb-4 pt-3 md:pb-5 md:pt-4">
                              <div className="max-w-none space-y-3 text-[14px] leading-7 text-white/95 md:text-[16px] md:leading-8">
                                {getFaqParagraphs(item.a).map((line, i) => (
                                  <p key={i}>{line}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
    </>
  );
});

export default function PublicInfoPages({
  page,
  language,
  tx,
  getPreloadedDisplayImageUrl,
  aboutBottleWiggle,
  setAboutBottleWiggle,
  handlePublicPageLink,
}) {
  const [faqSearchInput, setFaqSearchInput] = useState(
    () => cachedFaqSearchInput,
  );
  const deferredFaqSearchInput = useDeferredValue(faqSearchInput);
  const faqs = useMemo(
    () => (page === "faq" ? buildFaqs(tx) : []),
    [page, language],
  );
  const faqSearchQuery = deferredFaqSearchInput.trim().toLocaleLowerCase();

  return (
    <>
      {page === "faq" && (
        <main className="mx-auto max-w-7xl px-4 pt-10 pb-12 md:-mt-5 md:px-10 md:pt-0 md:pb-16">
          <div className="mb-5 md:mb-8">
            <div className="lg:max-w-[48%] lg:translate-y-20">
              <h1 className="text-3xl font-semibold uppercase tracking-[0.08em] text-white md:text-4xl xl:text-5xl">
                {tx("COMMON QUESTIONS", "ЧАСТЫЕ ВОПРОСЫ", "ПОШИРЕНІ ПИТАННЯ", "HÄUFIGE FRAGEN", "PREGUNTAS COMUNES")}
              </h1>
              <p className="mt-4 max-w-2xl text-base uppercase tracking-[0.08em] leading-7 text-white/60 md:text-sm lg:text-xs xl:text-sm">
                {language === "RU"
                  ? "ЧЁТКИЕ ОТВЕТЫ О ДОСТАВКЕ, ЗАКАЗАХ И ДЕТАЛЯХ ПРОДУКТОВ."
                  : language === "UA"
                  ? "ЧІТКІ ВІДПОВІДІ ПРО ДОСТАВКУ, ЗАМОВЛЕННЯ ТА ДЕТАЛІ ПРОДУКТІВ."
                  : language === "DE"
                  ? "KLARE ANTWORTEN ZU VERSAND, BESTELLUNGEN UND PRODUKTDETAILS."
                  : language === "ES"
                  ? "RESPUESTAS CLARAS SOBRE ENVÍOS, PEDIDOS Y DETALLES DEL PRODUCTO."
                  : "CLEAR ANSWERS ABOUT SHIPPING, ORDERS AND PRODUCT DETAILS."}
              </p>
            </div>
            <div className="relative ml-auto mt-5 w-full max-w-lg lg:max-w-md xl:max-w-lg">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45"
                strokeWidth={1.8}
              />
              <input
                type="search"
                value={faqSearchInput}
                onChange={(event) => {
                  cachedFaqSearchInput = event.target.value;
                  setFaqSearchInput(event.target.value);
                }}
                placeholder={tx(
                  "Search questions and answers...",
                  "Поиск по вопросам и ответам...",
                  "Пошук запитань і відповідей...",
                  "Fragen und Antworten durchsuchen...",
                  "Buscar preguntas y respuestas...",
                )}
                aria-label={tx(
                  "Search questions and answers",
                  "Поиск по вопросам и ответам",
                  "Пошук запитань і відповідей",
                  "Fragen und Antworten durchsuchen",
                  "Buscar preguntas y respuestas",
                )}
                className="h-12 w-full rounded-2xl border border-white/15 bg-black/25 pl-12 pr-4 text-sm text-white placeholder:text-white/45 focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/15"
              />
            </div>
          </div>

          <FaqResults
            language={language}
            tx={tx}
            faqs={faqs}
            faqSearchQuery={faqSearchQuery}
          />
        </main>
      )}

      {page === "about" && (
        <main className="mx-auto max-w-5xl px-4 pt-2 pb-12 md:px-10 md:pt-4 md:pb-20">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col items-center gap-3 text-center py-2 md:py-3">
              <div className="flex flex-col items-center gap-2 md:flex-row md:gap-3">
                <img
                  src={getPreloadedDisplayImageUrl(`${import.meta.env.BASE_URL}logo.png`)}
                  alt="Logo"
                  className={`h-20 md:h-24 w-auto shrink-0 object-contain brightness-110 cursor-pointer${aboutBottleWiggle ? " about-bottle-wiggle" : ""}`}
                  onClick={() => { setAboutBottleWiggle(false); setTimeout(() => setAboutBottleWiggle(true), 10); }}
                  onAnimationEnd={() => setAboutBottleWiggle(false)}
                />
                <span className="text-[32px] md:text-[44px] font-semibold tracking-[0.07em] text-white">BottleValueCo</span>
              </div>
              <p className="mt-2 text-[13px] md:text-[16px] font-extrabold uppercase tracking-[0.32em] text-white [text-shadow:0_0_18px_rgba(255,255,255,0.35)]">
                {language === "RU" ? "ЗАЧЕМ СУЩЕСТВУЕТ 10BOTTLEVALUECO" : language === "UA" ? "НАВІЩО ІСНУЄ 10BOTTLEVALUECO" : language === "DE" ? "WARUM 10BOTTLEVALUECO EXISTIERT" : language === "ES" ? "POR QUÉ EXISTE 10BOTTLEVALUECO" : "WHY 10BOTTLEVALUECO EXISTS"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-[1.5rem] border border-white/20 bg-black/25 p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.18)] md:rounded-[2rem] text-center">
                <h2 className="mb-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">
                  <span className="flex h-[38px] w-[38px] md:h-[46px] md:w-[46px] shrink-0 items-center justify-center rounded-full cursor-pointer" style={{background:"rgba(127,29,29,0.55)",boxShadow:"0 0 0 1.5px rgba(248,113,113,0.35)"}} onClick={e=>{const el=e.currentTarget;el.classList.remove('tbv-anim-zap');void el.offsetHeight;el.classList.add('tbv-anim-zap');setTimeout(()=>el.classList.remove('tbv-anim-zap'),650);}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </span>
                  {language === "RU" ? "ПРОБЛЕМА" : language === "UA" ? "ПРОБЛЕМА" : language === "DE" ? "DAS PROBLEM" : language === "ES" ? "EL PROBLEMA" : "THE PROBLEM"}
                </h2>
                <div className="my-3 mx-auto h-px w-10 bg-white/20" />
                <p className="text-[14px] md:text-[15px] font-semibold uppercase leading-[1.9] tracking-[0.05em] text-white">
                  {language === "RU" ? "БОЛЬШИНСТВО БРЕНДОВ ПРОДАЮТ ПЕПТИДЫ ПО СИЛЬНО ЗАВЫШЕННЫМ ЦЕНАМ. ЗАПУТАННЫЕ САЙТЫ, ЛИШНИЙ БРЕНДИНГ И ПЛОХАЯ ДОСТУПНОСТЬ ДЕЛАЮТ ОПЫТ ХУЖЕ." : language === "UA" ? "БІЛЬШІСТЬ БРЕНДІВ ПРОДАЮТЬ ПЕПТИДИ ЗА СИЛЬНО ЗАВИЩЕНИМИ ЦІНАМИ. ЗАПЛУТАНІ САЙТИ, ЗАЙВИЙ БРЕНДИНГ І ПОГАНА ДОСТУПНІСТЬ ПОГІРШУЮТЬ ДОСВІД." : language === "DE" ? "DIE MEISTEN MARKEN VERKAUFEN PEPTIDE ZU STARK ÜBERHÖHTEN PREISEN. UNÜBERSICHTLICHE WEBSITES, UNNÖTIGES BRANDING UND SCHLECHTE ZUGÄNGLICHKEIT VERSCHLECHTERN DIE ERFAHRUNG." : language === "ES" ? "LA MAYORÍA DE LAS MARCAS VENDEN PÉPTIDOS A PRECIOS MUY INFLADOS. LOS SITIOS WEB CONFUSOS, EL BRANDING INNECESARIO Y LA BAJA ACCESIBILIDAD EMPEORAN LA EXPERIENCIA." : "MOST BRANDS SELL PEPTIDES AT HEAVILY INFLATED PRICES. CONFUSING WEBSITES, UNNECESSARY BRANDING, AND POOR ACCESSIBILITY MAKE THE EXPERIENCE WORSE."}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/20 bg-black/25 p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.18)] md:rounded-[2rem] text-center">
                <h2 className="mb-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">
                  <span className="flex h-[38px] w-[38px] md:h-[46px] md:w-[46px] shrink-0 items-center justify-center rounded-full cursor-pointer" style={{background:"rgba(120,53,15,0.55)",boxShadow:"0 0 0 1.5px rgba(251,191,36,0.35)"}} onClick={e=>{const el=e.currentTarget;el.classList.remove('tbv-anim-bulb');void el.offsetHeight;el.classList.add('tbv-anim-bulb');setTimeout(()=>el.classList.remove('tbv-anim-bulb'),850);}}>
                    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1 1 1.8h6c.1-.8.5-1.4 1-1.8A7 7 0 0 0 12 2z"/></svg>
                  </span>
                  {language === "RU" ? "ИДЕЯ" : language === "UA" ? "ІДЕЯ" : language === "DE" ? "DIE IDEE" : language === "ES" ? "LA IDEA" : "THE IDEA"}
                </h2>
                <div className="my-3 mx-auto h-px w-10 bg-white/20" />
                <p className="text-[14px] md:text-[15px] font-semibold uppercase leading-[1.9] tracking-[0.05em] text-white">
                  {language === "RU" ? "ПРОДАВАТЬ ОПТОВЫМИ НАБОРАМИ, УБИРАТЬ ЛИШНИЕ РАСХОДЫ И ФОКУСИРОВАТЬСЯ ТОЛЬКО НА ГЛАВНОМ — КАЧЕСТВЕ И ЧЕСТНОЙ ЦЕНЕ." : language === "UA" ? "ПРОДАВАТИ НАБОРАМИ, ПРИБИРАТИ ЗАЙВІ ВИТРАТИ ТА ФОКУСУВАТИСЯ ЛИШЕ НА ГОЛОВНОМУ — ЯКОСТІ ТА ЧЕСНІЙ ЦІНІ." : language === "DE" ? "IN GROSSMENGEN VERKAUFEN, UNNÖTIGE KOSTEN ENTFERNEN UND SICH NUR AUF DAS WESENTLICHE KONZENTRIEREN — QUALITÄT UND FAIRE PREISE." : language === "ES" ? "VENDER EN VOLUMEN, ELIMINAR COSTES INNECESARIOS Y CENTRARNOS SOLO EN LO QUE IMPORTA: CALIDAD Y PRECIOS JUSTOS." : "SELL IN BULK, REMOVE UNNECESSARY COSTS, AND FOCUS ONLY ON WHAT MATTERS - QUALITY AND FAIR PRICING."}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/20 bg-black/25 px-6 py-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] md:rounded-[2rem] md:px-12 md:py-14">
              <h2 className="text-center text-xl md:text-4xl font-semibold tracking-[-0.01em] text-white mb-3 md:mb-4">
                {(() => {
                  const full = language === "RU" ? "НИКАКИХ ОДИНОЧНЫХ ФЛАКОНОВ. ТОЛЬКО НАБОРЫ ПО 10 ФЛАКОНОВ." : language === "UA" ? "ЖОДНИХ ОДИНИЧНИХ ФЛАКОНІВ. ЛИШЕ НАБОРИ ПО 10 ФЛАКОНІВ." : language === "DE" ? "KEINE EINZELFLÄSCHCHEN. NUR 10-FLÄSCHCHEN-KITS." : language === "ES" ? "SIN VIALES INDIVIDUALES. SOLO KITS DE 10 VIALES." : "NO SINGLE VIALS. ONLY 10-VIAL KITS.";
                  const splitAt = full.indexOf(". ");
                  const line1 = splitAt === -1 ? full : full.slice(0, splitAt + 1);
                  const line2 = splitAt === -1 ? "" : full.slice(splitAt + 2);
                  return (
                    <>
                      <span className="block md:inline">{line1}</span>
                      {line2 && (
                        <>
                          <span className="hidden md:inline"> </span>
                          <span className="block md:inline">{line2}</span>
                        </>
                      )}
                    </>
                  );
                })()}
              </h2>
              <p className="text-[13px] md:text-[15px] uppercase tracking-[0.18em] text-white/50">
                {language === "RU" ? "ТО ЖЕ КАЧЕСТВО. ЛУЧШАЯ ЦЕНА. ДОСТАВКА ПО ВСЕМУ МИРУ." : language === "UA" ? "ТА САМА ЯКІСТЬ. КРАЩА ЦІНА. ДОСТАВКА ПО ВСЬОМУ СВІТУ." : language === "DE" ? "GLEICHE QUALITÄT. BESSERE PREISE. WELTWEITER VERSAND." : language === "ES" ? "MISMA CALIDAD. MEJOR PRECIO. ENVÍO A TODO EL MUNDO." : "SAME QUALITY. BETTER PRICING. WORLDWIDE SHIPPING."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/20 bg-black/25 p-6 md:rounded-[2rem] md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="mb-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">
                  <span className="flex h-[38px] w-[38px] md:h-[46px] md:w-[46px] shrink-0 items-center justify-center rounded-full cursor-pointer" style={{background:"rgba(22,101,52,0.55)",boxShadow:"0 0 0 1.5px rgba(74,222,128,0.35)"}} onClick={e=>{const el=e.currentTarget;el.classList.remove('tbv-anim-pct');void el.offsetHeight;el.classList.add('tbv-anim-pct');setTimeout(()=>el.classList.remove('tbv-anim-pct'),650);}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  </span>
                  {language === "RU" ? "НАША МИССИЯ" : language === "UA" ? "НАША МІСІЯ" : language === "DE" ? "UNSERE MISSION" : language === "ES" ? "NUESTRA MISIÓN" : "OUR MISSION"}
                </h2>
                <div className="my-3 mx-auto h-px w-10 bg-white/20" />
                <p className="text-[15px] md:text-[18px] font-semibold uppercase leading-[1.9] tracking-[0.05em] text-white">
                  {language === "RU" ? "НАША ЦЕЛЬ ПРОСТА: СТАТЬ САМЫМ НАДЁЖНЫМ И ДОСТУПНЫМ БРЕНДОМ В ЭТОЙ СФЕРЕ, ПРЕДЛАГАЯ РЕАЛЬНУЮ ЦЕННОСТЬ БЕЗ ЛИШНИХ НАЦЕНОК." : language === "UA" ? "НАША МЕТА ПРОСТА: СТАТИ НАЙНАДІЙНІШИМ І ДОСТУПНИМ БРЕНДОМ У ЦІЙ СФЕРІ, ПРОПОНУЮЧИ РЕАЛЬНУ ЦІННІСТЬ БЕЗ ЗАЙВИХ НАЦІНОК." : language === "DE" ? "UNSER ZIEL IST EINFACH: DIE VERTRAUENSWÜRDIGSTE UND ZUGÄNGLICHSTE MARKE IN DIESEM BEREICH ZU WERDEN, INDEM WIR ECHTEN WERT OHNE UNNÖTIGE AUFSCHLÄGE BIETEN." : language === "ES" ? "NUESTRO OBJETIVO ES SIMPLE: CONVERTIRNOS EN LA MARCA MÁS CONFIABLE Y ACCESIBLE EN ESTE SECTOR OFRECIENDO VALOR REAL SIN MÁRGENES INNECESARIOS." : "OUR GOAL IS SIMPLE: BECOME THE MOST TRUSTED AND ACCESSIBLE BRAND IN THIS SPACE BY OFFERING REAL VALUE WITHOUT UNNECESSARY MARKUPS."}
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {page === "attestation" && (
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 md:px-10 md:pb-24 md:pt-12">
          <section className="rounded-[1.8rem] border border-white/20 bg-black/15 px-5 py-10 text-center shadow-[0_18px_55px_rgba(0,0,0,0.12)] md:rounded-[2.5rem] md:px-12 md:py-16">
            <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/65">
              Research Use Only
            </div>
            <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.12em] text-white md:text-5xl">
              Qualified Purchaser &amp; Researcher Attestation
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-[12px] uppercase leading-7 tracking-[0.14em] text-white/75 md:text-[14px]">
              These confirmations are mandatory for every purchaser before checkout.
            </p>

            <div className="mx-auto mt-10 max-w-3xl space-y-4 text-left">
              <div className="rounded-[1.4rem] border border-white/20 bg-black/20 px-5 py-6 md:px-8">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">
                  Qualified purchaser status
                </h2>
                <p className="mt-3 text-[12px] font-semibold uppercase leading-7 tracking-[0.1em] text-white/85 md:text-[14px]">
                  I confirm that I am a qualified researcher, licensed professional, or authorized representative of a qualified research organization.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/20 bg-black/20 px-5 py-6 md:px-8">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">
                  No human or animal use
                </h2>
                <p className="mt-3 text-[12px] font-semibold uppercase leading-7 tracking-[0.1em] text-white/85 md:text-[14px]">
                  I will not use these products on humans or animals. All products are sold strictly for laboratory, analytical, or scientific research purposes only.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-white/20 bg-black/20 px-5 py-6 md:px-8">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">
                  Mandatory checkout acceptance
                </h2>
                <p className="mt-3 text-[12px] font-semibold uppercase leading-7 tracking-[0.1em] text-white/85 md:text-[14px]">
                  Before purchase, every customer must actively accept the qualified-purchaser statement, the no-human-or-animal-use commitment, and the website terms and policies. Acceptance is recorded with the order.
                </p>
              </div>
            </div>

            <a
              href="/cart"
              onClick={(event) => handlePublicPageLink(event, "cart")}
              className="mt-10 inline-flex rounded-full bg-white px-8 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-black transition hover:bg-white/90"
            >
              Proceed to Cart
            </a>
          </section>
        </main>
      )}
    </>
  );
}
