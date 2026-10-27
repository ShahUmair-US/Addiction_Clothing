/**
 * ADDICTION CLOTHING: ORDER SYSTEM
 * Google Sheets + Google Apps Script (free)
 *
 * What it does:
 *  1. Every order from the website is saved as a new row in the "Orders" sheet.
 *  2. The customer gets an ORDER CONFIRMATION email with their order number.
 *  3. When you set Status to "Shipped" and fill in the Tracking Number,
 *     the customer gets a SHIPPED email with the courier and tracking number.
 *  4. When you set Status to "Delivered", the customer gets a DELIVERED email.
 *  5. Customers can check their order on the website's "Track Order" page.
 *
 * Setup steps are in SETUP.md (same folder).
 */

// ===== YOUR SETTINGS (change these) =====
const STORE_NAME = 'Addiction Clothing';
const STORE_EMAIL = 'umair@i4serv.com';   // gets a copy of every new order
const STORE_PHONE = '+1 (555) 012-3456';  // shown in customer emails
const WEBSITE_URL = 'https://addiction-clothing.muhammadshahumair321.workers.dev';

// ===== SHEET LAYOUT (no need to change) =====
const SHEET_NAME = 'Orders';
const HEADERS = [
  'Order Number', 'Order Date', 'Customer Name', 'Phone', 'Email', 'Address', 'Delivery Notes',
  'Items', 'Subtotal', 'Delivery', 'Total', 'Payment',
  'Status', 'Courier', 'Tracking Number', 'Tracking Link',
  'Shipped Email Sent', 'Delivered Email Sent'
];
const STATUSES = ['Order received', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const COURIERS = ['TCS', 'Leopards', 'M&P', 'PostEx', 'Trax', 'BlueEx', 'Pakistan Post', 'Other'];

const col = (name) => HEADERS.indexOf(name) + 1;
const ordersSheet = () => SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);


/* ---------------------------------------------------------------
   RUN THIS ONCE: creates the sheet, headers, dropdowns and the
   automatic email trigger.
---------------------------------------------------------------- */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#022b3a').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(col('Items'), 320);
  sheet.setColumnWidth(col('Address'), 260);
  addDropdowns(sheet, 2, sheet.getMaxRows() - 1);

  // Replace any old trigger, then add the one that sends shipped/delivered emails
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'onOrderEdit')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onOrderEdit').forSpreadsheet(ss).onEdit().create();

  ss.toast('Order sheet is ready. Now deploy the web app (see SETUP.md).', STORE_NAME, 10);
}

function addDropdowns(sheet, firstRow, numRows) {
  sheet.getRange(firstRow, col('Status'), numRows).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
  sheet.getRange(firstRow, col('Courier'), numRows).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(COURIERS, true).setAllowInvalid(true).build());
}


/* ---------------------------------------------------------------
   WEBSITE CONNECTION
   The website sends new orders and tracking lookups here.
---------------------------------------------------------------- */
function doPost(e) {
  const p = e.parameter || {};
  if (p.action === 'track') return trackOrder(p);
  return saveOrder(p);
}

function saveOrder(p) {
  if (!p.orderNumber || !p.email || !p.name) return json({ ok: false, error: 'Missing order details.' });
  if (p._honey) return json({ ok: true, orderNumber: p.orderNumber }); // spam bot filled the hidden field

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = ordersSheet();
    sheet.appendRow([
      p.orderNumber, new Date(), p.name, "'" + p.phone, p.email, p.address, p.notes || '',
      p.items, p.subtotal, p.delivery, p.total, p.payment || 'Cash on Delivery',
      'Order received', '', '', '', '', ''
    ]);
    addDropdowns(sheet, sheet.getLastRow(), 1);
  } finally {
    lock.releaseLock();
  }

  sendEmail(p.email, `Your ${STORE_NAME} order ${p.orderNumber} is confirmed`, confirmationEmail(p));
  MailApp.sendEmail({
    to: STORE_EMAIL,
    replyTo: p.email,
    subject: `New order ${p.orderNumber}: ${p.total} (${p.name})`,
    htmlBody: ownerEmail(p)
  });
  return json({ ok: true, orderNumber: p.orderNumber });
}

