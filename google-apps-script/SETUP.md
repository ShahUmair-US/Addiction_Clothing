# Order System Setup (Google Sheets)

This connects the website to a free Google Sheet so that:

1. **Every order is saved** as a row in your sheet: your order list.
2. **The customer gets an order confirmation email** with their order number.
3. **The customer gets a "shipped" email** with the courier and tracking number when you mark the order as Shipped.
4. **The customer gets a "delivered" email** when you mark the order as Delivered.
5. **Customers can track their order** on the website's Track Order page.

It takes about 10 minutes, and you only do it once. You need a Google (Gmail) account. Customer emails are sent **from that Google account**.

---

## Part 1: Create the sheet and add the script

1. Go to **sheets.google.com** and create a **Blank spreadsheet**.
2. Name it **Addiction Orders** (click "Untitled spreadsheet" at the top left).
3. In the menu, click **Extensions → Apps Script**. A new tab opens with a code editor.
4. Delete everything in the editor, then **copy all of `Code.gs`** (in this folder) and paste it in.
5. At the top of the code, check **YOUR SETTINGS**:
   - `STORE_EMAIL`: the email that gets a copy of every new order
   - `STORE_PHONE`: your real phone number, shown in customer emails
   - `WEBSITE_URL`: your live website address
6. Click the **Save** icon (💾). If asked for a project name, type **Addiction Orders**.

## Part 2: Run the setup once

1. At the top of the editor, find the dropdown next to **Run** and choose **setup**.
2. Click **Run**.
3. Google asks for permission (this is your own script, so it's safe):
   - Click **Review permissions** and choose your Google account.
   - If you see **"Google hasn't verified this app"**, click **Advanced**, then **Go to Addiction Orders (unsafe)**.
   - Click **Allow**.
4. Go back to your spreadsheet tab. You'll see a new **Orders** sheet with headings, a **Status** dropdown and a **Courier** dropdown.

## Part 3: Connect it to the website

1. In the Apps Script tab, click **Deploy → New deployment**.
2. Click the gear icon ⚙ next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** Website orders
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**. This lets the website send orders; nobody can open your sheet.
4. Click **Deploy** (and **Authorize** again if asked).
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.
6. **Send that URL to Claude**, or paste it yourself into `js/script.js` on this line:
   ```js
   const ORDER_SCRIPT_URL = "";
   ```
   so it becomes `const ORDER_SCRIPT_URL = "https://script.google.com/macros/s/AKfy.../exec";`
7. Upload the updated `js/script.js` to GitHub. Cloudflare updates the live site automatically.

## Part 4: Test it

1. On the live website, place a test order using **your own email**.
2. Check that:
   - A new row appears in the **Orders** sheet.
   - You receive the **order confirmation** email (as the customer) and the **new order** email (as the store).
3. In the sheet, pick a **Courier**, type any **Tracking Number**, then set **Status** to **Shipped**. The **shipped** email should arrive.
4. Set **Status** to **Delivered**. The **delivered** email should arrive.
5. Open the website's **Track Order** page and enter the order number and email.

You can delete the test row afterwards.

---

## Daily use

| When... | Do this in the Orders sheet | Customer gets |
|---|---|---|
| A new order arrives | Nothing: it's added automatically | Order confirmation email |
| You've called the customer | Set **Status** to **Confirmed** | (no email) |
| You hand it to the courier | Choose the **Courier**, type the **Tracking Number**, paste the courier's **Tracking Link** if you have one, then set **Status** to **Shipped** | Shipped email with tracking details |
| The customer receives it | Set **Status** to **Delivered** | Delivered email |
| The order is cancelled | Set **Status** to **Cancelled** | (no email; contact the customer directly) |

- Each email is sent **only once**. The time it was sent is written in the "Shipped Email Sent" and "Delivered Email Sent" columns.
- If you set Shipped **before** typing the tracking number, the email waits and goes out as soon as you add the tracking number.
- Free Gmail accounts can send about **100 emails a day**. That's plenty for a new store.

## If you change the code later

After editing `Code.gs`, click **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The web app URL stays the same, so the website doesn't need changing.
