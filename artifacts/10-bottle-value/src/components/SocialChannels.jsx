import { ArrowRight } from "lucide-react";
import PeptigrityMark from "./PeptigrityMark.jsx";

export default function SocialChannels({ tx, testIdPrefix = "home", contactLayout = false }) {
  const sectionTestId = testIdPrefix === "home"
    ? "homepage-social-channels"
    : `${testIdPrefix}-social-channels`;
  const copy = {
    title: tx(
      "Our social channels",
      "Наши социальные сети",
      "Наші соціальні мережі",
      "Unsere Social-Media-Kanäle",
      "Nuestras redes sociales"
    ),
    reviews: tx("4.6 · 23 reviews", "4,6 · 23 отзыва", "4,6 · 23 відгуки", "4,6 · 23 Bewertungen", "4,6 · 23 reseñas"),
    followers: tx("1200+ followers", "Более 1200 подписчиков", "Понад 1200 підписників", "Über 1200 Follower", "Más de 1200 seguidores"),
    readReviews: tx("Read reviews", "Читать отзывы", "Читати відгуки", "Bewertungen lesen", "Leer reseñas"),
    followUs: tx("Follow us", "Подписаться", "Стежити", "Folgen", "Síguenos"),
  };

  return (
    <section
      className={`tbv-home__social${contactLayout ? " tbv-home__social--contact" : ""}`}
      aria-labelledby={`tbv-${testIdPrefix}-social-heading`}
      data-testid={sectionTestId}
    >
      <div className="tbv-home__social-content">
        <h2 id={`tbv-${testIdPrefix}-social-heading`}>{copy.title}</h2>
        <div className="tbv-home__social-links">
          <a
            className="tbv-home__social-link tbv-home__social-link--x"
            href="https://x.com/10BottleValueCo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`X (Twitter), ${copy.followers}`}
            data-testid={`link-${testIdPrefix}-x`}
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
            data-testid={`link-${testIdPrefix}-trustpilot`}
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
            data-testid={`card-${testIdPrefix}-peptigrity`}
          >
            <PeptigrityMark />
            <span className="tbv-home__social-name">Peptigrity</span>
            <a
              className="tbv-home__social-button"
              href="https://peptigrity.com/add/review?shopId=279"
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-${testIdPrefix}-peptigrity-review`}
            >
              REVIEW US ON PEPTERGITY
              <ArrowRight size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
