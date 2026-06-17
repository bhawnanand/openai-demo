(function () {
  const results = document.querySelector("#results");
  const storage = window.ShopScriptStorage;
  const codex = window.ShopScriptCodex;
  const originalSession = localStorage.getItem(storage.KEYS.session);
  const originalPages = localStorage.getItem(storage.KEYS.pages);
  const originalUsers = localStorage.getItem(storage.KEYS.users);

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function addResult(name, status, detail) {
    const row = document.createElement("div");
    row.className = `test-row ${status}`;
    row.innerHTML = `<strong>${status.toUpperCase()}: ${name}</strong><pre>${detail}</pre>`;
    results.appendChild(row);
  }

  async function runTest(name, fn) {
    try {
      const detail = await fn();
      addResult(name, "pass", detail || "OK");
    } catch (error) {
      addResult(name, "fail", error.message);
    }
  }

  async function run() {
    localStorage.removeItem(storage.KEYS.session);
    localStorage.removeItem(storage.KEYS.pages);
    localStorage.removeItem(storage.KEYS.users);

    await runTest("create user stores a local merchant profile", () => {
      const result = storage.saveUser({
        email: "merchant@northstar.com",
        storeName: "Northstar Goods",
        accessCode: "demo123"
      });
      assert(result.ok, "User was not created.");
      assert(storage.getUsers().length === 1, "User list was not persisted.");
      return JSON.stringify(result.user, null, 2);
    });

    await runTest("existing user sign in persists a merchant session", () => {
      const user = storage.findUser("merchant@northstar.com", "demo123");
      assert(user, "Existing user could not sign in.");
      storage.setSession({ email: user.email, storeName: user.storeName, storeId: user.userId });
      const session = storage.getSession();
      assert(session.email === "merchant@northstar.com", "Email was not persisted.");
      assert(session.storeName === "Northstar Goods", "Store name was not persisted.");
      return JSON.stringify(session, null, 2);
    });

    await runTest("logout clears a merchant session", () => {
      storage.clearSession();
      assert(storage.getSession() === null, "Session still exists after logout.");
      return "Session cleared.";
    });

    await runTest("Codex adapter (live or fallback) returns a complete AeroBrew page schema", async () => {
      const result = await codex.generateProductPageWithCodex({
        name: "AeroBrew Travel Coffee Kit",
        description: "A compact pour-over kit for commuters.",
        price: "$79",
        audience: "remote workers",
        tone: "premium"
      });
      const page = result.page;
      assert(page.name, "Missing product name.");
      assert(page.headline, "Missing headline.");
      assert(page.benefits.length === 3, "Expected three benefits.");
      assert(page.faqs.length >= 2, "Expected FAQ content.");
      assert(page.seo.title && page.seo.description, "Missing SEO metadata.");
      assert(page.visualSvg.includes("<svg"), "Missing generated product visual.");
      assert(page.integrationMode, "Missing integration mode flag.");
      return JSON.stringify({
        mode: page.integrationMode,
        steps: result.steps.slice(0, 2),
        headline: page.headline
      }, null, 2);
    });

    await runTest("optional tone, price, and audience use safe defaults", async () => {
      const result = await codex.generateProductPageWithCodex({
        name: "AeroBrew Travel Coffee Kit",
        description: "A compact pour-over kit for commuters."
      });
      assert(result.page.price === "Price available on request", "Missing fallback price.");
      assert(result.page.headline.includes("modern shoppers"), "Missing fallback audience.");
      assert(result.page.specs.some((spec) => spec.includes("premium")), "Missing fallback tone.");
      return JSON.stringify({
        price: result.page.price,
        headline: result.page.headline,
        specs: result.page.specs
      }, null, 2);
    });

    await runTest("saving a page persists it locally", async () => {
      const result = await codex.generateProductPageWithCodex({
        name: "AeroBrew Travel Coffee Kit",
        description: "A compact pour-over coffee kit for commuters, campers, and office coffee fans.",
        price: "$79",
        audience: "busy commuters",
        tone: "premium"
      });
      storage.savePage({ ...result.page, storeId: "demo" });
      const pages = storage.getPages();
      assert(pages.length === 1, "Saved page was not found.");
      assert(pages[0].name === "AeroBrew Travel Coffee Kit", "Saved page has wrong name.");
      return JSON.stringify(pages[0], null, 2);
    });

    await runTest("downloadable HTML contains AeroBrew content and product visual", async () => {
      const result = await codex.generateProductPageWithCodex({
        name: "AeroBrew Travel Coffee Kit",
        description: "A compact pour-over coffee kit for commuters, campers, and office coffee fans.",
        price: "$79",
        audience: "busy commuters",
        tone: "premium"
      });
      const html = codex.createStandaloneProductHtml(result.page);
      assert(html.includes("<!doctype html>"), "Export is missing doctype.");
      assert(html.includes("AeroBrew Travel Coffee Kit"), "Export is missing product name.");
      assert(html.includes("busy commuters"), "Export is missing audience copy.");
      assert(html.includes("<svg"), "Export is missing generated product visual.");
      return html.slice(0, 500);
    });

    await runTest("deterministic adapter creates consistent product visuals", () => {
      const page1 = codex.createStructuredProductPage({
        name: "Coffee Kit",
        description: "A kit for coffee."
      });
      const page2 = codex.createStructuredProductPage({
        name: "Coffee Kit",
        description: "A kit for coffee."
      });
      assert(page1.visualSvg === page2.visualSvg, "Visual SVG should be deterministic for same input.");
      assert(page1.price === page2.price, "Price fallback should be consistent.");
      assert(page1.headline === page2.headline, "Headline should be consistent.");
      return JSON.stringify({
        visualsMatch: page1.visualSvg === page2.visualSvg,
        pricesFallback: page1.price
      }, null, 2);
    });

    localStorage.removeItem(storage.KEYS.session);
    localStorage.removeItem(storage.KEYS.pages);
    localStorage.removeItem(storage.KEYS.users);
    if (originalSession) localStorage.setItem(storage.KEYS.session, originalSession);
    if (originalPages) localStorage.setItem(storage.KEYS.pages, originalPages);
    if (originalUsers) localStorage.setItem(storage.KEYS.users, originalUsers);
  }

  run();
})();