function trackOrder(p) {
  const order = String(p.order || '').trim().toUpperCase();
  const email = String(p.email || '').trim().toLowerCase();
  if (!order || !email) return json({ ok: false, error: 'Please enter your order number and email address.' });

  const rows = ordersSheet().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (name) => r[col(name) - 1];
    if (String(get('Order Number')).toUpperCase() === order && String(get('Email')).toLowerCase() === email) {
      return json({
        ok: true,
        order: get('Order Number'),
        date: Utilities.formatDate(new Date(get('Order Date')), Session.getScriptTimeZone(), 'd MMMM yyyy'),
        status: get('Status') || 'Order received',
        courier: get('Courier'),
        trackingNumber: String(get('Tracking Number') || ''),
        trackingLink: get('Tracking Link'),
        items: get('Items'),
        total: get('Total')
      });
    }
  }
  return json({ ok: false, error: "We couldn't find an order with that number and email. Please check both and try again." });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* ---------------------------------------------------------------
   AUTOMATIC SHIPPED / DELIVERED EMAILS
   Runs whenever you edit the Orders sheet.
---------------------------------------------------------------- */
function onOrderEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  for (let row = Math.max(2, e.range.getRow()); row <= e.range.getLastRow(); row++) checkRow(sheet, row);
}

function checkRow(sheet, row) {
  const values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const get = (name) => values[col(name) - 1];
  const order = {
    orderNumber: get('Order Number'), name: get('Customer Name'), email: get('Email'),
    address: get('Address'), items: get('Items'), total: get('Total'),
    courier: get('Courier'), trackingNumber: String(get('Tracking Number') || '').trim(), trackingLink: get('Tracking Link')
  };
  if (!order.email) return;

  if (get('Status') === 'Shipped' && !get('Shipped Email Sent')) {
    if (!order.trackingNumber) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Add the tracking number for ${order.orderNumber} and the shipped email will be sent.`, 'Tracking number needed', 8);
      return;
    }
    sendEmail(order.email, `Your ${STORE_NAME} order ${order.orderNumber} is on its way`, shippedEmail(order));
    sheet.getRange(row, col('Shipped Email Sent')).setValue(new Date());
    SpreadsheetApp.getActiveSpreadsheet().toast(`Shipped email sent to ${order.email}`, STORE_NAME, 5);
  }

  if (get('Status') === 'Delivered' && !get('Delivered Email Sent')) {
    sendEmail(order.email, `Your ${STORE_NAME} order ${order.orderNumber} has been delivered`, deliveredEmail(order));
    sheet.getRange(row, col('Delivered Email Sent')).setValue(new Date());
    SpreadsheetApp.getActiveSpreadsheet().toast(`Delivered email sent to ${order.email}`, STORE_NAME, 5);
  }
}


/* ---------------------------------------------------------------
   EMAIL TEMPLATES
---------------------------------------------------------------- */
function sendEmail(to, subject, html) {
  MailApp.sendEmail({ to, subject, htmlBody: html, name: STORE_NAME, replyTo: STORE_EMAIL });
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lines = (s) => esc(s).replace(/\n/g, '<br>');
const trackUrl = (orderNumber) => `${WEBSITE_URL}/track-order.html?order=${encodeURIComponent(orderNumber)}`;

function layout(heading, bodyHtml, buttonText, buttonUrl) {
  const button = buttonText
    ? `<p style="margin:28px 0"><a href="${buttonUrl}" style="background:#022b3a;color:#ffffff;padding:14px 26px;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px">${buttonText}</a></p>`
    : '';
  return `
  <div style="background:#e1e5f2;padding:30px 12px;font-family:Arial,Helvetica,sans-serif;color:#022b3a">
    <div style="max-width:560px;margin:0 auto;background:#ffffff">
      <div style="background:#022b3a;padding:22px 28px;color:#ffffff;font-size:22px;letter-spacing:4px;font-weight:bold">ADDICTION</div>
      <div style="padding:30px 28px;font-size:15px;line-height:1.6">
        <h1 style="font-size:22px;margin:0 0 16px">${heading}</h1>
        ${bodyHtml}
        ${button}
        <p style="font-size:13px;color:#1f7a8c;margin-top:30px">Questions? Reply to this email or call ${esc(STORE_PHONE)}.</p>
      </div>
    </div>
  </div>`;
}

function detailsTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">${rows.map(([k, v]) =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #e1e5f2;color:#1f7a8c;width:38%;vertical-align:top">${k}</td>
     <td style="padding:9px 0;border-bottom:1px solid #e1e5f2;font-weight:bold">${v}</td></tr>`).join('')}</table>`;
}

function confirmationEmail(p) {
  return layout(
    `Thank you for your order, ${esc(p.name)}!`,
    `<p>We've received your order and we're getting it ready.</p>
     ${detailsTable([
       ['Order number', esc(p.orderNumber)],
       ['Items', lines(p.items)],
       ['Subtotal', esc(p.subtotal)],
       ['Delivery', esc(p.delivery)],
       ['Total', esc(p.total)],
       ['Payment', esc(p.payment || 'Cash on Delivery')],
       ['Deliver to', esc(p.address)]
     ])}
     <p><strong>What happens next?</strong><br>
     1. We'll call you on ${esc(p.phone)} to confirm your order.<br>
     2. When it ships, we'll email you the courier and tracking number.<br>
     3. Pay in cash when your order arrives.</p>
     <p>Keep your order number <strong>${esc(p.orderNumber)}</strong> to track your order or ask us about it.</p>`,
    'Track your order', trackUrl(p.orderNumber));
}

function shippedEmail(o) {
  const linkRow = o.trackingLink ? [['Track online', `<a href="${esc(o.trackingLink)}" style="color:#1f7a8c">Open tracking page</a>`]] : [];
  return layout(
    'Your order is on its way!',
    `<p>Hi ${esc(o.name)}, good news: your order has been handed to the courier.</p>
     ${detailsTable([
       ['Order number', esc(o.orderNumber)],
       ['Courier', esc(o.courier || 'Courier')],
       ['Tracking number', esc(o.trackingNumber)],
       ...linkRow,
       ['Deliver to', esc(o.address)],
       ['Amount to pay on delivery', esc(o.total)]
     ])}
     <p>You can track your parcel on ${esc(o.courier || "the courier's")} website using the tracking number above.
     Please keep ${esc(o.total)} in cash ready for the rider.</p>`,
    o.trackingLink ? 'Track your parcel' : 'View order status',
    o.trackingLink || trackUrl(o.orderNumber));
}

function deliveredEmail(o) {
  return layout(
    'Your order has been delivered',
    `<p>Hi ${esc(o.name)}, your order <strong>${esc(o.orderNumber)}</strong> has been delivered. We hope you love it!</p>
     ${detailsTable([['Order number', esc(o.orderNumber)], ['Items', lines(o.items)], ['Total', esc(o.total)]])}
     <p>Not the right fit? You can return or exchange unworn items with tags within <strong>30 days</strong>.
     Just reply to this email with your order number.</p>
     <p>Thank you for shopping with ${STORE_NAME}.</p>`,
    'Shop again', WEBSITE_URL + '/products.html');
}

function ownerEmail(p) {
  return layout(
    `New order ${esc(p.orderNumber)}`,
    detailsTable([
      ['Customer', esc(p.name)], ['Phone', esc(p.phone)], ['Email', esc(p.email)],
      ['Address', esc(p.address)], ['Notes', esc(p.notes || 'None')],
      ['Items', lines(p.items)], ['Total', esc(p.total)], ['Payment', esc(p.payment || 'Cash on Delivery')]
    ]) + '<p>The order has been added to your Orders sheet. Set the Status there as it moves along.</p>',
    '', '');
}
