import "./_group.css";
import "./TwoColumn.css";

const footerLinks = [
  ["Terms", "/terms-and-conditions"],
  ["Privacy", "/privacy-policy"],
  ["Shipping", "/shipping-policy"],
  ["Refund", "/refund-policy"],
  ["Contact", "/contact"],
  ["Researcher Attestation", "/researcher-attestation"],
] as const;

export function TwoColumn() {
  return (
    <section className="footer-demo footer-demo--compact">
      <div className="footer-demo__inner footer-demo__inner--compact">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white">
          Research Use Only
        </div>

        <div className="footer-demo__ruo">
          FOR LABORATORY RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE.
        </div>

        <div className="footer-demo__divider" />

        <nav className="footer-demo__links" aria-label="Legal">
          {footerLinks.map(([label, href], index) => (
            <span className="contents" key={href}>
              {index > 0 && <span className="footer-demo__separator">•</span>}
              <a href={href}>{label}</a>
            </span>
          ))}
        </nav>

        <details className="footer-demo__attestation">
          <summary>Researcher &amp; purchaser attestation</summary>
          <div className="footer-demo__attestation-copy">
            <p>
              Every purchaser must confirm they are over 21 years old and that
              all products are sold strictly for research purposes only, not
              for human or animal use.
            </p>
            <p>
              Every purchaser must also confirm they are a qualified
              researcher, licensed professional, or authorized representative
              of a qualified research organization, and will not use these
              products on humans or animals. This attestation is required and
              logged with every order before checkout.
            </p>
            <a href="/researcher-attestation">
              Read the full researcher attestation
            </a>
          </div>
        </details>

        <div className="footer-demo__legal-grid">
          <section className="footer-demo__legal-card">
            <h2>Company information</h2>
            <p className="footer-demo__company footer-demo__company--mobile">
              <strong>10BottleValueCo SIA</strong>
              {" · Reg. No. 40203750341 · Avotu iela 8, Lielvārde, Ogres nov., LV-5071, Latvia · "}
              <a href="mailto:support@10bottlevalue.co">
                SUPPORT@10BOTTLEVALUE.CO
              </a>
              <span> · 21+</span>
            </p>
            <div className="footer-demo__company--desktop">
              <strong>10BottleValueCo SIA</strong>
              <span>Reg. No. 40203750341</span>
              <span>Avotu iela 8, Lielvārde, Ogres nov., LV-5071, Latvia</span>
              <a href="mailto:support@10bottlevalue.co">
                support@10bottlevalue.co
              </a>
              <span>21+</span>
            </div>
          </section>

          <section className="footer-demo__legal-card">
            <h2>Purchaser &amp; product notice</h2>
            <p>
              The buyer is responsible for ensuring compliance with local laws
              and regulations. Orders fulfilled via international partners. All
              translations are provided for convenience only.
            </p>
            <p className="footer-demo__medical">
              This site does not provide medical advice. These statements have
              not been evaluated by the FDA. Products are not drugs and are not
              intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}