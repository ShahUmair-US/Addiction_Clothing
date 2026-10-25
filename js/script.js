// Small script shared by every page: mobile menu, search bar, slider, cart, filters, messages.
// The page content itself is all in the HTML files.

const FREE_SHIPPING = 5000;   // free delivery on orders of Rs 5,000 or more
const DELIVERY_FEE = 250;     // delivery fee for smaller orders
const formatPrice = (n) => "Rs " + Math.round(n).toLocaleString("en-US");

/* ---------- Cart storage (remembered in the browser across pages) ----------
   The cart is saved in two places:
   1. localStorage: keeps the cart after the browser is closed (works on the live website).
   2. window.name: carries the cart from page to page in the same tab. Some browsers
      (like Firefox) keep a separate localStorage for every file when the site is opened
      straight from a folder, so without this the checkout page would see an empty cart. */
const CART_TAG = "addiction-cart:";

function parseCart(text) {
  try {
    const cart = JSON.parse(text);
    return Array.isArray(cart) ? cart : null;
  } catch {
    return null;
  }
}

function getCart() {
  if (window.name.startsWith(CART_TAG)) {
    const fromTab = parseCart(window.name.slice(CART_TAG.length));
    if (fromTab) return fromTab;
  }
  let saved = null;
  try {
    saved = parseCart(localStorage.getItem("addiction-cart"));
  } catch {}
  return saved || [];
}

function saveCart(cart) {
  const text = JSON.stringify(cart);
  window.name = CART_TAG + text;
  try {
    localStorage.setItem("addiction-cart", text);
  } catch {}
  renderCart();
  if (onCartChange) onCartChange();
}

// Pages that show the cart contents (like checkout) set this to refresh themselves
let onCartChange = null;

// Each cart line is one product in one size, e.g. "Dragon Print Oversized Tee" in "L"
const itemKey = (i) => i.name + "|" + (i.size || "One size");

// Reads the name, price, picture and chosen size straight from the product card in the HTML.
// Returns the product name, or null if a size still needs to be chosen.
function addToCart(card) {
  let size = "One size";
  const picker = card.querySelector(".size-picker");
  if (picker) {
    const chosen = picker.querySelector(".size-btn.selected");
    if (!chosen) {
      picker.classList.add("needs-size");
      picker.querySelector(".size-error").textContent = "Please choose a size first.";
      return null;
    }
    size = chosen.textContent.trim();
  }

  const name = card.querySelector(".product-name").textContent.trim();
  const price = Number(card.querySelector(".product-price").textContent.match(/[\d,]+/)[0].replace(/,/g, ""));
  const image = card.querySelector(".product-image img").getAttribute("src");

  const cart = getCart();
  const item = cart.find((i) => itemKey(i) === name + "|" + size);
  if (item) item.qty += 1;
  else cart.push({ name, size, price, image, qty: 1 });
  saveCart(cart);
  return size === "One size" ? name : name + " (size " + size + ")";
}

function changeQty(key, change) {
  const cart = getCart();
  const item = cart.find((i) => itemKey(i) === key);
  if (!item) return;
  item.qty += change;
  saveCart(item.qty > 0 ? cart : cart.filter((i) => itemKey(i) !== key));
}

/* ---------- Cart panel ---------- */
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");

function openCart() {
  if (!cartPanel) return;
  renderCart();
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  cartOverlay.hidden = false;
  document.body.classList.add("cart-open");
}

function closeCart() {
  if (!cartPanel) return;
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  cartOverlay.hidden = true;
  document.body.classList.remove("cart-open");
}

