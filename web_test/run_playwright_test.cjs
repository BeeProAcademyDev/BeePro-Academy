const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const messages = [];
  page.on("console", (msg) =>
    messages.push({ type: "console", text: msg.text() }),
  );
  page.on("pageerror", (err) =>
    messages.push({ type: "pageerror", text: String(err) }),
  );

  await page.goto("http://localhost:3000/test.html");

  // wait for test completion or timeout
  const start = Date.now();
  while (Date.now() - start < 30000) {
    const done = await page
      .evaluate(() => window.__CORS_TEST_DONE === true)
      .catch(() => false);
    if (done) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const results = await page.evaluate(() => window.__CORS_TEST_RESULTS || []);
  console.log("--- PLAYWRIGHT TEST RESULTS ---");
  console.log(JSON.stringify({ messages, results }, null, 2));

  await browser.close();
  process.exit(0);
})();
