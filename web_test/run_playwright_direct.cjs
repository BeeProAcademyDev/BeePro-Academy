const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err));

  await page.goto("http://localhost:3000/");

  const base = "https://beepro-academy-wheat.vercel.app/api/v1/auth";

  const doFetch = async (label, url, opts) => {
    return await page.evaluate(
      async (arg) => {
        const { label, url, opts } = arg;
        try {
          const res = await fetch(url, opts);
          const headers = {};
          for (const [k, v] of res.headers.entries()) headers[k] = v;
          const text = await res.text();
          return {
            label,
            ok: res.ok,
            status: res.status,
            headers,
            body: text.slice(0, 500),
          };
        } catch (e) {
          return { label, error: String(e) };
        }
      },
      { label, url, opts },
    );
  };

  const results = [];
  results.push(
    await doFetch("OPTIONS /login", base + "/login", {
      method: "OPTIONS",
      credentials: "include",
      mode: "cors",
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    }),
  );
  results.push(
    await doFetch("OPTIONS /register", base + "/register", {
      method: "OPTIONS",
      credentials: "include",
      mode: "cors",
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    }),
  );
  results.push(
    await doFetch("POST /login", base + "/login", {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@example.com", password: "x" }),
    }),
  );
  results.push(
    await doFetch("POST /register", base + "/register", {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test+" + Date.now() + "@example.com",
        password: "x",
      }),
    }),
  );

  console.log("RESULTS:", JSON.stringify(results, null, 2));

  await browser.close();
  process.exit(0);
})();