function renderCart() {
  const cart = getCart();
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = count));

  const list = document.getElementById("cartItems");
  if (!list) return;
  const foot = document.getElementById("cartFoot");

  if (!cart.length) {
    list.innerHTML = `
      <div class="cart-empty">
        <h3>Your cart is empty</h3>
        <p>Add some t-shirts, caps or jackets to get started.</p>
        <a href="products.html" class="btn">Shop Products</a>
      </div>`;
    foot.hidden = true;
    return;
  }

  foot.hidden = false;
  list.innerHTML = cart.map((i) => `
    <div class="cart-item">
      <img src="${i.image}" alt="${i.name}">
      <div>
        <h3>${i.name}</h3>
        <div class="item-price">Size: ${i.size || "One size"} · ${formatPrice(i.price)} each</div>
        <div class="qty">
          <button data-qty="-1" data-key="${itemKey(i)}" aria-label="Decrease quantity">−</button>
          <span>${i.qty}</span>
          <button data-qty="1" data-key="${itemKey(i)}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="item-side">
        <span class="item-total">${formatPrice(i.price * i.qty)}</span>
        <button class="remove-btn" data-remove="${itemKey(i)}">Remove</button>
      </div>
    </div>`).join("");

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById("cartSubtotal").textContent = formatPrice(subtotal);
  document.getElementById("cartShipping").textContent = subtotal >= FREE_SHIPPING
    ? "You get free delivery on this order."
    : "Add " + formatPrice(FREE_SHIPPING - subtotal) + " more for free delivery.";
}

/* ---------- Pop-up message at the bottom of the screen ---------- */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------- All button clicks ---------- */
document.addEventListener("click", (e) => {
  const t = e.target;

  // Size buttons: pick one size per product
  const sizeBtn = t.closest(".size-btn");
  if (sizeBtn) {
    const picker = sizeBtn.closest(".size-picker");
    picker.querySelectorAll(".size-btn").forEach((b) => b.classList.toggle("selected", b === sizeBtn));
    picker.classList.remove("needs-size");
    picker.querySelector(".size-error").textContent = "";
  }

  // "Add to cart" (home page hover button and products page button)
  const add = t.closest(".quick-add:not(.choose-size), .add-to-cart");
  if (add) {
    const added = addToCart(add.closest(".product-card"));
    if (added) showToast(added + " added to your cart");
  }

  // "Buy now": add the product and open the cart straight away
  const buy = t.closest(".buy-now");
  if (buy && addToCart(buy.closest(".product-card"))) openCart();

  const wish = t.closest(".wish-btn");
  if (wish) {
    wish.classList.toggle("active");
    showToast(wish.classList.contains("active") ? "Saved to your wishlist" : "Removed from your wishlist");
  }

  if (t.closest("#cartToggle")) openCart();
  if (t.closest("#cartClose") || t.closest("#continueShopping") || t === cartOverlay) closeCart();

  const qty = t.closest("[data-qty]");
  if (qty) changeQty(qty.dataset.key, Number(qty.dataset.qty));

  const remove = t.closest("[data-remove]");
  if (remove) changeQty(remove.dataset.remove, -Infinity);

  if (t.closest("#checkoutBtn")) location.href = "checkout.html";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCart();
});

/* ---------- Mobile menu ---------- */
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", open);
  });
}

/* ---------- Search bar in the header ---------- */
const searchToggle = document.getElementById("searchToggle");
const searchBar = document.getElementById("searchBar");
if (searchToggle && searchBar) {
  searchToggle.addEventListener("click", () => {
    searchBar.classList.toggle("open");
    if (searchBar.classList.contains("open")) searchBar.querySelector("input").focus();
  });
}

/* ---------- Home page slider (changes every 5 seconds) ---------- */
const slider = document.getElementById("heroSlider");
if (slider) {
  const slides = slider.querySelectorAll(".slide");
  const dotsBox = slider.querySelector(".slider-dots");
  let current = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", "Go to slide " + (i + 1));
    dot.addEventListener("click", () => { goTo(i); restart(); });
    dotsBox.appendChild(dot);
  });
  const dots = dotsBox.querySelectorAll("button");

  function goTo(i) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (i + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
  }
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  slider.querySelector(".prev").addEventListener("click", () => { goTo(current - 1); restart(); });
  slider.querySelector(".next").addEventListener("click", () => { goTo(current + 1); restart(); });
  goTo(0);
  restart();
}

