import "./HomePage.css";
import { ArrowLeft, ArrowRight, RefreshCw, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SocialChannels from "./SocialChannels.jsx";

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
  const feedProducts = isShowingUsProducts ? usWarehouseProducts : featuredProducts;
  const isReconstitutionSolution = (product) =>
    String(product.name || "").trim().toLowerCase() === "reconstitution solution";
  const featured = [
    ...feedProducts.filter((product) => !isReconstitutionSolution(product)),
    ...feedProducts.filter(isReconstitutionSolution),
  ];
  const heroFeatured = featuredProducts.slice(0, 5);
  const heroProduct = heroFeatured[0];
  const productsTrackRef = useRef(null);
  const productsDragRef = useRef(null);
  const suppressProductsClickRef = useRef(false);
  const productsArrowHoldRef = useRef(null);
  const suppressProductsArrowClickRef = useRef(false);
  const [isDraggingProducts, setIsDraggingProducts] = useState(false);
  const [productsScrollState, setProductsScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

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
    scrollProductsLeft: tx("Scroll products left", "Листать товары влево", "Гортати товари вліво", "Produkte nach links scrollen", "Desplazar productos a la izquierda"),
    scrollProductsRight: tx("Scroll products right", "Листать товары вправо", "Гортати товари вправо", "Produkte nach rechts scrollen", "Desplazar productos a la derecha"),
    register: tx("Register", "Регистрация", "Реєстрація", "Registrieren", "Registrarse"),
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

  useEffect(() => {
    const track = productsTrackRef.current;
    if (!track) {
      setProductsScrollState({ canScrollLeft: false, canScrollRight: false });
      return undefined;
    }

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      const nextState = {
        canScrollLeft: track.scrollLeft > 2,
        canScrollRight: maxScrollLeft - track.scrollLeft > 2,
      };
      setProductsScrollState((current) => (
        current.canScrollLeft === nextState.canScrollLeft
        && current.canScrollRight === nextState.canScrollRight
          ? current
          : nextState
      ));
    };

    updateScrollState();
    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState, { passive: true });

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(track);
      track.querySelectorAll(".tbv-home__product-slot").forEach((slot) => {
        resizeObserver.observe(slot);
      });
    }

    return () => {
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [featured.length, isShowingUsProducts, productsReady]);

  useEffect(() => {
    const finishOnPointerRelease = (event) => {
      const hold = productsArrowHoldRef.current;
      if (!hold || hold.pointerId !== event.pointerId) return;
      stopProductsArrowHold(event.type === "pointerup");
    };
    const stopOnWindowBlur = () => stopProductsArrowHold(false);

    window.addEventListener("pointerup", finishOnPointerRelease);
    window.addEventListener("pointercancel", finishOnPointerRelease);
    window.addEventListener("blur", stopOnWindowBlur);
    return () => {
      window.removeEventListener("pointerup", finishOnPointerRelease);
      window.removeEventListener("pointercancel", finishOnPointerRelease);
      window.removeEventListener("blur", stopOnWindowBlur);
      stopProductsArrowHold(false);
    };
  }, []);

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

  function scrollProducts(direction) {
    const track = productsTrackRef.current;
    if (!track) return;

    const firstCard = track.querySelector(".tbv-home__product-slot");
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const distance = firstCard
      ? firstCard.getBoundingClientRect().width + gap
      : Math.max(track.clientWidth * 0.8, 1);

    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  function stopProductsArrowHold(scrollIfTapped = false) {
    const hold = productsArrowHoldRef.current;
    if (!hold) return;

    window.clearTimeout(hold.delayTimer);
    if (hold.frameId != null) window.cancelAnimationFrame(hold.frameId);
    productsArrowHoldRef.current = null;

    if (scrollIfTapped && !hold.started) scrollProducts(hold.direction);

    suppressProductsArrowClickRef.current = true;
    window.setTimeout(() => {
      suppressProductsArrowClickRef.current = false;
    }, 0);
  }

  function startProductsArrowHold(event, direction) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (productsArrowHoldRef.current) stopProductsArrowHold(false);
    event.currentTarget.setPointerCapture(event.pointerId);

    const hold = {
      direction,
      pointerId: event.pointerId,
      started: false,
      delayTimer: null,
      frameId: null,
      lastFrameTime: null,
    };
    productsArrowHoldRef.current = hold;

    hold.delayTimer = window.setTimeout(() => {
      if (productsArrowHoldRef.current !== hold) return;
      hold.started = true;

      const scrollContinuously = (time) => {
        if (productsArrowHoldRef.current !== hold) return;
        const track = productsTrackRef.current;
        if (!track) {
          stopProductsArrowHold(false);
          return;
        }

        const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
        const distanceToEdge = direction > 0
          ? maxScrollLeft - track.scrollLeft
          : track.scrollLeft;
        if (distanceToEdge <= 1) {
          stopProductsArrowHold(false);
          return;
        }

        const elapsed = hold.lastFrameTime == null
          ? 16
          : Math.min(time - hold.lastFrameTime, 40);
        hold.lastFrameTime = time;
        track.scrollLeft += direction * Math.min(30, elapsed * 0.75);
        hold.frameId = window.requestAnimationFrame(scrollContinuously);
      };

      hold.frameId = window.requestAnimationFrame(scrollContinuously);
    }, 180);
  }

  function handleProductsArrowClick(direction, event) {
    if (suppressProductsArrowClickRef.current) {
      event.preventDefault();
      suppressProductsArrowClickRef.current = false;
      return;
    }
    scrollProducts(direction);
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
            {/* Preserve the original artwork while restoring the requested compound name. */}
            <svg className="tbv-home__restored-hero-label" viewBox="0 0 1983 793" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="tbv-restored-label-silver" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#b3b5b2"/><stop offset=".2" stopColor="#e9eae7"/><stop offset=".76" stopColor="#f4f4f1"/><stop offset="1" stopColor="#c4c5c2"/></linearGradient></defs>
              <rect x="1267" y="407" width="186" height="96" fill="url(#tbv-restored-label-silver)"/>
              <text x="1360" y="466" textAnchor="middle" fill="#153656" fontFamily="Arial, sans-serif" fontSize="30" fontWeight="700" textLength="165" lengthAdjust="spacingAndGlyphs">RETATRUTIDE</text>
            </svg>
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
          <div className="tbv-home__products-shell">
            {productsScrollState.canScrollLeft && (
                <button
                  type="button"
                  className="tbv-home__products-scroll-button tbv-home__products-scroll-button--left"
                  aria-label={copy.scrollProductsLeft}
                  aria-controls="tbv-home-featured-products-track"
                  data-testid="button-home-featured-scroll-left"
                  onPointerDown={(event) => startProductsArrowHold(event, -1)}
                  onClick={(event) => handleProductsArrowClick(-1, event)}
                >
                  <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
                </button>
            )}
            {productsScrollState.canScrollRight && (
                <button
                  type="button"
                  className="tbv-home__products-scroll-button tbv-home__products-scroll-button--right"
                  aria-label={copy.scrollProductsRight}
                  aria-controls="tbv-home-featured-products-track"
                  data-testid="button-home-featured-scroll-right"
                  onPointerDown={(event) => startProductsArrowHold(event, 1)}
                  onClick={(event) => handleProductsArrowClick(1, event)}
                >
                  <ArrowRight size={20} strokeWidth={2.4} aria-hidden="true" />
                </button>
            )}
            <div
              id="tbv-home-featured-products-track"
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
        </div>
      </section>
      )}

      <SocialChannels tx={tx} />
    </main>
  );
}
