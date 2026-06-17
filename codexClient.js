(function () {
  function sentenceCase(value) {
    const text = String(value || "").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function compactText(value, fallback) {
    return sentenceCase(value || fallback).replace(/\s+/g, " ");
  }

  function simpleHash(value) {
    return String(value || "").split("").reduce((total, char) => {
      return (total + char.charCodeAt(0) * 17) % 360;
    }, 0);
  }

  function createProductVisual(page) {
    const hue = simpleHash(page.name);
    const accent = `hsl(${hue}, 58%, 38%)`;
    const warm = `hsl(${(hue + 42) % 360}, 68%, 72%)`;
    const label = escapeHtml(page.name.split(/\s+/).slice(0, 2).join(" "));
    return `<svg class="product-art" viewBox="0 0 320 260" role="img" aria-label="Generated product visual for ${escapeHtml(page.name)}" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="260" rx="18" fill="#ffffff"/>
      <rect x="22" y="22" width="276" height="216" rx="16" fill="${warm}" opacity="0.45"/>
      <circle cx="238" cy="74" r="44" fill="${accent}" opacity="0.18"/>
      <path d="M80 190 C88 112, 132 66, 202 82 C238 90, 254 124, 236 158 C214 198, 138 220, 80 190 Z" fill="${accent}" opacity="0.9"/>
      <path d="M103 171 C122 127, 157 105, 204 107" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity="0.6"/>
      <rect x="64" y="188" width="192" height="28" rx="14" fill="#18212f" opacity="0.88"/>
      <text x="160" y="207" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#ffffff">${label}</text>
    </svg>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createStructuredProductPage(input) {
    const name = compactText(input.name, "Featured product");
    const description = compactText(input.description, "A practical product designed for everyday shoppers.");
    const audience = compactText(input.audience, "modern shoppers").toLowerCase();
    const price = compactText(input.price, "Price available on request");
    const tone = compactText(input.tone, "premium");
    const toneWord = tone.toLowerCase();

    const page = {
      id: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      source: "codex-adapter-demo",
      name,
      price,
      headline: `${name} for ${audience}`,
      subheadline: `${description} ShopScript turns the raw merchant brief into a ${toneWord} storefront page with SEO, FAQs, and conversion-focused sections.`,
      benefits: [
        `Built for ${audience} who want a clear reason to buy.`,
        `Highlights the product value in plain language.`,
        `Includes trust-building content ready for a storefront.`
      ],
      description,
      specs: [
        "Generated from merchant-provided product notes",
        `Tone: ${tone}`,
        "Export format: standalone HTML"
      ],
      faqs: [
        {
          question: `Who is ${name} best for?`,
          answer: `${name} is positioned for ${audience} who want a reliable, easy-to-understand product experience.`
        },
        {
          question: "Can this page be edited after generation?",
          answer: "Yes. The generated page is saved locally and can be downloaded as editable HTML."
        }
      ],
      seo: {
        title: `${name} | ${sentenceCase(audience)} product page`,
        description: `${name}: ${description}`.slice(0, 155)
      }
    };
    page.visualSvg = createProductVisual(page);
    return page;
  }

  async function generateProductPageWithCodex(input) {
    const liveSteps = [
      "Normalize product brief",
      "Call OpenAI Codex API",
      "Parse structured page response",
      "Render downloadable HTML"
    ];

    const fallbackSteps = [
      "Normalize product brief",
      "Create storefront page schema (local fallback)",
      "Generate benefits, FAQ, and SEO metadata",
      "Render downloadable HTML"
    ];

    try {
      // Try live API first
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15000)  // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.page) {
        throw new Error("Invalid API response structure");
      }

      // Mark as live
      result.page.integrationMode = "live-api";
      result.steps = liveSteps;
      return result;
    } catch (error) {
      // Fallback to deterministic adapter if API fails
      console.warn("Codex API unavailable, falling back to deterministic adapter:", error.message);
      const page = createStructuredProductPage(input);
      page.integrationMode = "fallback-local";
      return { page, steps: fallbackSteps };
    }
  }

  function createStandaloneProductHtml(page) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.seo.title)}</title>
  <meta name="description" content="${escapeHtml(page.seo.description)}">
  <style>
    body { margin: 0; color: #18212f; font-family: Arial, sans-serif; background: #f7f8fb; }
    main { max-width: 1040px; margin: 0 auto; padding: 24px; }
    .hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; padding: 28px; border-radius: 8px; background: linear-gradient(135deg, #f2fbf9, #fff7ea); }
    .image { min-height: 240px; display: grid; place-items: center; border: 1px solid #9ed7cf; border-radius: 8px; color: #115e59; font-weight: 800; background: white; text-align: center; }
    .product-art { width: min(280px, 100%); height: auto; }
    h1 { font-size: clamp(36px, 7vw, 64px); line-height: 1; margin: 0 0 16px; }
    section { margin-top: 20px; padding: 22px; border: 1px solid #d7dde8; border-radius: 8px; background: white; }
    .benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0; list-style: none; }
    .benefits li { border: 1px solid #d7dde8; border-radius: 8px; padding: 12px; }
    .price { color: #115e59; font-size: 24px; font-weight: 800; }
    @media (max-width: 760px) { .hero, .benefits { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <div class="hero">
      <div>
        <h1>${escapeHtml(page.headline)}</h1>
        <p>${escapeHtml(page.subheadline)}</p>
        <p class="price">${escapeHtml(page.price)}</p>
      </div>
      <div class="image">${page.visualSvg || escapeHtml(page.name)}</div>
    </div>
    <section>
      <h2>Why shoppers will care</h2>
      <ul class="benefits">${page.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}</ul>
    </section>
    <section>
      <h2>Product story</h2>
      <p>${escapeHtml(page.description)}</p>
    </section>
    <section>
      <h2>FAQ</h2>
      ${page.faqs.map((faq) => `<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`).join("")}
    </section>
  </main>
</body>
</html>`;
  }

  window.ShopScriptCodex = {
    createStructuredProductPage,
    generateProductPageWithCodex,
    createStandaloneProductHtml,
    createProductVisual
  };
})();
