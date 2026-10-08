export default function TermsConditionsPage({ i18n, legal }) {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-8 md:px-10 md:pt-12 md:pb-16">
      <div className="rounded-[1.5rem] border border-white/20 bg-black/20 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:rounded-[2rem] md:p-12">
        <h1 className="text-center text-2xl font-semibold uppercase tracking-[0.1em] text-white md:text-5xl">
          {i18n(legal.termsTitle)}
        </h1>
        <p className="mt-3 text-center text-[12px] uppercase tracking-[0.12em] text-white/60">
          {i18n(legal.lastUpdated)}
        </p>

        <div className="mx-auto mt-10 max-w-3xl text-[13px] uppercase leading-8 tracking-[0.08em] text-white/80 md:text-[14px] md:leading-9">
          {[
            {
              h: "1. DEFINITIONS",
              p: [
                `"Company", "We", "Us", or "Our" means 10BottleValueCo, the operator of this website.`,
                `"Website" means www.10bottlevalue.co and any associated domains, subdomains, or online services operated by the Company.`,
                `"Customer", "Purchaser", or "You" means any individual or legal entity accessing this Website, creating an account, placing an order, or otherwise using the services provided by the Company.`,
                `"Products" means all research materials, laboratory chemicals, peptides, compounds, reagents, accessories, documentation, and any other goods offered through this Website.`,
                `"Order" means any request submitted by a Customer to purchase Products through the Website.`,
                `"Third-Party Fulfillment Partner" means an independent logistics provider, warehouse, shipping partner, or supplier involved in the storage, packaging, fulfillment, or transportation of Products.`,
                `"Applicable Law" means any law, regulation, governmental requirement, administrative order, sanction, or legally binding rule applicable to the Customer, the Company, or the transaction.`,
              ],
            },
            {
              h: "2. ACCEPTANCE OF TERMS",
              p: [
                "By accessing, browsing, creating an account, submitting information, placing an Order, or otherwise using this Website, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms & Conditions.",
                "If you do not agree with any provision of these Terms & Conditions, you must immediately discontinue use of this Website.",
                "These Terms constitute a legally binding agreement between you and 10BottleValueCo.",
              ],
            },
            {
              h: "3. ELIGIBILITY",
              p: [
                "You may only use this Website if: you are at least twenty-one (21) years of age; you possess legal capacity to enter into binding agreements; purchasing Products is lawful within your jurisdiction; you are not prohibited by any applicable law, sanction, regulation, or governmental restriction from purchasing the Products offered on this Website.",
                "The Company reserves the right to request identity verification or proof of age before accepting any Order. Failure to provide requested verification may result in cancellation of the Order.",
              ],
            },
            {
              h: "4. RESEARCH USE ONLY",
              p: [
                "All Products available through this Website are sold strictly for laboratory research purposes only. Products are not intended for human consumption, veterinary use, medical treatment, diagnosis, disease prevention, therapeutic use, cosmetic use, recreational use, or household use.",
                "Products have not been evaluated, approved, licensed, or authorized for human or veterinary use by the FDA, EMA, MHRA, or any other governmental or regulatory authority unless explicitly stated otherwise.",
                "Nothing contained on this Website shall be interpreted as medical advice, healthcare advice, treatment recommendations, dosage recommendations, efficacy claims, safety claims, or regulatory approval.",
                "Scientific publications, references, studies, literature, or educational materials are provided solely for informational purposes and shall not be interpreted as representations regarding the Products sold by the Company.",
              ],
            },
            {
              h: "5. PURCHASER REPRESENTATIONS",
              p: [
                "By placing an Order, you represent and warrant that: you understand the nature of laboratory research materials; you possess sufficient scientific knowledge to lawfully purchase such Products or are purchasing them on behalf of qualified personnel; Products will only be used in lawful laboratory research; Products will never be used for human consumption; Products will never be administered to animals where prohibited by law; Products will be stored appropriately; Products will only be handled by qualified individuals where applicable; you accept all risks associated with purchasing, transporting, possessing, storing, and handling the Products.",
                "You further agree that you are solely responsible for determining whether the Products are suitable for your intended lawful research purposes.",
              ],
            },
            {
              h: "6. LEGAL COMPLIANCE",
              p: [
                "The Customer is solely responsible for ensuring that purchasing, importing, exporting, transporting, possessing, storing, and using the Products complies with all Applicable Laws.",
                "The Company makes no representation that any Product may lawfully be imported, possessed, or used within any specific jurisdiction. The Customer assumes full responsibility for determining whether Products may legally enter their country or territory.",
                "The Company reserves the right to refuse, suspend, delay, or cancel any Order where shipment may violate Applicable Laws, export restrictions, sanctions, customs regulations, or governmental requirements.",
              ],
            },
            {
              h: "7. EXPORT RESTRICTIONS",
              p: [
                "The Company reserves the right to refuse shipment to any country, territory, individual, organization, or entity where supplying Products may violate Applicable Laws, sanctions, export controls, or governmental regulations.",
                "Orders may also be refused where the Company reasonably believes shipment could expose the Company, its logistics partners, payment providers, or suppliers to legal or regulatory risk.",
              ],
            },
            {
              h: "8. SANCTIONS COMPLIANCE",
              p: [
                "The Customer represents and warrants that they are not subject to international sanctions, listed on any applicable government sanctions list, purchasing Products on behalf of sanctioned individuals or entities, or located within territories prohibited under Applicable Law.",
                "The Company reserves the right to refuse any transaction necessary to comply with sanctions laws or regulatory obligations.",
              ],
            },
            {
              h: "9. PRODUCT INFORMATION",
              p: [
                "Product descriptions, technical specifications, laboratory data, analytical reports, certificates, and all other information presented on the Website are provided solely for general informational purposes.",
                "Although reasonable efforts are made to ensure accuracy, the Company does not warrant that any information is complete, current, accurate, or free of errors. Product specifications may change without prior notice.",
                "Images displayed on the Website are for illustrative purposes only and may not precisely represent the actual Product received.",
              ],
            },
            {
              h: "10. CERTIFICATES OF ANALYSIS (COA)",
              p: [
                "Where available, Certificates of Analysis (\"COAs\") are provided solely for informational and transparency purposes.",
                "Unless explicitly stated otherwise, a published COA should not be interpreted as representing every individual production batch or shipment. The Company does not warrant that every Product supplied will correspond to any specific published COA unless expressly confirmed in writing.",
                "Laboratory testing may be performed by independent third-party laboratories. The Company is not responsible for errors, omissions, or subsequent changes in analytical results produced by independent laboratories.",
              ],
            },
            {
              h: "11. PRICING",
              p: [
                "All prices displayed on the Website are shown in United States Dollars (USD) unless otherwise stated. Prices are subject to change at any time without prior notice.",
                "The Company reserves the right to modify product pricing, promotions, discounts, shipping fees, product availability, product packaging, and inventory allocation. Price changes shall not affect Orders that have already been accepted and fully paid unless an obvious pricing error has occurred.",
                "The Company reserves the right to cancel Orders affected by manifest pricing errors.",
              ],
            },
            {
              h: "12. PRODUCT FORMAT",
              p: [
                "Unless otherwise expressly stated, Products are sold exclusively as complete ten (10) vial kits. Individual vials may not be available for purchase.",
                "Product photographs, packaging, labels, and presentation may differ from those displayed on the Website without affecting the nature or quality of the Products.",
              ],
            },
            {
              h: "13. ORDERS",
              p: [
                "Submission of an Order constitutes an offer to purchase Products. The Company reserves the right to accept or reject any Order at its sole discretion.",
                "An Order shall not be considered accepted until payment has been successfully received and the Order has entered processing. Receipt of an automated confirmation email does not constitute acceptance of an Order.",
                "The Company reserves the right to refuse or cancel Orders for reasons including, but not limited to: suspected fraud, payment verification failure, pricing errors, inventory shortages, supplier availability, regulatory compliance, shipping restrictions, export restrictions, sanctions compliance, incorrect customer information, or suspected misuse of Products.",
              ],
            },
            {
              h: "14. PAYMENT TERMS",
              p: [
                "Payment methods available at checkout may change at any time without prior notice. Accepted payment methods may include cryptocurrency, credit cards, debit cards, bank transfers, alternative payment providers, and any other payment methods displayed during checkout.",
                "The Company reserves the right to change payment providers without prior notice. Payment authorization does not guarantee acceptance of an Order. Orders will not be processed until payment has been successfully confirmed.",
              ],
            },
            {
              h: "15. PAYMENT VERIFICATION",
              p: [
                "To reduce fraud and comply with applicable regulations, the Company may perform payment verification procedures including identity verification, address verification, payment confirmation, fraud screening, and transaction review.",
                "Failure to complete verification may result in cancellation of the Order.",
              ],
            },
            {
              h: "16. FRAUD PREVENTION",
              p: [
                "The Company actively monitors transactions for fraudulent activity. Orders may be delayed, suspended, cancelled, or refunded where fraud is reasonably suspected.",
                "The Company reserves the right to cooperate with payment processors, financial institutions, law enforcement agencies, and governmental authorities where required by Applicable Law.",
              ],
            },
            {
              h: "17. SHIPPING",
              p: [
                "Shipping services are provided through independent third-party fulfillment and logistics partners.",
                "Estimated delivery times published on the Website are estimates only.",
                "Delivery dates are not guaranteed.",
                "Transit times may vary depending on customs clearance, carrier delays, weather, governmental inspections, holidays, destination country, transportation disruptions, and other circumstances beyond our reasonable control.",
                "Shipping delays caused by carriers, customs authorities, weather conditions, transportation disruptions, governmental actions, force majeure events, or other circumstances beyond our reasonable control do not automatically entitle Customers to refunds. Customers experiencing significant delays are encouraged to contact Customer Support so that the circumstances may be reviewed individually.",
              ],
            },
            {
              h: "18. THIRD-PARTY FULFILLMENT",
              p: [
                "Products may be packaged, stored, prepared, and shipped through independent fulfillment partners. The Company reserves the right to utilize different fulfillment partners, warehouses, logistics providers, or shipping methods without prior notice.",
                "The use of third-party fulfillment services does not diminish or expand the Company's obligations under these Terms & Conditions.",
              ],
            },
            {
              h: "19. CUSTOMS",
              p: [
                "International shipments may be subject to customs inspections, import duties, taxes, brokerage fees, import permits, and governmental restrictions.",
                "The Customer is solely responsible for determining whether Products may legally enter their jurisdiction. Any customs charges imposed by governmental authorities remain the sole responsibility of the Customer unless otherwise required by Applicable Law.",
                "The Company shall not be liable for customs delays, inspections, seizures, confiscations, import refusals, or destruction of Products by governmental authorities.",
              ],
            },
            {
              h: "20. SHIPPING DELAYS",
              p: [
                "Shipping delays do not automatically entitle the Customer to a refund. Estimated transit times represent average delivery estimates only.",
                "Unexpected delays may occur due to customs processing, airline scheduling, courier operations, force majeure events, governmental inspections, and transportation disruptions.",
                "The Company shall use commercially reasonable efforts to assist Customers experiencing significant shipping delays.",
              ],
            },
            {
              h: "21. LOST SHIPMENTS",
              p: [
                "If a shipment is confirmed lost by the shipping carrier or otherwise determined by the Company to be permanently lost, the Company may, at its sole discretion, provide one of the following resolutions:",
                "— replacement shipment; — store credit; — partial refund; — full refund; — another commercially reasonable resolution.",
                "The method of resolution shall be determined solely by the Company.",
              ],
            },
            {
              h: "22. RETURNS",
              p: [
                "Due to the specialized nature of laboratory research Products and to preserve product integrity, quality, and safety, returned Products are generally not accepted.",
                "Products must not be returned without prior written authorization from the Company.",
                "Claims relating to damaged, defective, missing, or incorrect Products must be submitted within seven (7) calendar days after delivery.",
                "The Company may request additional information where reasonably necessary to evaluate a claim.",
                "Failure to provide sufficient supporting evidence may result in denial of the claim.",
                "Unauthorized returns may be refused or destroyed without compensation.",
              ],
            },
            {
              h: "23. DAMAGED OR INCORRECT PRODUCTS",
              p: [
                "Customers must inspect all Products immediately upon delivery. Claims relating to damaged, defective, missing, or incorrect Products must be submitted within two (2) calendar days after delivery.",
                "The Company may request photographs, videos, shipping labels, packaging photographs, carrier documentation, and additional evidence reasonably necessary to evaluate the claim. Failure to provide requested documentation may result in denial of the claim.",
              ],
            },
            {
              h: "24. REFUNDS",
              p: [
                "Refund requests are evaluated individually. Refund approval remains solely at the discretion of the Company except where otherwise required by Applicable Law.",
                "Approved refunds may be issued using the original payment method or another reasonable method determined by the Company. Processing times for approved refunds depend upon the payment provider and financial institution involved.",
              ],
            },
            {
              h: "25. CHARGEBACKS",
              p: [
                "Customers agree to contact the Company before initiating any payment dispute or chargeback.",
                "Fraudulent or abusive chargebacks may result in permanent account suspension, cancellation of future Orders, refusal of service, and recovery of associated costs where permitted by Applicable Law.",
                "The Company reserves all legal rights in relation to fraudulent payment disputes.",
              ],
            },
            {
              h: "26. DISCLAIMER OF WARRANTIES",
              p: [
                "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ALL PRODUCTS, SERVICES, CONTENT, AND MATERIALS AVAILABLE THROUGH THIS WEBSITE ARE PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS.",
                "10BottleValueCo MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, UNINTERRUPTED AVAILABILITY, ACCURACY, RELIABILITY, OR SUITABILITY.",
                "No oral statement, written communication, advertising material, scientific publication, customer support communication, or third-party content shall create any warranty unless expressly stated in writing by the Company.",
              ],
            },
            {
              h: "27. LIMITATION OF LIABILITY",
              p: [
                "To the fullest extent permitted by Applicable Law, the Company shall not be liable for any direct, indirect, incidental, consequential, special, punitive, or exemplary damages, including but not limited to loss of profits, loss of revenue, business interruption, loss of research, loss of data, loss of opportunity, reputational damage, legal expenses, or regulatory consequences.",
                "This limitation applies regardless of the legal theory asserted, including contract, tort, negligence, strict liability, statutory liability, or otherwise.",
                "Under no circumstances shall the Company's total aggregate liability exceed the amount actually paid by the Customer for the Products giving rise to the claim.",
              ],
            },
            {
              h: "28. ASSUMPTION OF RISK",
              p: [
                "The Customer acknowledges that laboratory research materials require specialized knowledge and appropriate laboratory practices.",
                "By purchasing Products, the Customer voluntarily assumes all risks associated with transportation, importation, storage, handling, possession, disposal, and lawful laboratory research.",
                "The Customer accepts full responsibility for ensuring compliance with all safety procedures, laboratory protocols, and Applicable Laws.",
              ],
            },
            {
              h: "29. INDEMNIFICATION",
              p: [
                "The Customer agrees to defend, indemnify, and hold harmless 10BottleValueCo, its owners, directors, officers, employees, contractors, suppliers, fulfillment partners, logistics providers, affiliates, successors, and assigns from and against any claims, damages, liabilities, losses, judgments, costs, expenses, or legal fees arising from: violation of these Terms, misuse of Products, unlawful use of Products, violation of Applicable Law, customs violations, regulatory investigations, import restrictions, or third-party claims resulting from Customer conduct.",
                "This indemnification obligation survives termination of these Terms.",
              ],
            },
            {
              h: "30. INTELLECTUAL PROPERTY",
              p: [
                "All content available on this Website, including trademarks, logos, graphics, photographs, product descriptions, scientific content, documents, software, databases, layouts, source code, icons, videos, and downloadable materials, is owned by or licensed to 10BottleValueCo unless otherwise expressly stated.",
                "No intellectual property rights are transferred to the Customer. Customers may not copy, reproduce, republish, distribute, modify, create derivative works, scrape, reverse engineer, or commercially exploit any Website content without prior written permission.",
              ],
            },
            {
              h: "31. WEBSITE LICENSE",
              p: [
                "The Company grants Customers a limited, non-exclusive, non-transferable, revocable license to access and use the Website solely for lawful personal or business purposes relating to the purchase of Products.",
                "This license does not permit automated data collection, web scraping, copying substantial portions of Website content, unauthorized commercial use, resale of Website content, or reverse engineering. The Company may revoke this license at any time.",
              ],
            },
            {
              h: "32. USER ACCOUNTS",
              p: [
                "Customers are responsible for maintaining the confidentiality of their account credentials. Customers remain responsible for all activity occurring under their account.",
                "The Company reserves the right to suspend accounts, terminate accounts, refuse future registrations, remove user-generated content, and cancel associated Orders where reasonably necessary to protect the Website, Customers, or the Company.",
              ],
            },
            {
              h: "33. ACCEPTABLE USE",
              p: [
                "Customers agree not to: violate Applicable Laws, submit false information, interfere with Website security, introduce malicious software, attempt unauthorized access, disrupt Website functionality, impersonate another individual, misuse payment systems, or engage in fraudulent conduct.",
                "Violation of this section may result in immediate termination of Website access.",
              ],
            },
            {
              h: "34. WEBSITE AVAILABILITY",
              p: [
                "The Company does not guarantee uninterrupted availability of the Website. Maintenance, upgrades, technical failures, cyberattacks, infrastructure failures, internet outages, or third-party service interruptions may temporarily affect Website functionality.",
                "The Company reserves the right to modify, suspend, discontinue, or remove any Website functionality without prior notice.",
              ],
            },
            {
              h: "35. FORCE MAJEURE",
              p: [
                "The Company shall not be liable for delays or failure to perform obligations resulting from events beyond its reasonable control, including but not limited to natural disasters, earthquakes, floods, fires, pandemics, epidemics, war, terrorism, civil unrest, labor disputes, governmental actions, customs actions, supplier interruptions, logistics disruptions, carrier failures, transportation shortages, internet outages, cyberattacks, power failures, or infrastructure failures.",
                "Performance shall resume as soon as reasonably practicable after such circumstances cease.",
              ],
            },
            {
              h: "36. ELECTRONIC COMMUNICATIONS",
              p: [
                "By using the Website, you consent to receive communications electronically. Electronic communications may include order confirmations, invoices, shipping notifications, legal notices, policy updates, and customer support communications.",
                "Electronic communications satisfy any legal requirement that communications be in writing where permitted by Applicable Law.",
              ],
            },
            {
              h: "37. PRIVACY",
              p: [
                "Collection and processing of personal information are governed by the Company's Privacy Policy. By using the Website, you acknowledge that personal information may be processed in accordance with the Privacy Policy.",
              ],
            },
            {
              h: "38. SEVERABILITY",
              p: [
                "If any provision of these Terms is determined by a court or competent authority to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.",
                "The invalid provision shall be interpreted to the maximum extent permitted by Applicable Law while preserving the original intent of the parties.",
              ],
            },
            {
              h: "39. NO WAIVER",
              p: [
                "Failure by the Company to enforce any provision of these Terms shall not constitute a waiver of that provision or any other rights available to the Company.",
                "Any waiver must be expressly made in writing and signed by an authorized representative of the Company.",
              ],
            },
            {
              h: "40. ENTIRE AGREEMENT",
              p: [
                "These Terms & Conditions, together with the Privacy Policy, Shipping Policy, Refund Policy, and any additional policies published on the Website, constitute the entire agreement between the Customer and the Company regarding use of the Website and purchase of Products.",
                "They supersede all prior discussions, communications, understandings, representations, and agreements relating to the same subject matter.",
              ],
            },
            {
              h: "41. GOVERNING LAW",
              p: [
                "These Terms & Conditions shall be governed by and construed in accordance with the laws of the Republic of Latvia, without regard to its conflict of law principles.",
                "Nothing in these Terms shall exclude mandatory consumer protection rights that cannot be waived under applicable law.",
              ],
            },
            {
              h: "42. DISPUTE RESOLUTION",
              p: [
                "The parties shall first attempt to resolve any dispute through good-faith negotiations.",
                "If a dispute cannot be resolved amicably, it shall be submitted to the competent courts having jurisdiction under the applicable laws of the Republic of Latvia, unless mandatory applicable law requires otherwise.",
              ],
            },
            {
              h: "43. GOVERNING LANGUAGE",
              p: [
                "These Terms & Conditions have been prepared in the English language. Translations may be provided solely for convenience.",
                "In the event of any inconsistency, ambiguity, or conflict between any translated version and the English version, the English version shall prevail.",
              ],
            },
            {
              h: "44. CHANGES TO THESE TERMS",
              p: [
                "The Company reserves the right to modify these Terms & Conditions at any time. The revised version shall become effective immediately upon publication on the Website unless otherwise required by Applicable Law.",
                "Continued use of the Website following publication of revised Terms constitutes acceptance of the updated Terms. The date of the latest revision shall always appear at the beginning of this document.",
              ],
            },
            {
              h: "45. CONTACT",
              p: [
                "For any questions regarding these Terms & Conditions, legal notices, or compliance matters, please contact:",
                "10BottleValueCo — Email: support@10bottlevalue.co — Website: https://10bottlevalue.co",
              ],
            },
          ].map((section, sIdx) => (
            <section
              key={section.h}
              className={`${sIdx > 0 ? "border-t border-white/10 pt-8 mt-8" : "pt-2"}`}
            >
              <h2 className="mb-4 text-white font-semibold text-[13px] md:text-[14px] tracking-[0.15em]">
                {section.h}
              </h2>
              <div className="space-y-3 text-white/75">
                {section.p.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
