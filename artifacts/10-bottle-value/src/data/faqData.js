export function buildFaqs(tx) {
  return [
    {
      q: tx(
        "What will show on my card or PayPal statement?",
        "ЧТО БУДЕТ ОТОБРАЖАТЬСЯ В ВЫПИСКЕ ПО КАРТЕ ИЛИ PAYPAL?",
        "ЩО ВІДОБРАЖАТИМЕТЬСЯ У ВИПИСЦІ ПО КАРТІ АБО PAYPAL?",
        "WAS ERSCHEINT AUF MEINER KARTEN- ODER PAYPAL-ABRECHNUNG?",
        "¿QUÉ APARECERÁ EN MI ESTADO DE CUENTA DE TARJETA O PAYPAL?"
      ),
      id: "billing-descriptor",
      a: tx(
        "Charges from this website appear on your card or PayPal statement as \"10BottleValueCo\". This matches our business name so you can always recognize the charge and avoid unnecessary disputes.",
        "Списания с этого сайта отображаются в выписке по карте или PayPal как «10BottleValueCo». Это совпадает с названием нашей компании, чтобы вы всегда могли узнать платёж и избежать ненужных споров.",
        "Списання з цього сайту відображаються у виписці по карті або PayPal як «10BottleValueCo». Це збігається з назвою нашої компанії, щоб ви завжди могли впізнати платіж і уникнути зайвих суперечок.",
        "Belastungen von dieser Website erscheinen auf Ihrer Karten- oder PayPal-Abrechnung als „10BottleValueCo“. Dies entspricht unserem Firmennamen, damit Sie die Belastung stets erkennen und unnötige Reklamationen vermeiden können.",
        "Los cargos de este sitio web aparecen en su estado de cuenta de tarjeta o PayPal como «10BottleValueCo». Esto coincide con el nombre de nuestra empresa para que siempre pueda reconocer el cargo y evitar disputas innecesarias."
      ),
    },
    {
      q: tx(
        "Can I combine discounts or promo codes?",
        "МОЖНО ЛИ СОВМЕЩАТЬ СКИДКИ ИЛИ ПРОМОКОДЫ?",
        "ЧИ МОЖНА ПОЄДНУВАТИ ЗНИЖКИ АБО ПРОМОКОДИ?",
        undefined,
        "¿PUEDO COMBINAR DESCUENTOS O CÓDIGOS PROMOCIONALES?"
      ),
      id: "combine-discounts",
      a: tx(
        `No, discounts and promo codes cannot be combined.

If multiple discounts apply (such as order-based discounts or promo codes), only one can be used per order. We recommend using the highest available discount.`,
        `Нет, скидки и промокоды нельзя совмещать.

Если применяется несколько скидок (например, скидки по сумме заказа или промокоды), можно использовать только одну на заказ. Рекомендуем использовать самую большую доступную скидку.`,
        `Ні, знижки та промокоди не можна поєднувати.

Якщо застосовується кілька знижок (наприклад, знижки за сумою замовлення або промокоди), можна використати лише одну на замовлення. Рекомендуємо використовувати найбільшу доступну знижку.`,
        undefined,
        `No, los descuentos y los códigos promocionales no se pueden combinar.

Si se aplican varios descuentos, como descuentos por valor del pedido o códigos promocionales, solo se puede usar uno por pedido. Recomendamos usar el descuento más alto disponible.`
      ),
    },
    {
      q: tx(
        "Are you the cheapest?",
        "ВЫ САМЫЕ ДЕШЁВЫЕ?",
        "ВИ НАЙДЕШЕВШІ?",
        undefined,
        "¿SON LOS MÁS BARATOS?"
      ),
      id: "cheapest",
      a: tx(
        "Our 10-vial kit model is designed for cost-efficient research purchasing. By selling only in bundled kits, we reduce unnecessary packaging and single-vial handling costs while maintaining consistent quality standards.",
        "Наша модель наборов по 10 флаконов создана для экономически эффективных исследовательских закупок. Продавая только наборы, мы сокращаем лишнюю упаковку и расходы на обработку одиночных флаконов, сохраняя стабильные стандарты качества.",
        "Наша модель наборів по 10 флаконів створена для економічно ефективних дослідницьких закупівель. Продаючи лише набори, ми зменшуємо зайве пакування та витрати на обробку одиничних флаконів, зберігаючи стабільні стандарти якості.",
        undefined,
        "Nuestro modelo de kits de 10 viales está diseñado para compras de investigación eficientes en coste. Al vender únicamente kits agrupados, reducimos costes innecesarios de embalaje y manipulación de viales individuales, manteniendo estándares de calidad consistentes."
      ),
    },
    {
      q: tx(
        "Why only 10-vial kits?",
        "ПОЧЕМУ ТОЛЬКО НАБОРЫ ПО 10 ФЛАКОНОВ?",
        "ЧОМУ ЛИШЕ НАБОРИ ПО 10 ФЛАКОНІВ?",
        undefined,
        "¿POR QUÉ SOLO KITS DE 10 VIALES?"
      ),
      id: "ten-vial-kits",
      a: tx(
        "Single vials are the most expensive way to buy. Our 10-vial kit model lowers the cost per vial and keeps the process simple.",
        "Одиночные флаконы — самый дорогой способ покупки. Наша модель наборов по 10 флаконов снижает стоимость за флакон и сохраняет процесс простым.",
        "Одиничні флакони — найдорожчий спосіб покупки. Наша модель наборів по 10 флаконів знижує вартість за флакон і зберігає процес простим.",
        undefined,
        "Los viales individuales son la forma más cara de comprar. Nuestro modelo de kits de 10 viales reduce el coste por vial y mantiene el proceso simple."
      ),
    },
    {
      q: tx(
        "Do you ship worldwide?",
        "ВЫ ДОСТАВЛЯЕТЕ ПО ВСЕМУ МИРУ?",
        "ВИ ДОСТАВЛЯЄТЕ ПО ВСЬОМУ СВІТУ?",
        undefined,
        "¿REALIZAN ENVÍOS A TODO EL MUNDO?"
      ),
      id: "ship-worldwide",
      a: tx(
        "Yes. All orders are fulfilled by trusted international supply partners. Products are shipped directly from our partners to the customer. We periodically restock our US warehouse, making select items available for faster domestic shipping.",
        "Да. Все заказы выполняются проверенными международными партнёрами-поставщиками. Продукты отправляются напрямую от наших партнёров клиенту. Время от времени мы пополняем наш склад в США, что позволяет предлагать отдельные товары с более быстрой доставкой по стране.",
        "Так. Усі замовлення виконуються перевіреними міжнародними партнерами-постачальниками. Продукти відправляються напряму від наших партнерів клієнту. Час від часу ми поповнюємо наш склад у США, що дозволяє пропонувати окремі товари з швидшою доставкою по країні.",
        undefined,
        "Sí. Todos los pedidos son gestionados por socios internacionales de suministro de confianza. Los productos se envían directamente desde nuestros socios al cliente. Periódicamente reabastecemos nuestro almacén en EE. UU., lo que permite una entrega más rápida en algunos productos."
      ),
    },
    {
      q: tx(
        "How long does shipping take?",
        "СКОЛЬКО ЗАНИМАЕТ ДОСТАВКА?",
        "СКІЛЬКИ ТРИВАЄ ДОСТАВКА?",
        undefined,
        "¿CUÁNTO TARDA EL ENVÍO?"
      ),
      id: "shipping-time",
      a: tx(
        `Standard worldwide shipping takes approximately 8–12 business days. Express shipping takes approximately 5–7 business days (worldwide).

US Warehouse shipping (within the USA) takes approximately 2–5 business days.

Delivery times may vary depending on customs and local postal services.`,
        `Стандартная доставка по всему миру занимает примерно 8–12 рабочих дней. Экспресс-доставка занимает примерно 5–7 рабочих дней (по всему миру).

Доставка со склада в США (по территории США) занимает примерно 2–5 рабочих дней.

Сроки доставки могут отличаться в зависимости от таможни и местных почтовых служб.`,
        `Стандартна доставка по всьому світу займає приблизно 8–12 робочих днів. Експрес-доставка займає приблизно 5–7 робочих днів (по всьому світу).

Доставка зі складу в США (по території США) займає приблизно 2–5 робочих днів.

Терміни доставки можуть відрізнятися залежно від митниці та місцевих поштових служб.`,
        undefined,
        `El envío estándar a todo el mundo tarda aproximadamente 8–12 días hábiles. El envío exprés tarda aproximadamente 5–7 días hábiles (en todo el mundo).

El envío desde el almacén de EE. UU. (dentro de EE. UU.) tarda aproximadamente 2–5 días hábiles.

Los tiempos de entrega pueden variar según aduanas y los servicios postales locales.`
      ),
    },
    {
      q: tx(
        "Can I modify or cancel my order?",
        "МОЖНО ЛИ ИЗМЕНИТЬ ИЛИ ОТМЕНИТЬ ЗАКАЗ?",
        "ЧИ МОЖНА ЗМІНИТИ АБО СКАСУВАТИ ЗАМОВЛЕННЯ?",
        undefined,
        "¿PUEDO MODIFICAR O CANCELAR MI PEDIDO?"
      ),
      id: "modify-cancel-order",
      a: tx(
        "If your order has already been shipped, it can no longer be cancelled or returned.",
        "Если ваш заказ уже отправлен, отменить или вернуть его невозможно.",
        "Якщо ваше замовлення вже відправлено, скасувати або повернути його неможливо.",
        undefined,
        "Si tu pedido ya ha sido enviado, no es posible cancelarlo ni devolverlo."
      ),
    },
    {
      q: tx(
        "What if I entered the wrong shipping address?",
        "ЧТО ЕСЛИ Я УКАЗАЛ НЕПРАВИЛЬНЫЙ АДРЕС ДОСТАВКИ?",
        "ЩО ЯКЩО Я ВКАЗАВ НЕПРАВИЛЬНУ АДРЕСУ ДОСТАВКИ?",
        undefined,
        "¿QUÉ PASA SI INTRODUJE UNA DIRECCIÓN DE ENVÍO INCORRECTA?"
      ),
      id: "wrong-shipping-address",
      a: tx(
        `If you entered an incorrect shipping address, please contact support@10bottlevalue.co as soon as possible - ideally within 8 hours of placing your order.

We can update the address before the order is shipped. Once the order has been dispatched, changes are no longer possible, but we’ll assist you with tracking or redirecting the package if supported by the carrier.`,
        `Если вы указали неправильный адрес доставки, свяжитесь с support@10bottlevalue.co как можно скорее — желательно в течение 8 часов после оформления заказа.

Мы можем обновить адрес до отправки заказа. После отправки изменения больше невозможны, но мы поможем с отслеживанием или перенаправлением посылки, если это поддерживается перевозчиком.`,
        `Якщо ви вказали неправильну адресу доставки, звʼяжіться з support@10bottlevalue.co якнайшвидше — бажано протягом 8 годин після оформлення замовлення.

Ми можемо оновити адресу до відправлення замовлення. Після відправлення зміни більше неможливі, але ми допоможемо з відстеженням або перенаправленням посилки, якщо це підтримується перевізником.`,
        undefined,
        `Si introdujiste una dirección de envío incorrecta, contacta con support@10bottlevalue.co lo antes posible, idealmente dentro de las 8 horas posteriores a realizar tu pedido.

Podemos actualizar la dirección antes de que el pedido sea enviado. Una vez que el pedido ha sido despachado, ya no es posible realizar cambios, pero te ayudaremos con el seguimiento o la redirección del paquete si el transportista lo permite.`
      ),
    },
    {
      q: tx(
        "What payment methods do you accept?",
        "КАКИЕ СПОСОБЫ ОПЛАТЫ ВЫ ПРИНИМАЕТЕ?",
        "ЯКІ СПОСОБИ ОПЛАТИ ВИ ПРИЙМАЄТЕ?",
        undefined,
        "¿QUÉ MÉTODOS DE PAGO ACEPTAN?"
      ),
      id: "payment-methods",
      a: tx(
        "We currently accept cryptocurrency payments through secure checkout. Card payments are under review and will be available after approval.",
        "Сейчас мы принимаем криптовалютные платежи через безопасный checkout. Оплата картой находится на рассмотрении и будет доступна после одобрения.",
        "Зараз ми приймаємо криптовалютні платежі через безпечний checkout. Оплата карткою перебуває на розгляді та буде доступна після схвалення.",
        undefined,
        "Actualmente aceptamos pagos con criptomonedas mediante checkout seguro. Los pagos con tarjeta están en revisión y estarán disponibles después de la aprobación."
      ),
    },
    {
      q: tx(
        "Why is the price lower?",
        "ПОЧЕМУ ЦЕНА НИЖЕ?",
        "ЧОМУ ЦІНА НИЖЧА?",
        undefined,
        "¿POR QUÉ EL PRECIO ES MÁS BAJO?"
      ),
      id: "lower-price",
      a: tx(
        "The price is lower because of our bulk model. We do not sell single vials, which allows us to reduce cost without lowering quality.",
        "Цена ниже благодаря нашей bulk-модели. Мы не продаём одиночные флаконы, что позволяет снижать стоимость без снижения качества.",
        "Ціна нижча завдяки нашій bulk-моделі. Ми не продаємо одиничні флакони, що дозволяє знижувати вартість без зниження якості.",
        undefined,
        "El precio es más bajo gracias a nuestro modelo de volumen. No vendemos viales individuales, lo que nos permite reducir el coste sin reducir la calidad."
      ),
    },
    {
      q: tx(
        "How can I be sure the products are high quality?",
        "КАК УБЕДИТЬСЯ, ЧТО ПРОДУКТЫ ВЫСОКОГО КАЧЕСТВА?",
        "ЯК ПЕРЕКОНАТИСЯ, ЩО ПРОДУКТИ ВИСОКОЇ ЯКОСТІ?",
        undefined,
        "¿CÓMO PUEDO ASEGURARME DE QUE LOS PRODUCTOS SON DE ALTA CALIDAD?"
      ),
      id: "high-quality",
      a: tx(
        `We partner with vetted manufacturers and maintain strict quality control across all batches.

COA reports for our most popular peptides are available directly on the product pages. For other products, COAs are available upon request at support@10bottlevalue.co. Not every peptide undergoes third-party COA testing — this is what allows us to keep our prices so low.

We guarantee 97%+ purity. If an independent lab test shows otherwise, you get a full refund. Refunds are issued in cryptocurrency only.

Please note: when submitting vials for COA testing, a photo of our vials is required. Without it, we cannot confirm the vials were ours and will be unable to process a refund.

We will also request proof of payment to the lab — or proof of a free submission — to confirm that you were the one who sent the vials.`,
        `Мы работаем с проверенными производителями и поддерживаем строгий контроль качества по всем партиям.

COA-отчёты для самых популярных пептидов доступны прямо на страницах товаров. Для остальных продуктов COA можно запросить по email support@10bottlevalue.co. Не все пептиды проходят стороннее COA-тестирование — именно это позволяет нам держать такие низкие цены.

Мы гарантируем чистоту 97%+. Если это не подтвердится в независимой лаборатории — вернём деньги за заказ. Возврат средств осуществляется только в криптовалюте.

Обратите внимание: при отправке флаконов на COA-тестирование обязательно приложите фотографию наших флаконов. Без неё мы не сможем убедиться, что флаконы были именно нашими, и не сможем оформить возврат.

Также мы запросим у вас подтверждение оплаты в лабораторию — либо подтверждение бесплатной отправки — чтобы убедиться, что именно вы отослали эти флаконы.`,
        `Ми працюємо з перевіреними виробниками та підтримуємо суворий контроль якості по всіх партіях.

COA-звіти для найпопулярніших пептидів доступні безпосередньо на сторінках товарів. Для інших продуктів COA можна запросити на email support@10bottlevalue.co. Не всі пептиди проходять стороннє COA-тестування — саме це дозволяє нам тримати такі низькі ціни.

Ми гарантуємо чистоту 97%+. Якщо це не підтвердиться в незалежній лабораторії — повернемо кошти за замовлення. Повернення коштів здійснюється лише в криптовалюті.

Зверніть увагу: при відправці флаконів на COA-тестування обов'язково додайте фотографію наших флаконів. Без неї ми не зможемо підтвердити, що флакони були саме нашими, і не зможемо оформити повернення.

Також ми запросимо у вас підтвердження оплати в лабораторію — або підтвердження безкоштовної відправки — щоб переконатися, що саме ви відіслали ці флакони.`,
        undefined,
        `Trabajamos con fabricantes verificados y mantenemos un estricto control de calidad en todos los lotes.

Los informes COA de los péptidos más populares están disponibles directamente en las páginas de producto. Para otros productos, los COA están disponibles bajo solicitud en support@10bottlevalue.co. No todos los péptidos pasan por pruebas COA de terceros — esto es lo que nos permite mantener precios tan bajos.

Garantizamos una pureza del 97%+. Si esto no es confirmado por un laboratorio independiente, realizaremos el reembolso completo de su pedido. Los reembolsos se realizan únicamente en criptomoneda.

Tenga en cuenta: al enviar los viales para pruebas COA, se requiere una fotografía de nuestros viales. Sin ella, no podremos confirmar que los viales eran nuestros y no podremos procesar el reembolso.

También le solicitaremos un comprobante de pago al laboratorio — o confirmación de envío gratuito — para verificar que usted fue quien envió los viales.`
      ),
    },
    {
      q: tx(
        "Is this legit?",
        "ЭТО ЛЕГИТИМНО?",
        "ЦЕ ЛЕГІТИМНО?",
        undefined,
        "¿ESTO ES LEGÍTIMO?"
      ),
      id: "legit",
      a: tx(
        "Yes. The brand is built around long-term trust, consistent quality controls, transparent policies, and a straightforward research purchasing experience.",
        "Да. Бренд построен вокруг долгосрочного доверия, стабильного контроля качества, прозрачных политик и понятного опыта исследовательской покупки.",
        "Так. Бренд побудований навколо довгострокової довіри, стабільного контролю якості, прозорих політик і зрозумілого досвіду дослідницької покупки.",
        undefined,
        "Sí. La marca está construida sobre confianza a largo plazo, controles de calidad consistentes, políticas transparentes y una experiencia de compra para investigación clara y directa."
      ),
    },
    {
      q: tx(
        "What if there is an issue with my order?",
        "ЧТО ЕСЛИ С МОИМ ЗАКАЗОМ ЕСТЬ ПРОБЛЕМА?",
        "ЩО ЯКЩО З МОЇМ ЗАМОВЛЕННЯМ Є ПРОБЛЕМА?",
        undefined,
        "¿QUÉ PASA SI HAY UN PROBLEMA CON MI PEDIDO?"
      ),
      id: "order-issue",
      a: tx(
        "Due to the nature of our products, all sales are final and items cannot be returned once shipped. However, if you receive a damaged, defective, or incorrect item, please contact our support team within 7 days of delivery. We will review your case and arrange a replacement where appropriate.",
        "Из-за характера наших продуктов все продажи являются окончательными, и товары нельзя вернуть после отправки. Однако если вы получили повреждённый, дефектный или неправильный товар, свяжитесь с нашей поддержкой в течение 7 дней после доставки. Мы рассмотрим ваш случай и при необходимости организуем замену.",
        "Через характер наших продуктів усі продажі є остаточними, і товари не можна повернути після відправлення. Однак якщо ви отримали пошкоджений, дефектний або неправильний товар, звʼяжіться з нашою підтримкою протягом 7 днів після доставки. Ми розглянемо ваш випадок і за потреби організуємо заміну.",
        undefined,
        "Debido a la naturaleza de nuestros productos, todas las ventas son finales y los artículos no pueden devolverse una vez enviados. Sin embargo, si recibes un artículo dañado, defectuoso o incorrecto, contacta con nuestro equipo de soporte dentro de los 7 días posteriores a la entrega. Revisaremos tu caso y organizaremos un reemplazo cuando corresponda."
      ),
    },
    {
      q: tx(
        "Are these products for human use?",
        "ЭТИ ПРОДУКТЫ ДЛЯ ИСПОЛЬЗОВАНИЯ ЧЕЛОВЕКОМ?",
        "ЦІ ПРОДУКТИ ДЛЯ ВИКОРИСТАННЯ ЛЮДИНОЮ?",
        undefined,
        "¿ESTOS PRODUCTOS SON PARA USO HUMANO?"
      ),
      id: "human-use",
      a: tx(
        "No. All products are sold strictly for laboratory research purposes only and are not intended for human or animal use.",
        "Нет. Все продукты продаются строго только для лабораторных исследовательских целей и не предназначены для использования людьми или животными.",
        "Ні. Усі продукти продаються суворо лише для лабораторних дослідницьких цілей і не призначені для використання людьми або тваринами.",
        undefined,
        "No. Todos los productos se venden estrictamente solo para fines de investigación de laboratorio y no están destinados para uso humano o animal."
      ),
    },
    {
      q: tx(
        "How can I track my order?",
        "КАК Я МОГУ ОТСЛЕДИТЬ ЗАКАЗ?",
        "ЯК Я МОЖУ ВІДСТЕЖИТИ ЗАМОВЛЕННЯ?",
        undefined,
        "¿CÓMO PUEDO RASTREAR MI PEDIDO?"
      ),
      id: "track-order",
      a: tx(
        "Within 2 business days after payment, your tracking number will appear in your account in the 'Orders' section. You can use it to track your shipment directly.",
        "В течение 2 рабочих дней после оплаты в вашем личном кабинете в разделе «Orders» появится трекинг-номер. С его помощью вы сможете отслеживать посылку.",
        "Протягом 2 робочих днів після оплати у вашому особистому кабінеті в розділі «Orders» з'явиться трекінг-номер. За ним ви зможете відстежувати відправлення.",
        undefined,
        "Dentro de los 2 días hábiles posteriores al pago, tu número de seguimiento aparecerá en tu cuenta en el apartado 'Orders'. Con él podrás rastrear tu envío directamente."
      ),
    },
    {
      q: tx(
        "What if my package tracking stops updating?",
        "ЧТО ЕСЛИ ТРЕКИНГ ПОСЫЛКИ ПЕРЕСТАЛ ОБНОВЛЯТЬСЯ?",
        "ЩО ЯКЩО ТРЕКІНГ ПОСИЛКИ ПЕРЕСТАВ ОНОВЛЮВАТИСЯ?",
        undefined,
        "¿QUÉ PASA SI EL SEGUIMIENTO DE MI PAQUETE DEJA DE ACTUALIZARSE?"
      ),
      id: "tracking-stops",
      a: tx(
        "If your package tracking hasn’t updated for an extended period, please contact our support team. You are welcome to reach out at any time to inquire about the status and progress of your shipment — we are always happy to help and will provide an update as quickly as possible. Each case is reviewed individually to ensure a fast resolution.",
        "Если трекинг посылки долго не обновляется, свяжитесь с нашей поддержкой. Вы можете обратиться к нам в любое время, чтобы узнать о статусе и прогрессе вашей посылки — мы всегда рады помочь и предоставим информацию как можно скорее. Каждый случай рассматривается индивидуально для быстрого решения.",
        "Якщо трекінг посилки довго не оновлюється, зверніться до нашої підтримки. Ви можете звернутись до нас у будь-який час, щоб дізнатися про статус і прогрес вашої посилки — ми завжди раді допомогти та надамо інформацію якнайшвидше. Кожен випадок розглядається індивідуально для швидкого вирішення.",
        undefined,
        "Si el seguimiento de tu paquete no se ha actualizado durante un período prolongado, contacta con nuestro equipo de soporte. Puedes escribirnos en cualquier momento para consultar el estado y el progreso de tu envío — siempre estamos encantados de ayudar y te daremos una actualización lo antes posible. Cada caso se revisa individualmente para garantizar una resolución rápida."
      ),
    },
    {
      q: tx(
        "I didn’t receive an order confirmation email. What should I do?",
        "Я НЕ ПОЛУЧИЛ ПИСЬМО ПОДТВЕРЖДЕНИЯ ЗАКАЗА. ЧТО ДЕЛАТЬ?",
        "Я НЕ ОТРИМАВ ЛИСТ ПІДТВЕРДЖЕННЯ ЗАМОВЛЕННЯ. ЩО РОБИТИ?",
        undefined,
        "NO RECIBÍ EL EMAIL DE CONFIRMACIÓN DEL PEDIDO. ¿QUÉ DEBO HACER?"
      ),
      id: "confirmation-email",
      a: tx(
        `If you don’t see a confirmation email within a few minutes, please check your spam or junk folder first.

If it’s not there, the email address may have been entered incorrectly. Contact our support team at support@10bottlevalue.co and we’ll resend your confirmation and verify your order details.`,
        `Если вы не видите письмо подтверждения в течение нескольких минут, сначала проверьте папку спам или junk.

Если его там нет, email мог быть введён неправильно. Свяжитесь с нашей поддержкой по адресу support@10bottlevalue.co, и мы повторно отправим подтверждение и проверим детали заказа.`,
        `Якщо ви не бачите лист підтвердження протягом кількох хвилин, спочатку перевірте папку спам або junk.

Якщо його там немає, email міг бути введений неправильно. Звʼяжіться з нашою підтримкою за адресою support@10bottlevalue.co, і ми повторно надішлемо підтвердження та перевіримо деталі замовлення.`,
        undefined,
        `Si no ves un email de confirmación en unos minutos, revisa primero tu carpeta de spam o correo no deseado.

Si no está allí, es posible que la dirección de email se haya introducido incorrectamente. Contacta con nuestro equipo de soporte en support@10bottlevalue.co y volveremos a enviar tu confirmación y verificar los detalles de tu pedido.`
      ),
    },
    {
      q: tx(
        "Are all your peptides lyophilized?",
        "ВСЕ ВАШИ ПЕПТИДЫ ЛИОФИЛИЗИРОВАНЫ?",
        "УСІ ВАШІ ПЕПТИДИ ЛІОФІЛІЗОВАНІ?",
        undefined,
        "¿TODOS SUS PÉPTIDOS ESTÁN LIOFILIZADOS?"
      ),
      id: "lyophilized",
      a: tx(
        "Yes — peptide materials are supplied in lyophilized (freeze-dried) form unless otherwise stated. Reconstitution Solution is provided as a liquid and is not lyophilized. Product format details are listed for identification and research documentation purposes only.",
        "Да — пептидные материалы поставляются в лиофилизированной (freeze-dried) форме, если не указано иное. Reconstitution Solution поставляется как жидкость и не является лиофилизированным. Детали формата продукта указаны только для идентификации и исследовательской документации.",
        "Так — пептидні матеріали постачаються у ліофілізованій (freeze-dried) формі, якщо не зазначено інше. Reconstitution Solution постачається як рідина і не є ліофілізованим. Деталі формату продукту вказані лише для ідентифікації та дослідницької документації.",
        undefined,
        "Sí — los materiales peptídicos se suministran en forma liofilizada (freeze-dried), salvo que se indique lo contrario. Reconstitution Solution se proporciona como líquido y no está liofilizada. Los detalles del formato del producto se indican únicamente para identificación y documentación de investigación."
      ),
    },
    {
      q: tx(
        "Do you provide COA reports?",
        "ВЫ ПРЕДОСТАВЛЯЕТЕ COA-ОТЧЁТЫ?",
        "ВИ НАДАЄТЕ COA-ЗВІТИ?",
        undefined,
        "¿PROPORCIONAN INFORMES COA?"
      ),
      id: "coa-reports",
      a: tx(
        "Yes — COAs are available upon request. We don’t publish full reports publicly as they may contain supplier-sensitive information. However, all reports include purity and content verification.",
        "Да — COA доступны по запросу. Мы не публикуем полные отчёты публично, так как они могут содержать конфиденциальную информацию поставщика. Однако все отчёты включают проверку чистоты и содержания.",
        "Так — COA доступні за запитом. Ми не публікуємо повні звіти публічно, оскільки вони можуть містити конфіденційну інформацію постачальника. Однак усі звіти включають перевірку чистоти та вмісту.",
        undefined,
        "Sí — los COA están disponibles bajo solicitud. No publicamos informes completos públicamente, ya que pueden contener información sensible del proveedor. Sin embargo, todos los informes incluyen verificación de pureza y contenido."
      ),
    },
    {
      q: tx(
        "Do you provide usage instructions for products?",
        "ВЫ ПРЕДОСТАВЛЯЕТЕ ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ ПРОДУКТОВ?",
        "ВИ НАДАЄТЕ ІНСТРУКЦІЇ З ВИКОРИСТАННЯ ПРОДУКТІВ?",
        undefined,
        "¿PROPORCIONAN INSTRUCCIONES DE USO PARA LOS PRODUCTOS?"
      ),
      id: "usage-instructions",
      a: tx(
        "No. All products are sold strictly for research purposes only. We do not provide any guidance or instructions for human or animal use.",
        "Нет. Все продукты продаются строго только для исследовательских целей. Мы не предоставляем никаких рекомендаций или инструкций для использования людьми или животными.",
        "Ні. Усі продукти продаються суворо лише для дослідницьких цілей. Ми не надаємо жодних рекомендацій або інструкцій для використання людьми чи тваринами.",
        undefined,
        "No. Todos los productos se venden estrictamente solo para fines de investigación. No proporcionamos ninguna orientación ni instrucciones para uso humano o animal."
      ),
    },
    {
      q: tx(
        "Do all products have a Certificate of Analysis (COA)?",
        "НА ВСЕ ПОЗИЦИИ ЕСТЬ СОА?",
        "НА ВСІ ПОЗИЦІЇ Є СОА?",
        undefined,
        "¿TODOS LOS PRODUCTOS TIENEN CERTIFICADO DE ANÁLISIS (COA)?"
      ),
      id: "coa",
      a: tx(
        `No. We currently carry 117 peptide positions, and obtaining a Certificate of Analysis for each one is extremely costly. However, rest assured — our peptide manufacturing facility guarantees quality and high purity for every product.`,
        `Нет. На данный момент у нас 117 позиций пептидов, и сделать СОА на каждый из них стоит больших денег. Но не сомневайтесь — наша фабрика по производству пептидов гарантирует вам качество и высокую чистоту (purity) каждого продукта.`,
        `Ні. На даний момент у нас 117 позицій пептидів, і зробити СОА на кожну з них коштує великих грошей. Але не сумнівайтесь — наша фабрика з виробництва пептидів гарантує вам якість і високу чистоту (purity) кожного продукту.`,
        undefined,
        `No. Actualmente contamos con 117 posiciones de péptidos y obtener un Certificado de Análisis para cada uno resulta muy costoso. Sin embargo, tenga la seguridad de que nuestra fábrica de fabricación de péptidos garantiza la calidad y la alta pureza de cada producto.`
      ),
    },
    {
      q: tx(
        "Are all the products you sell listed in the catalog?",
        "В КАТАЛОГЕ ВСЕ ПРОДУКТЫ, ЧТО ВЫ ПРОДАЁТЕ?",
        "У КАТАЛОЗІ ВСІ ПРОДУКТИ, ЩО ВИ ПРОДАЄТЕ?",
        undefined,
        "¿ESTÁN TODOS LOS PRODUCTOS QUE VENDEN EN EL CATÁLOGO?"
      ),
      id: "not-all-products-in-catalog",
      a: tx(
        "No, not all the products we sell are listed in the catalog. If you have a specific product in mind that you don't see, reach out to us — we may be able to find a solution for you.",
        "Нет, в каталоге не все продукты, которые мы продаём. Если у вас есть желание по конкретному продукту, которого вы не видите в каталоге, напишите нам — возможно, мы найдём решение.",
        "Ні, у каталозі не всі продукти, які ми продаємо. Якщо у вас є бажання щодо конкретного продукту, якого ви не бачите в каталозі, напишіть нам — можливо, ми знайдемо рішення.",
        undefined,
        "No, no todos los productos que vendemos están listados en el catálogo. Si tiene en mente un producto específico que no ve, contáctenos — es posible que encontremos una solución para usted."
      ),
    },
  ];
}
