# Addiction Clothing: Streetwear Store Website

The online store for **Addiction**, a streetwear brand selling graphic t-shirts, caps and jackets. Built with plain **HTML and CSS**, plus one small JavaScript file for the slider, menu and cart. No frameworks, no build step and no database: upload the files and the site works.

## Features

- **Home page:** full-width photo slider, shop-by-category cards, new arrivals, brand story, services strip and newsletter signup
- **Products page:** all products grouped by category, with filter buttons, live search, size selection (S, M, L, XL) and "Add to cart" / "Buy now"
- **Shopping cart:** slides in from the side on every page; change quantities, remove items, and see the free-delivery progress
- **Checkout:** customer details, delivery address and Cash on Delivery; the order is emailed to the store owner
- **About, Contact, Shipping & Returns and Privacy Policy pages**
- **Contact form:** messages are emailed to the store owner
- Works on phones, tablets and desktops

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `products.html` | Products |
| `about.html` | About Us |
| `contact.html` | Contact Us |
| `checkout.html` | Checkout |
| `shipping-returns.html` | Shipping & Returns |
| `privacy-policy.html` | Privacy Policy |
| `track-order.html` | Track Order (customers check their order status) |

## Order system

Orders are saved in a Google Sheet, and customers get emails for **order confirmation**, **shipped (with courier and tracking number)** and **delivered**. The code and the step-by-step setup guide are in the `google-apps-script/` folder (`Code.gs` and `SETUP.md`). Until it's connected, orders are emailed through FormSubmit, and customers get a confirmation email from there.

## Folder structure

```
├── index.html              Home page (opens first)
├── products.html
├── about.html
├── contact.html
├── checkout.html
├── shipping-returns.html
├── privacy-policy.html
├── css/
│   └── style.css           All colours, fonts and layout for every page
├── js/
│   └── script.js           Slider, mobile menu, cart, filters, form checks
└── images/
    ├── web/                Web-sized photos used by the site (fast loading)
    ├── logo/               Logo files (logo.png for the header, logo-white.png for the footer)
    ├── T_shirts/, Caps/, jackets/, sliders/   Original full-size photos (not used by the pages)
    └── favicon.svg         Browser tab icon
```

## How to view it on your computer

Double-click `index.html` to open it in your browser.

The cart works best when the site is online. When the files are opened straight from a folder, some browsers (like Firefox) keep a separate cart for each page.

## Common changes

| To change... | Edit this |
|---|---|
| Colours | The `:root` block at the top of `css/style.css` |
| A product's name, price, photo or description | Its `<article class="product-card">` block in `products.html` (and `index.html` for the 8 new arrivals) |
| Add a product | Copy a whole `<article class="product-card">` block and edit it |
| Slider pictures and text | The `HERO SLIDER` section in `index.html` |
| Free-delivery limit (Rs 5,000) and delivery fee (Rs 250) | `FREE_SHIPPING` and `DELIVERY_FEE` at the top of `js/script.js`, plus the text that mentions them in the HTML pages |
| Where orders and messages are emailed | The `action="https://formsubmit.co/..."` address in `checkout.html` and `contact.html` |
| Turn card payments back on | Remove `hidden` from the card option in `checkout.html` (connect a payment provider such as Stripe first) |

## Orders and messages (FormSubmit)

Checkout orders and contact messages are sent by email through [FormSubmit](https://formsubmit.co), a free service.

**After the site goes live:** send one test message from the Contact page. FormSubmit emails the store address an **"Activate Form"** link. Click it once, and from then on every order and message arrives by email. Card numbers are never collected or emailed.

## Before launch checklist

- [ ] Replace the sample contact details (`hello@addiction.store`, `+1 (555) 012-3456`, opening hours) in the footer of every page and on `contact.html`
- [ ] Confirm prices, delivery times, the delivery fee and the return policy
- [ ] Add real social media links (Instagram, Facebook and TikTok icons currently link to `#`)
- [ ] After going live: change `og:image` in each page's `<head>` to the full web address of the image
- [ ] Activate FormSubmit (see above)

## Hosting

The site is static (HTML, CSS and JS only), so it can be hosted for free on **Cloudflare Pages**, **Netlify** or **GitHub Pages**. No server setup is needed.

## Built with

- HTML5 and CSS3
- A little vanilla JavaScript (no libraries)
- Google Fonts: [Anton](https://fonts.google.com/specimen/Anton) and [DM Sans](https://fonts.google.com/specimen/DM+Sans)

© 2026 Addiction Clothing. All rights reserved.
