export default function ShippingRefundPolicyPages({
  page,
  i18n,
  legal,
  copySupportEmail,
  copiedEmail,
  language,
}) {
  return (
    <>
      {page === "shipping" && (
        <main className="mx-auto max-w-5xl px-4 pt-8 pb-8 md:px-10 md:pt-12 md:pb-16">
          <div className="rounded-[1.5rem] border border-white/20 bg-black/20 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:rounded-[2rem] md:p-12">
            <h1 className="text-center text-2xl font-semibold uppercase tracking-[0.1em] text-white md:text-5xl">
              {i18n(legal.shippingTitle)}
            </h1>
            <p className="mt-3 text-center text-[12px] uppercase tracking-[0.12em] text-white/60">
              {i18n(legal.lastUpdated)}
            </p>
            <div className="mx-auto mt-10 max-w-3xl text-[13px] uppercase leading-8 tracking-[0.08em] text-white/80 md:text-[14px] md:leading-9">
              <section className="pt-2">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">1. SHIPPING DESTINATIONS</h2>
                <div className="space-y-3 text-white/75">
                  <p>10BottleValueCo offers worldwide shipping to most countries.</p>
                  <p>Availability of shipping services may vary depending on local laws, carrier availability, sanctions, customs regulations, or other restrictions.</p>
                  <p>We reserve the right to refuse shipment to any destination where delivery is prohibited or impractical.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">2. ORDER PROCESSING</h2>
                <div className="space-y-3 text-white/75">
                  <p>Orders are generally processed within 1–3 business days after successful payment confirmation.</p>
                  <p>Processing times may be extended during holidays, high order volumes, inventory verification, or other exceptional circumstances.</p>
                  <p>Customers will receive a shipping confirmation email once the Order has been dispatched.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">3. INTERNATIONAL STANDARD SHIPPING</h2>
                <div className="space-y-3 text-white/75">
                  <p>Standard international shipping typically takes approximately 8–12 business days.</p>
                  <p>Delivery times are estimates only and are not guaranteed.</p>
                  <p>Actual delivery times may vary depending on destination country, customs clearance, local carrier operations, weather conditions, public holidays, transportation disruptions, governmental inspections, and other circumstances beyond our reasonable control.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">4. INTERNATIONAL EXPRESS SHIPPING</h2>
                <div className="space-y-3 text-white/75">
                  <p>Express shipping is available for eligible destinations.</p>
                  <p>Estimated delivery time is approximately 5–7 business days.</p>
                  <p>Delivery estimates are provided for convenience only and are not guaranteed.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">5. UNITED STATES WAREHOUSE SHIPPING</h2>
                <div className="space-y-3 text-white/75">
                  <p>Products available through our US Warehouse are shipped within the United States.</p>
                  <p>Estimated delivery time is approximately 2–5 business days.</p>
                  <p>Shipping from our US Warehouse is free of charge unless otherwise stated during checkout.</p>
                  <p>Availability of individual Products may differ between our international warehouse and US Warehouse.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">6. TRACKING INFORMATION</h2>
                <div className="space-y-3 text-white/75">
                  <p>Tracking information is generally provided by email after an Order has been processed and shipped.</p>
                  <p>Tracking updates are provided by shipping carriers and may not appear immediately after dispatch.</p>
                  <p>The Company is not responsible for delays in tracking updates caused by shipping carriers.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">7. CUSTOMS</h2>
                <div className="space-y-3 text-white/75">
                  <p>International shipments may be subject to customs inspections, import duties, taxes, import restrictions, or other governmental requirements.</p>
                  <p>Customers are solely responsible for ensuring that Products may legally be imported into their jurisdiction.</p>
                  <p>The Company is not responsible for customs duties, taxes, or other governmental charges imposed by the destination country.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">8. CUSTOMS RESHIPMENT POLICY</h2>
                <div className="space-y-3 text-white/75">
                  <p>Approximately 2% of international shipments may be delayed due to customs inspections.</p>
                  <p>If a shipment is undergoing an extended customs inspection, we may, at our sole discretion, arrange a replacement shipment before a final customs decision is issued.</p>
                  <p>If customs ultimately releases the original shipment, Customers will not be charged for receiving both shipments.</p>
                  <p>If a shipment is confiscated or permanently withheld by customs, we will generally provide one complimentary replacement shipment at no additional cost, subject to verification of the circumstances.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">9. SHIPPING DELAYS</h2>
                <div className="space-y-3 text-white/75">
                  <p>Estimated delivery times are not guaranteed.</p>
                  <p>Unexpected delays caused by customs authorities, shipping carriers, weather conditions, transportation disruptions, governmental actions, force majeure events, or other circumstances beyond our reasonable control do not automatically entitle Customers to refunds.</p>
                  <p>Customers experiencing significant delays are encouraged to contact Customer Support so that the circumstances may be reviewed individually.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">10. INCORRECT SHIPPING INFORMATION</h2>
                <div className="space-y-3 text-white/75">
                  <p>Customers are responsible for ensuring that all shipping information is accurate before submitting an Order.</p>
                  <p>The Company shall not be responsible for delays, returned shipments, failed deliveries, or additional shipping costs resulting from incorrect or incomplete shipping information provided by the Customer.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">11. CARRIER SELECTION</h2>
                <div className="space-y-3 text-white/75">
                  <p>Shipping carriers may vary depending on destination, warehouse availability, logistics requirements, or operational considerations.</p>
                  <p>Where available, Customers may request a preferred carrier during checkout; however, the Company cannot guarantee that a specific carrier will be used.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">12. FORCE MAJEURE</h2>
                <div className="space-y-3 text-white/75">
                  <p>The Company shall not be liable for shipping delays resulting from circumstances beyond its reasonable control, including but not limited to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Natural disasters, war, terrorism, or civil unrest</li>
                    <li>Pandemics or governmental actions</li>
                    <li>Customs delays</li>
                    <li>Transportation disruptions or carrier interruptions</li>
                    <li>Supplier disruptions</li>
                    <li>Internet or infrastructure failures</li>
                  </ul>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">13. CUSTOMER SUPPORT</h2>
                <div className="space-y-3 text-white/75">
                  <p>Customers may contact our Customer Support team at any time regarding shipping questions, tracking information, or delivery status.</p>
                  <p>We are committed to providing timely updates and reasonable assistance throughout the shipping process.</p>
                  <p>
                    <button type="button" onClick={copySupportEmail} className="font-semibold text-white transition hover:text-white/80">
                      {copiedEmail
                        ? language === "RU" ? "EMAIL СКОПИРОВАН" : language === "UA" ? "EMAIL СКОПІЮВАНО" : language === "DE" ? "E-MAIL KOPIERT" : language === "ES" ? "EMAIL COPIADO" : "EMAIL COPIED"
                        : "SUPPORT@10BOTTLEVALUE.CO"}
                    </button>
                  </p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">14. CHANGES TO THIS POLICY</h2>
                <div className="space-y-3 text-white/75">
                  <p>The Company reserves the right to modify this Shipping Policy at any time.</p>
                  <p>Updated versions become effective immediately upon publication on the Website unless otherwise required by Applicable Law.</p>
                  <p>The latest revision date will always appear at the beginning of this Policy.</p>
                </div>
              </section>

              <section className="border-t border-white/10 pt-8 mt-8">
                <h2 className="mb-4 text-white font-semibold tracking-[0.15em]">15. GOVERNING LANGUAGE</h2>
                <div className="space-y-3 text-white/75">
                  <p>Translations of this Shipping Policy may be provided for convenience only.</p>
                  <p>In the event of any inconsistency, ambiguity, or conflict between translated versions and the English version, the English version shall prevail.</p>
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {page === "refund" && (
        <main className="mx-auto max-w-5xl px-4 pt-8 pb-8 md:px-10 md:pt-12 md:pb-16">
          <div className="rounded-[1.5rem] border border-white/20 bg-black/20 p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:rounded-[2rem] md:p-12">
            <h1 className="text-2xl font-semibold uppercase tracking-[0.1em] text-white md:text-5xl">
              {i18n(legal.refundTitle)}
            </h1>
            <div className="mx-auto mt-10 max-w-3xl text-left space-y-8 text-[13px] uppercase leading-8 tracking-[0.08em] text-white/80 md:text-[14px] md:leading-9">
              <section>
                <h2 className="text-white font-semibold">1. GENERAL POLICY</h2>
                <p>At 10BottleValueCo, customer satisfaction is important to us. Due to the specialized nature of laboratory research products, every refund, replacement, and reshipment request is reviewed individually. Except where required by Applicable Law, refunds are not guaranteed and remain subject to review under this Refund Policy.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">2. ORDER CANCELLATIONS</h2>
                <p>Orders may be cancelled for a full refund only before they have entered fulfillment or shipment. Once an Order has entered fulfillment, preparation, or shipment, cancellation may no longer be possible. Where permitted by Applicable Law, non-recoverable payment processing fees may be deducted from approved refunds.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">3. DAMAGED, DEFECTIVE, MISSING OR INCORRECT PRODUCTS</h2>
                <p>Customers must inspect their Order immediately upon delivery. Claims relating to damaged, defective, missing, or incorrect Products must be submitted within seven (7) calendar days after delivery.</p>
                <p className="mt-4">Claims should include:</p>
                <ul className="mt-2 list-disc pl-6 space-y-1">
                  <li>Order number</li>
                  <li>Description of the issue</li>
                  <li>Clear photographs of the Product</li>
                  <li>Photographs of the shipping packaging</li>
                  <li>Photographs of shipping labels where applicable</li>
                </ul>
                <p className="mt-4">The Company may request additional information where reasonably necessary to evaluate a claim. Failure to provide sufficient supporting evidence may result in denial of the claim.</p>
                <p className="mt-4">Approved claims may be resolved through one of the following:</p>
                <ul className="mt-2 list-disc pl-6 space-y-1">
                  <li>Replacement</li>
                  <li>Reshipment</li>
                  <li>Store credit</li>
                  <li>Partial refund</li>
                  <li>Full refund</li>
                  <li>Another commercially reasonable resolution determined solely by the Company</li>
                </ul>
              </section>

              <section>
                <h2 className="text-white font-semibold">4. LOST SHIPMENTS</h2>
                <p>If a shipment is confirmed lost by the shipping carrier or otherwise determined by the Company to be permanently lost, the Company may provide one of the following resolutions:</p>
                <ul className="mt-4 list-disc pl-6 space-y-1">
                  <li>Replacement shipment</li>
                  <li>Store credit</li>
                  <li>Partial refund</li>
                  <li>Full refund</li>
                  <li>Another appropriate resolution</li>
                </ul>
                <p className="mt-4">The method of resolution shall be determined solely by the Company.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">5. SHIPPING DELAYS</h2>
                <p>Estimated shipping times published on the Website are estimates only and are not guaranteed. Unexpected delays caused by customs authorities, shipping carriers, weather conditions, transportation disruptions, governmental actions, force majeure events, or other circumstances beyond our reasonable control do not automatically entitle Customers to refunds. Customers experiencing significant delays are encouraged to contact Customer Support so that the circumstances may be reviewed individually.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">6. CUSTOMS</h2>
                <p>Customers are solely responsible for ensuring that Products may legally be imported into their jurisdiction. The Company is not responsible for:</p>
                <ul className="mt-4 list-disc pl-6 space-y-1">
                  <li>Customs inspections or delays</li>
                  <li>Import restrictions</li>
                  <li>Duties and taxes</li>
                  <li>Confiscations or destruction of Products by customs authorities</li>
                </ul>
                <p className="mt-4">Where appropriate, the Company may voluntarily provide assistance or another resolution at its sole discretion.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">7. INCORRECT SHIPPING INFORMATION</h2>
                <p>Customers are responsible for ensuring that all shipping information is complete and accurate before submitting an Order. The Company shall not be responsible for delays, failed deliveries, returned shipments, or additional shipping costs resulting from inaccurate or incomplete shipping information provided by the Customer.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">8. REFUSED OR UNCLAIMED SHIPMENTS</h2>
                <p>If a shipment is refused, abandoned, unclaimed, or returned due to Customer action, refunds are not guaranteed. Any refund, replacement, or store credit shall remain entirely at the Company's sole discretion.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">9. RETURNS</h2>
                <p>Due to the specialized nature of laboratory research Products and to preserve product integrity, quality, and safety, returned Products are generally not accepted. Products must not be returned without prior written authorization from the Company. Unauthorized returns may be refused or destroyed without compensation.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">10. OUT-OF-STOCK PRODUCTS</h2>
                <p>If a Product becomes unavailable after an Order has been placed but before shipment, Customers may choose one of the following options:</p>
                <ul className="mt-4 list-disc pl-6 space-y-1">
                  <li>Wait until the Product becomes available</li>
                  <li>Replacement with another Product of similar value</li>
                  <li>Store credit</li>
                  <li>Full refund</li>
                </ul>
              </section>

              <section>
                <h2 className="text-white font-semibold">11. REFUND METHOD</h2>
                <p>Approved refunds will generally be issued using the original payment method whenever reasonably possible. For cryptocurrency transactions, refunds may be issued in cryptocurrency. Refund processing times depend upon the payment provider, financial institution, blockchain network, or payment processor. The Company is not responsible for delays caused by third-party payment providers or financial institutions.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">12. FRAUDULENT CLAIMS</h2>
                <p>The Company reserves the right to reject any refund request where fraud, abuse, false information, altered evidence, or other dishonest conduct is reasonably suspected. Additional documentation may be requested before a final decision is made.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">13. CHARGEBACKS</h2>
                <p>Customers are encouraged to contact Customer Support before initiating a payment dispute or chargeback. Fraudulent or abusive chargebacks may result in:</p>
                <ul className="mt-4 list-disc pl-6 space-y-1">
                  <li>Cancellation of future Orders</li>
                  <li>Permanent refusal of service</li>
                  <li>Account suspension</li>
                  <li>Recovery of associated costs where permitted by Applicable Law</li>
                </ul>
                <p className="mt-4">The Company reserves all legal rights regarding fraudulent payment disputes.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">14. FORCE MAJEURE</h2>
                <p>The Company shall not be liable for delays or inability to provide refunds caused by events beyond its reasonable control, including but not limited to:</p>
                <ul className="mt-4 list-disc pl-6 space-y-1">
                  <li>Natural disasters, war, terrorism, or civil unrest</li>
                  <li>Pandemics or governmental actions</li>
                  <li>Customs actions</li>
                  <li>Payment processor or banking interruptions</li>
                  <li>Transportation disruptions or carrier failures</li>
                  <li>Supplier disruptions</li>
                  <li>Internet or infrastructure failures</li>
                </ul>
              </section>

              <section>
                <h2 className="text-white font-semibold">15. CHANGES TO THIS POLICY</h2>
                <p>The Company reserves the right to modify this Refund Policy at any time. Updated versions become effective immediately upon publication on the Website unless otherwise required by Applicable Law. The latest revision date will always appear at the beginning of this Policy.</p>
              </section>

              <section>
                <h2 className="text-white font-semibold">16. CONTACT</h2>
                <p>For refund, replacement, reshipment, or shipping-related inquiries, please contact:</p>
                <p className="mt-4">10BottleValueCo SIA</p>
                <p className="mt-2">
                  <button type="button" onClick={copySupportEmail} className="font-semibold uppercase tracking-[0.08em] text-white transition hover:text-white/80">
                    {copiedEmail
                      ? language === "RU" ? "EMAIL СКОПИРОВАН" : language === "UA" ? "EMAIL СКОПІЙОВАНО" : language === "DE" ? "E-MAIL KOPIERT" : language === "ES" ? "EMAIL COPIADO" : "EMAIL COPIED"
                      : "SUPPORT@10BOTTLEVALUE.CO"}
                  </button>
                </p>
              </section>

              <section>
                <h2 className="text-white font-semibold">17. GOVERNING LANGUAGE</h2>
                <p>Translations of this Refund Policy may be provided for convenience only. In the event of any inconsistency, ambiguity, or conflict between translated versions and the English version, the English version shall prevail.</p>
              </section>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
