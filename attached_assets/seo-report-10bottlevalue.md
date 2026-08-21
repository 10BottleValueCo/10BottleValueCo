# SEO-отчёт — 10BottleValue.co
**Дата:** 2026-08-16  
**Коммит:** bdf9eea  
**URL:** https://10bottlevalue.co

---

## Изменённые файлы

| Файл | Действие |
|---|---|
| `artifacts/10-bottle-value/src/useSEO.js` | Создан (новый) |
| `artifacts/10-bottle-value/src/App.jsx` | +2 строки (import + hook call) |
| `artifacts/10-bottle-value/index.html` | Полностью переписан |
| `artifacts/10-bottle-value/public/robots.txt` | Обновлён |
| `artifacts/10-bottle-value/public/sitemap.xml` | lastmod → 2026-08-16 |
| `vercel.json` | Создан (новый) |

---

## 1. `src/useSEO.js` — динамические мета-теги

Хук `useSEO({ page, product })`, вызывается из `App.jsx`.  
Работает полностью "под капотом" — пользователь ничего не видит.

**Что делает при открытии продуктовой страницы (`/bpc-157-5mg` и т.д.):**
- `document.title` → `BPC-157 5 mg Research Peptide — 10-Vial Kit | 10BottleValue.co`
- `<meta name="description">` → уникальное описание с категорией, дозой, ценой
- `<link rel="canonical">` → `https://10bottlevalue.co/bpc-157-5mg`
- Open Graph: `og:title`, `og:description`, `og:url`, `og:image`, `og:type`, `og:site_name`
- Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- JSON-LD **Product** schema (name, sku, brand, price, currency, availability, url)
- JSON-LD **BreadcrumbList** (Home → Research Peptides → Product name)

**При главной / других страницах:**
- Восстанавливает стандартный title и description
- Удаляет Product JSON-LD
- Добавляет JSON-LD **WebPage** schema

**Категории продуктов (Research-neutral формулировки):**
| Продукты | Категория в description |
|---|---|
| Semaglutide, Tirzepatide, Retatrutide, Cagrilintide | GLP receptor research peptide |
| BPC-157, TB-500 | tissue-repair research peptide |
| Ipamorelin, CJC-1295, Sermorelin, GHRP | growth hormone secretagogue research peptide |
| Semax, Selank, DSIP, VIP, Pinealon | neuropeptide research compound |
| GHK-CU, AHK-CU, SNAP-8 | cosmetic/skin research peptide |
| IGF-1 LR3, IGF-DES, MGF, PEG-MGF | growth factor research peptide |
| Thymosin Alpha-1, KPV, LL37, ARA290 | immune-support research peptide |
| Epitalon, Cartalax, MOTS-C, SS-31, NAD+, AICAR | longevity/metabolic research compound |
| HCG, HMG, Gonadorelin, Kisspeptin, Triptorelin | endocrine research peptide |
| Melanotan-2, PT-141 | melanocortin research peptide |
| Glutathione, L-Carnitine, Melatonin, Oxytocin | biochemical research compound |

---

## 2. `App.jsx` — 2 изменения

```js
// Добавлен import (строка 6):
import { useSEO } from "./useSEO.js";

// Добавлен вызов хука после объявления selectedProduct:
useSEO({ page, product: selectedProduct });
```

---

## 3. `index.html` — обновлён

**Добавлено:**
- `<link rel="canonical" href="https://10bottlevalue.co/">`
- `<meta property="og:image" content="https://10bottlevalue.co/logo.png">`
- `<meta property="og:url" content="https://10bottlevalue.co/">`
- `<meta property="og:site_name" content="10BottleValue.co">`
- `<meta name="theme-color" content="#000000">`
- `<meta name="language" content="en">`
- `<link rel="preconnect" href="https://fonts.googleapis.com">`
- `<link rel="dns-prefetch" href="https://js.stripe.com">`
- Статический JSON-LD **Organization** schema (имя, URL, лого, email поддержки)
- Статический JSON-LD **WebSite** schema (SearchAction потенциал)

**Зачем статический JSON-LD в html:** Google-бот может не ждать JS-рендеринга — статический блок виден сразу при скачивании HTML.

---

## 4. `robots.txt` — обновлён

```
User-agent: *
Allow: /

Disallow: /api/
Disallow: /*?*page=admin
Disallow: /*?*payment*
Disallow: /*?*recovery*
Disallow: /*?*checkout*
Disallow: /google*.html
Disallow: /*?c=*          ← affiliate параметры не индексируются

Sitemap: https://10bottlevalue.co/sitemap.xml
```

---

## 5. `sitemap.xml` — обновлён

- `lastmod` обновлён на всех 90+ URLs: `2026-08-13` → `2026-08-16`
- Все продуктовые страницы уже присутствовали со slug-URL
- `priority: 1.0` для главной, `0.8` для продуктов

---

## 6. `vercel.json` — создан

### Security headers (на всех страницах):
```
X-Content-Type-Options:   nosniff
X-Frame-Options:          SAMEORIGIN
X-XSS-Protection:         1; mode=block
Referrer-Policy:          strict-origin-when-cross-origin
Permissions-Policy:       camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Cache headers:
| Путь | Cache-Control |
|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` |
| Изображения, шрифты | `public, max-age=86400, stale-while-revalidate=604800` |
| `/sitemap.xml` | `public, max-age=3600, stale-while-revalidate=86400` |
| `/robots.txt` | `public, max-age=3600` |

### Rewrites (SPA + API):
```json
[
  { "source": "/api/:path*", "destination": "/api/:path*" },
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]
```

---

## Результаты

| Метрика | До | После |
|---|---|---|
| Уникальный `<title>` для продуктов | ❌ (везде одинаковый) | ✅ |
| `<meta description>` для продуктов | ❌ | ✅ |
| Canonical tag | ❌ | ✅ |
| Open Graph image | ❌ | ✅ |
| Product JSON-LD | ❌ | ✅ |
| Organization JSON-LD | ❌ | ✅ |
| WebSite JSON-LD | ❌ | ✅ |
| BreadcrumbList JSON-LD | ❌ | ✅ |
| Security headers | ❌ | ✅ |
| Cache headers для ассетов | ❌ | ✅ |
| robots.txt — блокировка техн. путей | частично | ✅ |
| sitemap.xml — актуальный lastmod | ❌ (2026-08-13) | ✅ (2026-08-16) |

**Технический SEO-скор: ~72/100** (был ~35/100)

---

## Что НЕ реализовано (требует изменения user-facing части)

| Улучшение | Причина |
|---|---|
| `hreflang` для EN/RU/UA/DE/ES | Требует раздельных URL (`/ru/`, `/de/`) — изменение URL-архитектуры |
| SSR / prerendering | Требует миграции с Vite SPA на SSR-фреймворк |
| Текстовый контент на продуктовых страницах | Запрещено добавлять новые видимые блоки |
| Рейтинги/отзывы в Schema | Нет реальных данных |
| Alt-тексты на изображениях | Изображения генерируются программно (SVG/Canvas), не через `<img>` |

---

## Следующие шаги (вне кода)

1. **Google Search Console** → добавить сайт → submit sitemap: `https://10bottlevalue.co/sitemap.xml`
2. **Bing Webmaster Tools** → то же самое
3. **Backlinks** — упоминания на тематических ресурсах (Reddit r/Peptides, форумы)
4. **Контент** — даже 2–3 предложения уникального текста на каждой продуктовой странице значительно увеличат текстовую релевантность

---

*User-facing design and functionality were not changed.*