/* ---------- Page banners with fading background pictures ---------- */
document.querySelectorAll(".banner-slider").forEach((banner) => {
  const pics = banner.querySelectorAll(".banner-slide");
  if (!pics.length) return;
  let current = 0;
  pics[0].classList.add("active");
  if (pics.length > 1) {
    setInterval(() => {
      pics[current].classList.remove("active");
      current = (current + 1) % pics.length;
      pics[current].classList.add("active");
    }, 4500);
  }
});

/* ---------- About page: product slider in the picture frame ---------- */
document.querySelectorAll(".frame-slider").forEach((frame) => {
  const slides = frame.querySelectorAll(".frame-slide");
  const dotsBox = frame.querySelector(".frame-dots");
  let current = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", "Show picture " + (i + 1));
    dot.addEventListener("click", () => { show(i); restart(); });
    dotsBox.appendChild(dot);
  });
  const dots = dotsBox.querySelectorAll("button");

  function show(i) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = i % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
  }
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), 3500);
  }

  show(0);
  restart();
});

/* ---------- Products page: category filter + search ---------- */
const productSearch = document.getElementById("productSearch");
if (productSearch) {
  const params = new URLSearchParams(location.search);
  let activeFilter = params.get("category") || "all";
  productSearch.value = params.get("q") || "";

  function applyFilters() {
    const words = productSearch.value.trim().toLowerCase();
    let shown = 0;

    document.querySelectorAll(".category-section").forEach((section) => {
      const inCategory = activeFilter === "all" || section.dataset.category === activeFilter;
      let visibleInSection = 0;
      section.querySelectorAll(".product-card").forEach((card) => {
        const match = inCategory && card.textContent.toLowerCase().includes(words);
        card.hidden = !match;
        if (match) visibleInSection++;
      });
      section.hidden = visibleInSection === 0;
      shown += visibleInSection;
    });

    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b.dataset.filter === activeFilter));
    document.getElementById("resultCount").textContent = words
      ? `${shown} result${shown === 1 ? "" : "s"} for "${productSearch.value.trim()}"`
      : `Showing ${shown} product${shown === 1 ? "" : "s"}`;
    document.getElementById("noResults").hidden = shown > 0;
  }

  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => { activeFilter = btn.dataset.filter; applyFilters(); })
  );
  productSearch.addEventListener("input", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", () => {
    activeFilter = "all";
    productSearch.value = "";
    applyFilters();
  });
  applyFilters();
}

/* ---------- Contact page: check the form and show a thank-you message ---------- */
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  const checks = {
    cName: (v) => v.trim().length >= 2 || "Please enter your name.",
    cEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email, like name@example.com.",
    cMessage: (v) => v.trim().length >= 10 || "Please write a message of at least 10 characters."
  };

  const formStatus = document.getElementById("formStatus");
  const sendBtn = document.getElementById("sendBtn");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formStatus.textContent = "";
    let firstError = null;
    for (const id in checks) {
      const input = document.getElementById(id);
      const result = checks[id](input.value);
      const field = input.closest(".field");
      field.classList.toggle("invalid", result !== true);
      field.querySelector(".field-error").textContent = result === true ? "" : result;
      if (result !== true && !firstError) firstError = input;
    }
    if (firstError) {
      firstError.focus();
      return;
    }
    // Stop if the email address in contact.html hasn't been set yet
    if (contactForm.action.includes("YOUR-EMAIL")) {
      formStatus.textContent = "This form isn't connected yet. Add your email address in contact.html (see the note above the form).";
      return;
    }

    // Send the message to FormSubmit.co, which forwards it to your email
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";
    try {
      const response = await fetch(contactForm.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(contactForm)
      });
      if (!response.ok) throw new Error("Send failed");
      contactForm.reset();
      contactForm.hidden = true;
      document.getElementById("formSuccess").hidden = false;
    } catch {
      formStatus.textContent = "Sorry, your message couldn't be sent. Please check your internet connection and try again, or email us directly.";
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Message";
    }
  });

  contactForm.addEventListener("input", (e) => {
    const field = e.target.closest(".field.invalid");
    if (field) {
      field.classList.remove("invalid");
      field.querySelector(".field-error").textContent = "";
    }
  });

  document.getElementById("sendAnother").addEventListener("click", () => {
    document.getElementById("formSuccess").hidden = true;
    contactForm.hidden = false;
  });
}

