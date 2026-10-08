export default function PrivacyPolicyPage({ i18n, legal, tx }) {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-8 md:px-10 md:pt-12 md:pb-16">
      <div className="rounded-[1.5rem] border border-white/20 bg-black/20 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:rounded-[2rem] md:p-12">
        <h1 className="text-center text-2xl font-semibold uppercase tracking-[0.1em] text-white md:text-5xl">
          {i18n(legal.privacyTitle)}
        </h1>
        <p className="mt-3 text-center text-[12px] uppercase tracking-[0.12em] text-white/60">
          {i18n(legal.lastUpdated)}
        </p>

        <div className="mx-auto mt-8 max-w-3xl rounded-[1.2rem] border border-white/15 bg-black/20 px-6 py-5 text-center text-[12px] uppercase tracking-[0.1em] leading-[1.9] text-white/80">
          {tx(
            "Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in this",
            "Ваши персональные данные используются для обработки заказа, поддержки работы сайта и иных целей, описанных в данной",
            "Ваші персональні дані використовуються для обробки замовлення, підтримки роботи сайту та інших цілей, описаних у цій",
            "Ihre persönlichen Daten werden verwendet, um Ihre Bestellung zu bearbeiten, Ihre Erfahrung auf dieser Website zu unterstützen und für andere hier beschriebene Zwecke",
            "Sus datos personales se utilizarán para procesar su pedido, mejorar su experiencia en este sitio web y para otros fines descritos en esta"
          )}{" "}
          <span className="font-bold text-white">
            {tx("Privacy Policy", "Политике конфиденциальности", "Політиці конфіденційності", "Datenschutzrichtlinie", "Política de Privacidad")}
          </span>.
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-8 text-[13px] uppercase leading-8 tracking-[0.08em] text-white/80 md:text-[14px] md:leading-9">
          <section>
            <h2 className="text-white font-semibold">1. INTRODUCTION</h2>
            <p>This Privacy Policy explains how 10BottleValueCo SIA ("Company", "we", "our", or "us") collects, uses, stores, processes, protects, and discloses your personal information when you visit our Website, create an account, place an order, communicate with us, or otherwise use our services.</p>
            <p className="mt-4">We are committed to protecting your privacy and processing your personal information in accordance with applicable privacy and data protection laws, including the General Data Protection Regulation (EU) 2016/679 ("GDPR") where applicable.</p>
            <p className="mt-4">By accessing or using our Website, you acknowledge that you have read and understood this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">2. DATA CONTROLLER</h2>
            <p>The data controller responsible for processing your personal information is:</p>
            <p className="mt-4">10BottleValueCo SIA<br />Registration Number: 40203750341<br />Registered Address: Avotu iela 8, Lielvārde, Ogres nov., LV-5071, Latvia<br />Email: SUPPORT@10BOTTLEVALUE.CO</p>
            <p className="mt-4">Unless otherwise expressly stated, 10BottleValueCo SIA acts as the controller of personal information collected through this Website.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">3. DEFINITIONS</h2>
            <p>For purposes of this Privacy Policy:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li><span className="text-white font-semibold">Personal Data</span> — any information relating to an identified or identifiable natural person.</li>
              <li><span className="text-white font-semibold">Processing</span> — any operation performed on personal data including collection, storage, use, disclosure, transmission, deletion, restriction, organization, or destruction.</li>
              <li><span className="text-white font-semibold">Website</span> — www.10bottlevalue.co and any associated domains operated by the Company.</li>
              <li><span className="text-white font-semibold">Services</span> — all services, products, features, and functionality made available through the Website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold">4. INFORMATION WE COLLECT</h2>
            <p>Depending on how you use our Website, we may collect different categories of personal information.</p>

            <p className="mt-4 text-white font-semibold">4.1 Identity Information</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>First name</li>
              <li>Last name</li>
              <li>Account name</li>
            </ul>

            <p className="mt-4 text-white font-semibold">4.2 Contact Information</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Email address</li>
              <li>Telephone number</li>
            </ul>

            <p className="mt-4 text-white font-semibold">4.3 Shipping Information</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Recipient name</li>
              <li>Shipping address</li>
              <li>Apartment or suite number</li>
              <li>City, state or province, postal code, country</li>
            </ul>

            <p className="mt-4 text-white font-semibold">4.4 Account Information</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Email address</li>
              <li>Encrypted password</li>
              <li>Account preferences</li>
              <li>Saved addresses</li>
              <li>Order history</li>
              <li>Login history</li>
              <li>Account creation date and activity</li>
            </ul>

            <p className="mt-4 text-white font-semibold">4.5 Order Information</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Purchased products</li>
              <li>Order totals</li>
              <li>Shipping methods</li>
              <li>Payment status</li>
              <li>Tracking numbers</li>
              <li>Invoices</li>
              <li>Customer notes and support communications</li>
            </ul>

            <p className="mt-4 text-white font-semibold">4.6 Payment Information</p>
            <p className="mt-2">Payments are processed by independent third-party payment providers. Depending on the selected payment method, payment providers may collect payment information directly. The Company generally does not store complete payment card numbers, card security codes (CVV/CVC), private cryptocurrency wallet keys, or similar sensitive payment credentials.</p>

            <p className="mt-4 text-white font-semibold">4.7 Technical Information</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Operating system and device type</li>
              <li>Screen resolution, language settings, time zone</li>
              <li>Approximate geographic location based on IP</li>
              <li>Referral URLs, pages visited, browsing behavior</li>
              <li>Session duration, timestamps, error logs</li>
            </ul>

            <p className="mt-4 text-white font-semibold">4.8 Cookies and Similar Technologies</p>
            <p className="mt-2">We may use cookies, local storage, pixels, session identifiers, and similar technologies to improve Website functionality, maintain user sessions, remember preferences, enhance security, analyze Website performance, and provide a better user experience. Additional information is available in our Cookie Policy.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">5. HOW WE COLLECT INFORMATION</h2>
            <p>We collect personal information through various methods, including:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li><span className="text-white font-semibold">Directly from you</span> — when you create an account, place an order, contact customer support, update account information, submit forms, or communicate by email.</li>
              <li><span className="text-white font-semibold">Automatically</span> — certain information is automatically collected when you visit the Website using cookies, server logs, analytics tools, and security monitoring systems.</li>
              <li><span className="text-white font-semibold">From Service Providers</span> — we may receive information from payment processors, shipping providers, fraud prevention providers, and other third-party service providers where necessary to provide our services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold">6. LEGAL BASIS FOR PROCESSING</h2>
            <p>Where GDPR applies, we process personal information on one or more of the following legal bases:</p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li><span className="text-white font-semibold">Contract Performance</span> — processing necessary to fulfill orders, provide services, process payments, ship products, and provide customer support.</li>
              <li><span className="text-white font-semibold">Legal Obligations</span> — processing required to comply with tax, accounting, anti-fraud, regulatory, or other legal obligations.</li>
              <li><span className="text-white font-semibold">Legitimate Interests</span> — processing reasonably necessary for website security, fraud prevention, improving website performance, protecting our legal rights, customer support, and business administration.</li>
              <li><span className="text-white font-semibold">Consent</span> — where required by Applicable Law. You may withdraw consent at any time where processing is based solely upon consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold">7. HOW WE USE YOUR INFORMATION</h2>
            <p>We may use your information to:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Create user accounts and authenticate users</li>
              <li>Process orders, verify payments, and ship products</li>
              <li>Provide customer support</li>
              <li>Detect fraud and investigate suspicious activity</li>
              <li>Improve Website functionality and maintain Website security</li>
              <li>Comply with legal obligations and respond to legal requests</li>
              <li>Maintain internal business records and resolve disputes</li>
              <li>Enforce our Terms & Conditions</li>
            </ul>
            <p className="mt-4 text-white font-semibold">We do not sell your personal information.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">8. DISCLOSURE OF PERSONAL INFORMATION</h2>
            <p>We do not sell, rent, or trade your personal information to third parties for their own marketing purposes. Personal information may be disclosed only where reasonably necessary for the operation of our business, fulfillment of orders, compliance with legal obligations, or protection of our legitimate interests. Information may be shared only with categories of recipients described in this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">9. PAYMENT PROCESSORS</h2>
            <p>Payments made through our Website are processed by independent third-party payment providers. Depending on the payment method selected, we may share information reasonably necessary to complete payment processing. Payment providers may include, but are not limited to:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Stripe</li>
              <li>Banxa</li>
              <li>NowPayments</li>
              <li>Cash App</li>
              <li>Other payment providers made available through our checkout</li>
            </ul>
            <p className="mt-4">Each payment provider processes personal information in accordance with its own privacy policy and security practices. The Company generally does not receive or store complete payment card numbers, CVV/CVC security codes, or private cryptocurrency wallet credentials.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">10. SHIPPING & FULFILLMENT PARTNERS</h2>
            <p>To fulfill orders, we may share necessary information with third-party fulfillment partners and logistics providers. Information shared may include:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Recipient name</li>
              <li>Shipping address</li>
              <li>Telephone number</li>
              <li>Email address where required</li>
              <li>Order information and shipping preferences</li>
            </ul>
            <p className="mt-4">Information is shared only to the extent reasonably necessary to complete order fulfillment.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">11. WEBSITE SERVICE PROVIDERS</h2>
            <p>To operate and maintain the Website, we may use trusted third-party service providers for website hosting, cloud infrastructure, databases, source code management, security monitoring, analytics, and payment processing. Current providers may include:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Vercel</li>
              <li>Supabase</li>
              <li>GitHub</li>
            </ul>
            <p className="mt-4">The use of specific providers may change without prior notice.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">12. INTERNATIONAL DATA TRANSFERS</h2>
            <p>Because certain service providers, payment processors, logistics partners, cloud providers, and technical infrastructure may operate internationally, your personal information may be transferred to countries outside your country of residence. Where required by Applicable Law, appropriate safeguards shall be implemented, which may include contractual safeguards, technical security measures, organizational safeguards, and other legally recognized transfer mechanisms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">13. DATA RETENTION</h2>
            <p>Personal information shall be retained only for as long as reasonably necessary to fulfill orders, provide customer support, maintain user accounts, comply with legal obligations, resolve disputes, detect fraud, enforce agreements, and protect legitimate business interests. Different categories of information may be retained for different periods depending upon legal, contractual, operational, or regulatory requirements. When information is no longer required, it will be securely deleted, anonymized, or otherwise disposed of in accordance with applicable law.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">14. SECURITY</h2>
            <p>We implement reasonable administrative, organizational, physical, and technical safeguards designed to protect personal information. Security measures may include:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Encrypted communications (HTTPS)</li>
              <li>Restricted administrative access</li>
              <li>Authentication controls</li>
              <li>Secure infrastructure</li>
              <li>Monitoring systems and fraud detection</li>
              <li>Access logging and regular software updates</li>
            </ul>
            <p className="mt-4">Despite these measures, no method of electronic storage or Internet transmission can be guaranteed to be completely secure. Accordingly, the Company cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">15. YOUR PRIVACY RIGHTS</h2>
            <p>Depending upon your jurisdiction, including where the GDPR applies, you may have the right to:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Request access to your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of personal information</li>
              <li>Request restriction of processing</li>
              <li>Object to certain processing activities</li>
              <li>Request portability of your personal information</li>
              <li>Withdraw consent where processing is based solely upon consent</li>
              <li>Lodge a complaint with a competent supervisory authority</li>
            </ul>
            <p className="mt-4">The exercise of certain rights may be limited where permitted by Applicable Law.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">16. EXERCISING YOUR RIGHTS</h2>
            <p>Privacy requests may be submitted by contacting: SUPPORT@10BOTTLEVALUE.CO</p>
            <p className="mt-4">To protect your privacy and prevent unauthorized disclosure, we may request reasonable identity verification before responding to your request. Requests will be handled within the timeframes required by Applicable Law.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">17. COOKIES</h2>
            <p>The Website uses cookies and similar technologies to improve functionality, security, and user experience. Cookies may be used to:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Remember user preferences</li>
              <li>Maintain shopping cart functionality</li>
              <li>Keep users signed in</li>
              <li>Improve Website performance</li>
              <li>Detect fraudulent activity and improve security</li>
              <li>Analyze Website traffic</li>
            </ul>
            <p className="mt-4">Where required by law, users may manage cookie preferences through our cookie consent interface or browser settings. Disabling cookies may affect certain Website functionality.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">18. DO NOT TRACK</h2>
            <p>Some web browsers support "Do Not Track" ("DNT") signals. Because no uniform industry standard currently exists for DNT responses, the Website may not respond to such browser signals.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">19. AUTOMATED DECISION-MAKING</h2>
            <p>We may use automated systems to assist with fraud detection, payment verification, account security, and website protection. Such systems are intended solely to protect the Company, customers, payment providers, and Website infrastructure. No automated decision is intended to produce legal effects concerning you without appropriate human review where required by Applicable Law.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">20. ACCOUNT INFORMATION</h2>
            <p>Registered users may update account information, change saved shipping addresses, review order history, and manage account settings. Customers remain responsible for maintaining the confidentiality of their account credentials.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">21. CHILDREN'S PRIVACY</h2>
            <p>This Website is intended solely for individuals who are at least twenty-one (21) years of age. We do not knowingly collect personal information from individuals under the age of twenty-one (21). If we become aware that personal information has been collected from an individual who does not meet the minimum age requirement, we will take reasonable steps to delete such information as soon as reasonably practicable. Parents or legal guardians who believe that a minor has provided personal information may contact us using the information provided in this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">22. THIRD-PARTY WEBSITES</h2>
            <p>The Website may contain links to third-party websites, services, applications, or resources operated by independent organizations. This Privacy Policy applies solely to information collected by 10BottleValueCo SIA through this Website. We are not responsible for the privacy practices, security measures, content, policies, or services provided by third-party websites. Users are encouraged to review the privacy policies of any third-party websites they visit.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">23. BUSINESS TRANSFERS</h2>
            <p>In the event of a merger, acquisition, corporate restructuring, sale of assets, financing transaction, bankruptcy, liquidation, or other corporate reorganization, personal information may be transferred as part of the relevant business assets where permitted by Applicable Law. Any successor entity shall remain subject to obligations substantially consistent with this Privacy Policy unless otherwise permitted by law.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">24. LEGAL DISCLOSURES</h2>
            <p>The Company may disclose personal information where disclosure is reasonably necessary to comply with Applicable Law, court orders, lawful governmental requests, or law enforcement agencies, or to investigate suspected fraud or security incidents, protect the legal rights of the Company, customers, payment providers, and logistics partners, enforce our Terms & Conditions, or defend against legal claims. Such disclosures shall be limited to the extent reasonably necessary under the circumstances.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">25. DATA ACCURACY</h2>
            <p>Customers are responsible for ensuring that personal information submitted through the Website remains accurate, complete, and up to date. The Company shall not be responsible for losses arising from inaccurate or outdated information provided by customers. Customers may update account information through their user account or by contacting Customer Support.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">26. DATA MINIMIZATION</h2>
            <p>We strive to collect only the personal information reasonably necessary for the operation of our Website, fulfillment of orders, compliance with legal obligations, fraud prevention, customer support, and other legitimate business purposes described in this Privacy Policy. We do not intentionally collect unnecessary categories of personal information.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">27. PRIVACY BY DESIGN</h2>
            <p>Where reasonably practicable, the Company considers privacy and data protection principles during the design, implementation, maintenance, and improvement of Website features and internal business processes. Reasonable technical and organizational measures are implemented to reduce unnecessary processing of personal information.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">28. CHANGES TO THIS PRIVACY POLICY</h2>
            <p>The Company reserves the right to modify this Privacy Policy at any time. Updated versions become effective immediately upon publication on the Website unless otherwise required by Applicable Law. The latest revision date will always appear at the beginning of this Privacy Policy. Continued use of the Website following publication of an updated Privacy Policy constitutes acknowledgment of the revised version.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">29. CONTACT INFORMATION</h2>
            <p>If you have any questions regarding this Privacy Policy or wish to exercise your privacy rights, please contact:</p>
            <p className="mt-4">10BottleValueCo SIA<br />Registration No.: 40203750341<br />Registered Address: Avotu iela 8, Lielvārde, Ogres nov., LV-5071, Latvia<br />Email: SUPPORT@10BOTTLEVALUE.CO<br />Website: HTTPS://10BOTTLEVALUE.CO</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">30. GOVERNING LANGUAGE</h2>
            <p>This Privacy Policy has been prepared in the English language. Translations may be provided solely for convenience. In the event of any inconsistency, ambiguity, or conflict between any translated version and the English version, the English version shall prevail.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">31. SEVERABILITY</h2>
            <p>If any provision of this Privacy Policy is determined by a court or competent authority to be invalid, unlawful, or unenforceable, the remaining provisions shall remain in full force and effect. Any invalid provision shall be interpreted to the maximum extent permitted by Applicable Law while preserving its original intent.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold">32. ENTIRE PRIVACY POLICY</h2>
            <p>This Privacy Policy constitutes the complete privacy notice governing the collection, processing, storage, disclosure, and protection of personal information collected through the Website. This Privacy Policy should be read together with our:</p>
            <ul className="mt-4 list-disc pl-6 space-y-1">
              <li>Terms & Conditions</li>
              <li>Cookie Policy</li>
              <li>Shipping Policy</li>
              <li>Refund Policy</li>
            </ul>
            <p className="mt-4">And any additional legal notices published on the Website.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
