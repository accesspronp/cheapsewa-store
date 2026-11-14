CHEAPSEWA.STORE WEBSITE
========================

1. Extract this ZIP file.
2. Open index.html in a modern browser to preview.
3. Edit products and sample NPR prices in script.js.
4. Replace payment instructions in index.html / script.js with your verified merchant details and official QR codes.
5. Upload the folder to your hosting provider.

FEATURES
- Responsive storefront inspired by the supplied Subscriptions BD reference
- CheapSewa.Store logo and Nepal-focused copy
- Search, categories, product plan selector, cart and checkout UI
- Payment method choices: eSewa, Khalti, bank transfer and Fonepay
- WhatsApp order-message handoff to +977 9716537747
- FAQ, about, reviews, contact and mobile navigation

IMPORTANT LIMITATIONS
This is a front-end website template. It does not process or verify payments, provide live authentication, save orders to a database, or send uploaded screenshots automatically. The payment methods are selectable UI options only. Add your real merchant IDs, official QR images, backend order handling and payment gateway integration before accepting payments. Sample products and prices in script.js should be checked and updated by the store owner.


LATEST UPDATE (November 2026)
- Expanded desktop layout to a wider, full-view storefront inspired by the supplied SubscriptionsBD reference.
- Added a 3-slide hero banner using the supplied CheapSewa Nepal artwork and a new matching hero graphic.
- Added popular service icon badges (ChatGPT, Claude, Gemini, Adobe, Netflix, YouTube and Spotify) below the hero headline.
- Kept responsive mobile layout, product filtering, cart, plan selection, checkout UI and WhatsApp order handoff.
- Payment methods remain selectable front-end options; configure official merchant details/QR codes and a payment gateway before accepting live payments.


LATEST UPDATE - DEDICATED PRODUCT PAGES
- Main content width is now capped at approximately 1060px, matching the centered SubscriptionsBD reference layout rather than stretching too wide.
- Hero artwork uses a new high-quality Nepal-themed illustration with soft radial edge masking, gentle curves and fade blending.
- Hero slider keeps three promotional visuals and its controls.
- Each product card now opens its own dedicated product detail/buy page using product.html?id=PRODUCT_ID.
- Each product page shows the selected product, available durations and NPR prices, and a WhatsApp order handoff.
- Shared product catalogue is stored in products-data.js so the store and product pages use the same names and plan prices.
- Payment methods shown are eSewa, Khalti, Fonepay and bank transfer. Live gateway processing is not included.
\n\nHERO IMAGE UPDATE\n- Replaced the left-side homepage hero text with the supplied CheapSewa Nepal hero artwork.\n- The artwork's Shop Now button has a transparent, accessible clickable link overlay to the shop section, with a subtle pulse and hover animation.\n- The right-side promotional images remain in a medium-sized carousel with smooth horizontal transitions and automatic rotation every 4.8 seconds.\n- Carousel pauses on hover/focus and respects reduced-motion preferences.\n- Existing product pages, product data, cart and checkout files are retained.\n

HERO REDESIGN (NOV 2026)
- Removed the oversized left poster and the separate poster-image carousel.
- Rebuilt the homepage hero in a subscription-store style: headline and stats on the left, one cohesive animated promotional visual on the right.
- The right-side visual is native HTML/CSS with three rotating panels for digital categories, subscriptions and Nepal payment methods. It does not display the two supplied poster images.
- Added soft gradient/grid background, blurred glow shapes, rounded cards, floating labels and smooth horizontal slide transitions.
- Autoplay every 5.2 seconds, pause on hover/focus, manual arrows/dots, responsive mobile layout, and reduced-motion support.
- Product listings, individual product pages, cart and checkout code are retained.


PAYMENT UPDATE (NOV 2026)
- Added the supplied eSewa, Khalti and Fonepay logos, plus Bank Transfer as a payment choice.
- Added the supplied single shared QR image to the homepage checkout and every individual product page.
- Removed WhatsApp-based purchase/order handoff. WhatsApp remains only as an optional support contact.
- Customers can select a payment method, enter their details and download a local order-summary text file.
- A selected screenshot stays in the browser and is NOT uploaded or sent anywhere.
- Important: the supplied QR contains bank-account payment information. The site displays it as one shared QR, but whether a wallet app can scan/pay it depends on that app and QR network. The site does not claim every wallet supports it.
- This is still a static front-end website. It does not receive orders, upload payment proof, verify transactions, or activate subscriptions. A secure backend and the relevant merchant/payment-gateway integrations are required for live order processing.


MOBILE + PAYMENT FLOW REWORK (NOV 2026)
- Locked mobile layouts to the viewport width and added fixed bottom app navigation.
- Updated checkout into four steps: customer details, amount confirmation, payment method, then QR + transaction code + screenshot.
- Payment QR appears only after the customer accepts the displayed amount and selects a payment method.
- A 15-minute countdown begins when the QR screen opens; after expiry, the proof fields are disabled until a new payment method is selected.
- Applied the same staged flow to the dedicated product subscription pages.
- Homepage hero carousel auto-advances every 1.9 seconds.
- Added responsive spacing, transitions, and reduced-motion accessibility.
IMPORTANT: This remains a static front-end preview. The transaction code and screenshot are collected in the browser only; submission downloads a local summary. A secure backend/API is required to upload screenshots, receive orders, verify payments and activate subscriptions. Do not accept real payments until this is integrated and tested.


CHECKOUT POPUP + WHATSAPP REDIRECT UPDATE
- Product page: "Continue to amount" opens a checkout popup (summary + total, then eSewa / Khalti / Fonepay / Bank transfer).
- After choosing a method, the payment QR (assets/payment-qr.png) and 15-minute timer appear with the screenshot upload right below.
- "Verify payment" unlocks only after a screenshot is selected, then sends the customer straight to WhatsApp (+977 9716537747) with name, phone, product, plan, total and method pre-filled.
- Same simplified step 4 applied to the homepage cart checkout.
- Fixed: WhatsApp message previously showed literal "\n" text instead of line breaks.
- LIMITATION: WhatsApp links cannot attach images automatically. The customer attaches the screenshot in the chat. Automatic upload/verification needs a backend or WhatsApp Business API.