/* ---------- Checkout page ---------- */
const checkoutForm = document.getElementById("checkoutForm");
if (checkoutForm) {
  const cardFields = document.getElementById("cardFields");
  const status = document.getElementById("checkoutStatus");
  const placeBtn = document.getElementById("placeOrderBtn");
  const isCard = () => checkoutForm.querySelector('input[name="payMethod"]:checked').value === "Card";

  function orderTotals() {
    const cart = getCart();
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const delivery = subtotal >= FREE_SHIPPING ? 0 : DELIVERY_FEE;
    return { cart, subtotal, delivery, total: subtotal + delivery };
  }

  function renderSummary() {
    const { cart, subtotal, delivery, total } = orderTotals();
    const empty = cart.length === 0;
    checkoutForm.hidden = empty;
    document.getElementById("checkoutEmpty").hidden = !empty;
    if (empty) return;

    document.getElementById("summaryItems").innerHTML = cart.map((i) => `
      <div class="summary-item">
        <div class="summary-thumb"><img src="${i.image}" alt="${i.name}"><span>${i.qty}</span></div>
        <div><strong>${i.name}</strong><small class="summary-size">Size: ${i.size || "One size"}</small></div>
        <span>${formatPrice(i.price * i.qty)}</span>
      </div>`).join("");
    document.getElementById("sumSubtotal").textContent = formatPrice(subtotal);
    document.getElementById("sumDelivery").textContent = delivery === 0 ? "Free" : formatPrice(delivery);
    document.getElementById("sumTotal").textContent = formatPrice(total);
    placeBtn.textContent = "Place Order · " + formatPrice(total);
  }

  // Show card fields only when "Card" is chosen
  checkoutForm.querySelectorAll('input[name="payMethod"]').forEach((r) =>
    r.addEventListener("change", () => { cardFields.hidden = !isCard(); })
  );

  // Format card number as 1234 5678 9012 3456 and expiry as MM/YY while typing
  document.getElementById("ccNumber").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  });
  document.getElementById("ccExpiry").addEventListener("input", (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  });
  document.getElementById("ccCvc").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
  });

  const checks = {
    coName: (v) => v.trim().length >= 3 || "Please enter your full name.",
    coPhone: (v) => v.replace(/\D/g, "").length >= 7 || "Please enter a valid contact number.",
    coEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email, like name@example.com.",
    coAddress: (v) => v.trim().length >= 5 || "Please enter your street address.",
    coCity: (v) => v.trim().length >= 2 || "Please enter your city.",
    coPostal: (v) => v.trim().length >= 3 || "Please enter your postal code.",
    ccName: (v) => v.trim().length >= 3 || "Please enter the name on your card.",
    ccNumber: (v) => v.replace(/\D/g, "").length === 16 || "Card number must be 16 digits.",
    ccExpiry: (v) => {
      const m = /^(\d{2})\/(\d{2})$/.exec(v);
      if (!m) return "Please use the format MM/YY.";
      const month = Number(m[1]), year = 2000 + Number(m[2]), now = new Date();
      if (month < 1 || month > 12) return "Month must be between 01 and 12.";
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return "This card has expired.";
      return true;
    },
    ccCvc: (v) => /^\d{3,4}$/.test(v) || "CVC must be 3 or 4 digits."
  };
  const cardChecks = ["ccName", "ccNumber", "ccExpiry", "ccCvc"];

  function validate() {
    let first = null;
    for (const id in checks) {
      const input = document.getElementById(id);
      const field = input.closest(".field");
      const result = cardChecks.includes(id) && !isCard() ? true : checks[id](input.value);
      field.classList.toggle("invalid", result !== true);
      field.querySelector(".field-error").textContent = result === true ? "" : result;
      if (result !== true && !first) first = input;
    }
    if (first) first.focus();
    return !first;
  }

  checkoutForm.addEventListener("input", (e) => {
    const field = e.target.closest(".field.invalid");
    if (field) {
      field.classList.remove("invalid");
      field.querySelector(".field-error").textContent = "";
    }
  });

  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    if (!validate()) {
      status.textContent = "Please fix the highlighted fields.";
      return;
    }

    const { cart, subtotal, delivery, total } = orderTotals();
    const orderNumber = "ADD-" + Math.floor(100000 + Math.random() * 900000);
    const value = (id) => document.getElementById(id).value.trim();
    const payment = isCard()
      ? "Card ending " + value("ccNumber").replace(/\D/g, "").slice(-4)
      : "Cash on Delivery";

    // Order details sent to your email. Card number, expiry and CVC are never included.
    const data = new FormData();
    data.append("_subject", "New order " + orderNumber + " from the Addiction website");
    data.append("_template", "table");
    data.append("_captcha", "false");
    data.append("Order number", orderNumber);
    data.append("Customer name", value("coName"));
    data.append("Contact number", value("coPhone"));
    data.append("email", value("coEmail"));
    data.append("Address", value("coAddress") + ", " + value("coCity") + " " + value("coPostal"));
    data.append("Delivery notes", value("coNotes") || "None");
    data.append("Items", cart.map((i) => `${i.qty} x ${i.name}, size ${i.size || "One size"} (${formatPrice(i.price * i.qty)})`).join("\n"));
    data.append("Subtotal", formatPrice(subtotal));
    data.append("Delivery", delivery === 0 ? "Free" : formatPrice(delivery));
    data.append("Total", formatPrice(total));
    data.append("Payment", payment);

    placeBtn.disabled = true;
    placeBtn.textContent = "Placing your order...";
    try {
      const response = await fetch(checkoutForm.action.replace("formsubmit.co/", "formsubmit.co/ajax/"), {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data
      });
      if (!response.ok) throw new Error("Order failed");
    } catch {
      status.textContent = "Sorry, we couldn't place your order. Please check your internet connection and try again.";
      placeBtn.disabled = false;
      renderSummary();
      return;
    }

    // Show the confirmation and empty the cart
    document.getElementById("doneMessage").textContent =
      "Your order " + orderNumber + " has been placed. We'll contact you on " + value("coPhone") + " to confirm delivery.";
    document.getElementById("doneDetails").innerHTML = `
      <div><span>Order number</span><span>${orderNumber}</span></div>
      <div><span>Deliver to</span><span>${value("coName")}, ${value("coAddress")}, ${value("coCity")}</span></div>
      <div><span>Payment</span><span>${payment}</span></div>
      <div><span>Items</span><span>${cart.reduce((n, i) => n + i.qty, 0)}</span></div>
      <div><span>Total</span><span>${formatPrice(total)}</span></div>`;
    checkoutForm.hidden = true;
    document.getElementById("orderDone").hidden = false;
    document.querySelectorAll(".checkout-steps li").forEach((li) => li.classList.add("done"));
    document.querySelector(".checkout-steps li.current").classList.remove("current");
    saveCart([]);
    checkoutForm.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  renderSummary();
  onCartChange = () => { if (document.getElementById("orderDone").hidden) renderSummary(); };
}

/* ---------- Footer year ---------- */
document.querySelectorAll(".year").forEach((el) => (el.textContent = new Date().getFullYear()));

renderCart();
