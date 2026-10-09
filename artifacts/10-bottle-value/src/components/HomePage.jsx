import "./HomePage.css";
import { ArrowRight, RefreshCw, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PeptigrityMark from "./PeptigrityMark.jsx";

export default function HomePage({
  language,
  tx,
  featuredProducts = [],
  usWarehouseProducts = [],
  productsReady = true,
  onOpenShop,
  onOpenUsWarehouse,
  onOpenRegister,
  getPublicImageUrl = (src) => src,
}) {
  const [isShowingUsProducts, setIsShowingUsProducts] = useState(false);
  const featured = isShowingUsProducts ? usWarehouseProducts : featuredProducts;
  const heroFeatured = featuredProducts.slice(0, 5);
  const heroProduct = heroFeatured[0];
  const productsTrackRef = useRef(null);
  const productsDragRef = useRef(null);
  const suppressProductsClickRef = useRef(false);
  const [isDraggingProducts, setIsDraggingProducts] = useState(false);

  const copy = {
    headlineOne: tx(
      "Peptides.",
      "Пептиды.",
      "Пептиди.",
      "Peptide.",
      "Péptidos."
    ),
    headlineTwo: tx("Better", "Лучшие", "Кращі", "Bessere", "Mejores"),
    headlineThree: tx("Prices.", "Цены.", "Ціни.", "Preise.", "Precios."),
    shopWorldwide: tx("Shop worldwide", "Магазин по всему миру", "Магазин по всьому світу", "Weltweit einkaufen", "Comprar en todo el mundo"),
    usWarehouse: tx("Shop US warehouse", "Магазин со склада США", "Магазин зі складу США", "US-Lager entdecken", "Comprar desde almacén de EE. UU."),
    variants: tx("Popular research peptides", "Популярные исследовательские пептиды", "Популярні дослідницькі пептиди", "Beliebte Forschungspeptide", "Péptidos populares para investigación"),
    usVariants: tx("US Warehouse products", "Товары со склада США", "Товари зі складу США", "Produkte aus dem US-Lager", "Productos del almacén de EE. UU."),
    showUsProducts: tx("Switch to US products", "Переключить на товары из США", "Перемкнути на товари зі США", "Zu US-Produkten wechseln", "Cambiar a productos de EE. UU."),
    showWorldwideProducts: tx("Switch to worldwide", "Переключить на товары со всего мира", "Перемкнути на товари з усього світу", "Zu weltweiten Produkten wechseln", "Cambiar a productos de todo el mundo"),
    showUsProductsShort: tx("Switch to US", "В США", "У США", "Zu US", "A EE. UU."),
    showWorldwideProductsShort: tx("Switch to global", "В МИР", "У СВІТ", "Weltweit", "Global"),
    showAllProducts: tx("Show all products", "Показать все товары", "Показати всі товари", "Alle Produkte anzeigen", "Mostrar todos los productos"),
    register: tx("Register", "Регистрация", "Реєстрація", "Registrieren", "Registrarse"),
    socialTitle: tx("Our social channels", "Наши социальные сети", "Наші соціальні мережі", "Unsere Social-Media-Kanäle", "Nuestras redes sociales"),
    reviews: tx("4.6 · 23 reviews", "4,6 · 23 отзыва", "4,6 · 23 відгуки", "4,6 · 23 Bewertungen", "4,6 · 23 reseñas"),
    followers: tx("1200+ followers", "Более 1200 подписчиков", "Понад 1200 підписників", "Über 1200 Follower", "Más de 1200 seguidores"),
    readReviews: tx("Read reviews", "Читать отзывы", "Читати відгуки", "Bewertungen lesen", "Leer reseñas"),
    followUs: tx("Follow us", "Подписаться", "Стежити", "Folgen", "Síguenos"),
    empty: tx(
      "Featured products are being prepared. Visit the full shop to browse the catalog.",
      "Подборка продуктов готовится. Перейдите в магазин, чтобы изучить каталог.",
      "Добірка продуктів готується. Перейдіть до магазину, щоб переглянути каталог.",
      "Die Produktauswahl wird vorbereitet. Im Shop können Sie den Katalog ansehen.",
      "La selección destacada está en preparación. Visita la tienda para explorar el catálogo."
    ),
  };

  useEffect(() => {
    productsTrackRef.current?.scrollTo({ left: 0 });
    productsDragRef.current = null;
    setIsDraggingProducts(false);
  }, [isShowingUsProducts]);

  const publicImage = (path) =>
    getPublicImageUrl(`${import.meta.env.BASE_URL}${path}`);
  const heroReferenceImage = publicImage("images/homepage-hero-background.webp");
  const heroBackdrop = heroReferenceImage;
  const heroMobileImage = publicImage("images/homepage-hero-mobile-vial.webp");
  const useExactEnglishHero = String(language ?? "EN").toUpperCase() === "EN";
  const worldwideIcon = (
    <svg
      aria-hidden="true"
      className="tbv-home__button-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.8 12h18.4M12 2.8c2.4 2.4 3.6 5.5 3.6 9.2s-1.2 6.8-3.6 9.2M12 2.8C9.6 5.2 8.4 8.3 8.4 12s1.2 6.8 3.6 9.2" />
      <path d="M5.5 6.2c1.8 1.2 4.1 1.8 6.5 1.8s4.7-.6 6.5-1.8M5.5 17.8c1.8-1.2 4.1-1.8 6.5-1.8s4.7.6 6.5 1.8" />
    </svg>
  );
  const usFlagIcon = (
    <svg
      aria-hidden="true"
      className="tbv-home__button-icon tbv-home__button-icon--flag"
      viewBox="0 0 20 14"
    >
      <rect width="20" height="14" fill="#fff" />
      <path
        fill="#b22234"
        d="M0 0h20v1H0zm0 2h20v1H0zm0 2h20v1H0zm0 2h20v1H0zm0 2h20v1H0zm0 2h20v1H0zm0 2h20v1H0z"
      />
      <rect width="8.5" height="7.5" fill="#3c3b6e" />
      <g fill="#fff">
        <circle cx="1.5" cy="1.3" r=".45" />
        <circle cx="3.5" cy="1.3" r=".45" />
        <circle cx="5.5" cy="1.3" r=".45" />
        <circle cx="7.3" cy="1.3" r=".4" />
        <circle cx="2.5" cy="3.1" r=".45" />
        <circle cx="4.5" cy="3.1" r=".45" />
        <circle cx="6.5" cy="3.1" r=".45" />
        <circle cx="1.5" cy="5" r=".45" />
        <circle cx="3.5" cy="5" r=".45" />
        <circle cx="5.5" cy="5" r=".45" />
        <circle cx="7.3" cy="5" r=".4" />
        <circle cx="2.5" cy="6.6" r=".45" />
        <circle cx="4.5" cy="6.6" r=".45" />
        <circle cx="6.5" cy="6.6" r=".45" />
      </g>
      <rect x=".25" y=".25" width="19.5" height="13.5" fill="none" stroke="#333" strokeOpacity=".22" strokeWidth=".5" />
    </svg>
  );

  function handleProductsPointerDown(event) {
    // Touch and pen use the browser's native momentum scrolling. Capturing
    // those pointers interrupts horizontal swipes, particularly in Safari.
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = event.currentTarget;
    if (track.scrollWidth <= track.clientWidth) return;
    productsDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: track.scrollLeft,
      dragging: false,
    };
  }

  function handleProductsPointerMove(event) {
    const drag = productsDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      drag.dragging = true;
      setIsDraggingProducts(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX;
    if (event.cancelable) event.preventDefault();
  }

  function finishProductsPointer(event) {
    const drag = productsDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.dragging) {
      suppressProductsClickRef.current = true;
      setIsDraggingProducts(false);
      window.setTimeout(() => {
        suppressProductsClickRef.current = false;
      }, 0);
    }

    productsDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function preventClickAfterProductsDrag(event) {
    if (!suppressProductsClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressProductsClickRef.current = false;
  }

  return (
    <main className="tbv-home" data-testid="homepage-content" lang={language?.toLowerCase()}>
      <section
        className={`tbv-home__hero ${useExactEnglishHero ? "tbv-home__hero--reference" : "tbv-home__hero--localized"}`}
        aria-labelledby="tbv-home-heading"
        data-testid="homepage-hero"
        style={useExactEnglishHero ? undefined : {
          backgroundImage: `linear-gradient(90deg, rgba(31,33,36,.16), transparent 58%), url("${heroBackdrop}")`,
        }}
      >
        {useExactEnglishHero ? (
          <>
            <picture className="tbv-home__hero-reference-picture">
              <source media="(max-width: 640px)" srcSet={heroMobileImage} />
              <img
                className="tbv-home__hero-reference-image"
                src={heroReferenceImage}
                alt=""
                aria-hidden="true"
                data-testid="homepage-hero-visual"
                fetchPriority="high"
              />
            </picture>
            <div className="tbv-home__hero-reference-content">
              <div className="tbv-home__hero-reference-copy">
                <h1 id="tbv-home-heading" data-testid="text-homepage-headline">
                  <span>{copy.headlineOne}</span>
                  <span>{copy.headlineTwo} {copy.headlineThree}</span>
                </h1>
              </div>
              <div className="tbv-home__hero-reference-actions">
                <div className="tbv-home__hero-reference-shop-actions">
                  <button
                    className="tbv-home__button tbv-home__button--primary tbv-home__hero-reference-action"
                    type="button"
                    data-testid="button-home-shop-worldwide"
                    onClick={() => onOpenShop()}
                  >
                    {worldwideIcon}<span>{copy.shopWorldwide}</span><span className="tbv-home__arrow" aria-hidden="true">→</span>
                  </button>
                  <button
                    className="tbv-home__button tbv-home__button--secondary tbv-home__hero-reference-action"
                    type="button"
                    data-testid="button-home-shop-us"
                    onClick={onOpenUsWarehouse}
                  >
                    {usFlagIcon}<span>{copy.usWarehouse}</span><span className="tbv-home__arrow" aria-hidden="true">→</span>
                  </button>
                </div>
                <button
                  className="tbv-home__button tbv-home__button--secondary tbv-home__hero-reference-action tbv-home__hero-register-action"
                  type="button"
                  data-testid="button-home-register"
                  onClick={onOpenRegister}
                >
                  <UserRound aria-hidden="true" className="tbv-home__button-icon" strokeWidth={1.8} />
                  <span>{copy.register}</span>
                  <span className="tbv-home__arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </>
        ) : (
        <div className="tbv-home__hero-inner tbv-home__container">
          <div className="tbv-home__hero-copy">
            <h1 id="tbv-home-heading" data-testid="text-homepage-headline">
              <span>{copy.headlineOne}</span>
              <span className="tbv-home__headline-secondary">{copy.headlineTwo}</span>
              <span className="tbv-home__headline-secondary">{copy.headlineThree}</span>
            </h1>
            <div className="tbv-home__hero-actions">
              <div className="tbv-home__hero-shop-actions">
                <button
                  className="tbv-home__button tbv-home__button--primary"
                  type="button"
                  data-testid="button-home-shop-worldwide"
                  onClick={() => onOpenShop()}
                >
                  {worldwideIcon}<span>{copy.shopWorldwide}</span><span className="tbv-home__arrow" aria-hidden="true">→</span>
                </button>
                <button
                  className="tbv-home__button tbv-home__button--secondary"
                  type="button"
                  data-testid="button-home-shop-us"
                  onClick={onOpenUsWarehouse}
                >
                  {usFlagIcon}<span>{copy.usWarehouse}</span><span className="tbv-home__arrow" aria-hidden="true">→</span>
                </button>
              </div>
              <button
                className="tbv-home__button tbv-home__button--secondary tbv-home__hero-register-action"
                type="button"
                data-testid="button-home-register"
                onClick={onOpenRegister}
              >
                <UserRound aria-hidden="true" className="tbv-home__button-icon" strokeWidth={1.8} />
                <span>{copy.register}</span>
                <span className="tbv-home__arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div
            className="tbv-home__hero-art"
            role="img"
            aria-label={heroProduct ? `${heroFeatured.length} featured products, including ${heroProduct.name} ${heroProduct.dose}` : copy.variants}
            data-testid="homepage-hero-visual"
          >
            <div className="tbv-home__hero-vials" aria-hidden="true">
              {heroFeatured.map((product, index) => (
                <div className={`tbv-home__hero-vial tbv-home__hero-vial--${index}`} key={`${product.id ?? product.name}-hero`}>
                  <div className="tbv-home__hero-vial-image">{product.image}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </section>

      {productsReady && (
      <section className="tbv-home__section" id="tbv-home-products" aria-labelledby="tbv-home-featured-heading" data-testid="homepage-featured">
        <div className="tbv-home__container tbv-home__container--featured">
          <div className="tbv-home__section-head">
            <div>
              <h2 id="tbv-home-featured-heading">
                {isShowingUsProducts ? copy.usVariants : copy.variants}
              </h2>
            </div>
            <div className="tbv-home__section-actions">
              <button
                className="tbv-home__text-link tbv-home__text-link--warehouse-switch"
                type="button"
                data-testid="button-home-show-us-products"
                aria-label={isShowingUsProducts ? copy.showWorldwideProducts : copy.showUsProducts}
                aria-pressed={isShowingUsProducts}
                onClick={() => setIsShowingUsProducts((showingUs) => !showingUs)}
              >
                <span className="tbv-home__warehouse-switch-label tbv-home__warehouse-switch-label--full">
                  <span className="tbv-home__warehouse-switch-options">
                    <span aria-hidden={isShowingUsProducts} data-active={!isShowingUsProducts}>{copy.showUsProducts}</span>
                    <span aria-hidden={!isShowingUsProducts} data-active={isShowingUsProducts}>{copy.showWorldwideProducts}</span>
                  </span>
                  <RefreshCw className="tbv-home__switch-icon tbv-home__switch-icon--full" size={14} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="tbv-home__warehouse-switch-label--short">
                  {isShowingUsProducts ? copy.showWorldwideProductsShort : copy.showUsProductsShort}
                </span>
                <RefreshCw className="tbv-home__switch-icon tbv-home__switch-icon--short" size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button
                className="tbv-home__text-link"
                type="button"
                data-testid="button-home-show-all-products"
                onClick={() => isShowingUsProducts ? onOpenUsWarehouse() : onOpenShop()}
              >
                {copy.showAllProducts}
                <span className="tbv-home__arrow tbv-home__arrow--show-all" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <div
            ref={productsTrackRef}
            className="tbv-home__products"
            role="region"
            aria-label={isShowingUsProducts ? copy.usVariants : copy.variants}
            tabIndex={0}
            data-testid="list-home-featured-products"
            data-dragging={isDraggingProducts ? "true" : undefined}
            onPointerDown={handleProductsPointerDown}
            onPointerMove={handleProductsPointerMove}
            onPointerUp={finishProductsPointer}
            onPointerCancel={finishProductsPointer}
            onClickCapture={preventClickAfterProductsDrag}
          >
            {featured.length ? featured.map((product, index) => (
              <div className="tbv-home__product-slot" key={`${product.id ?? product.name}-${product.dose ?? index}`} data-testid={`card-featured-product-${product.id ?? index}`}>
                {product.card}
              </div>
            )) : (
              <div className="tbv-home__empty" data-testid="empty-home-featured-products">
                {isShowingUsProducts
                  ? tx(
                    "US Warehouse products are being prepared. Visit the US shop to browse the catalog.",
                    "Товары со склада США готовятся. Откройте магазин США, чтобы посмотреть каталог.",
                    "Товари зі складу США готуються. Відкрийте магазин США, щоб переглянути каталог.",
                    "US-Lager-Produkte werden vorbereitet. Im US-Shop können Sie den Katalog ansehen.",
                    "Los productos del almacén de EE. UU. se están preparando. Visita la tienda US para ver el catálogo."
                  )
                  : copy.empty}
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      <section
        className="tbv-home__social"
        aria-labelledby="tbv-home-social-heading"
        data-testid="homepage-social-channels"
      >
        <div className="tbv-home__social-content">
          <h2 id="tbv-home-social-heading">{copy.socialTitle}</h2>
          <div className="tbv-home__social-links">
            <a
              className="tbv-home__social-link tbv-home__social-link--x"
              href="https://x.com/10BottleValueCo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`X (Twitter), ${copy.followers}`}
              data-testid="link-home-x"
            >
              <span className="tbv-home__social-mark tbv-home__social-mark--x" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2h3.1l-6.8 7.8L23 22h-6.1l-4.8-8.4L4.8 22H1.6l7.3-8.4L1 2h6.3l4.3 7.8L18.9 2Zm-1.1 18h1.7L6.1 3.9H4.3L17.8 20Z" /></svg>
              </span>
              <span className="tbv-home__social-name">X (Twitter)</span>
              <span className="tbv-home__social-meta">{copy.followers}</span>
              <span className="tbv-home__social-button">{copy.followUs}<ArrowRight size={12} aria-hidden="true" /></span>
            </a>
            <a
              className="tbv-home__social-link tbv-home__social-link--trustpilot"
              href="https://www.trustpilot.com/review/10bottlevalue.co"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Trustpilot, ${copy.reviews}`}
              data-testid="link-home-trustpilot"
            >
              <span className="tbv-home__social-mark tbv-home__social-mark--trustpilot" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1.4 2.55 7.85h8.25l-6.67 4.85 2.55 7.85L12 17.1l-6.68 4.85 2.55-7.85L1.2 9.25h8.25L12 1.4Z" /></svg>
              </span>
              <span className="tbv-home__social-name">Trustpilot</span>
              <span className="tbv-home__social-stars" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((star) => (
                  <span className={star === 4 ? "tbv-home__social-star tbv-home__social-star--partial" : "tbv-home__social-star"} key={star}>★</span>
                ))}
              </span>
              <span className="tbv-home__social-meta">{copy.reviews}</span>
              <span className="tbv-home__social-button">{copy.readReviews}<ArrowRight size={12} aria-hidden="true" /></span>
            </a>
            <div
              className="tbv-home__social-link tbv-home__social-link--peptigrity"
              data-testid="card-home-peptigrity"
            >
              <PeptigrityMark />
              <span className="tbv-home__social-name">Peptigrity</span>
              <a
                className="tbv-home__social-button"
                href="https://peptigrity.com/add/review?shopId=279"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-home-peptigrity-review"
              >
                REVIEW US ON PEPTERGITY
                <ArrowRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
