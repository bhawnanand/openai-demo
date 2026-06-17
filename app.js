(function () {
  const storage = window.ShopScriptStorage;
  const codex = window.ShopScriptCodex;
  let currentPage = null;

  const nodes = {
    loginView: document.querySelector("#loginView"),
    dashboardView: document.querySelector("#dashboardView"),
    loginForm: document.querySelector("#loginForm"),
    signinTab: document.querySelector("#signinTab"),
    signupTab: document.querySelector("#signupTab"),
    authCopy: document.querySelector("#authCopy"),
    authSubmit: document.querySelector("#authSubmit"),
    authMessage: document.querySelector("#authMessage"),
    emailInput: document.querySelector("#emailInput"),
    storeInput: document.querySelector("#storeInput"),
    accessCodeInput: document.querySelector("#accessCodeInput"),
    logoutButton: document.querySelector("#logoutButton"),
    storeName: document.querySelector("#storeName"),
    sessionStatus: document.querySelector("#sessionStatus"),
    generatorForm: document.querySelector("#generatorForm"),
    productName: document.querySelector("#productName"),
    productDescription: document.querySelector("#productDescription"),
    productPrice: document.querySelector("#productPrice"),
    productAudience: document.querySelector("#productAudience"),
    productTone: document.querySelector("#productTone"),
    runLog: document.querySelector("#runLog"),
    productPreview: document.querySelector("#productPreview"),
    previewSubtitle: document.querySelector("#previewSubtitle"),
    saveButton: document.querySelector("#saveButton"),
    downloadButton: document.querySelector("#downloadButton"),
    historyList: document.querySelector("#historyList")
  };
  let authMode = "signin";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderApp() {
    const session = storage.getSession();
    nodes.loginView.classList.toggle("hidden", Boolean(session));
    nodes.dashboardView.classList.toggle("hidden", !session);

    if (session) {
      nodes.storeName.textContent = session.storeName;
      updateStatusIndicator();
      renderHistory();
    }
  }

  function updateStatusIndicator() {
    const session = storage.getSession();
    if (!session) return;
    if (currentPage && currentPage.integrationMode === "live-api") {
      nodes.sessionStatus.textContent = `${session.email} | 🟢 Live Codex API`;
      nodes.sessionStatus.style.borderColor = "var(--accent)";
    } else if (currentPage && currentPage.integrationMode === "fallback-local") {
      nodes.sessionStatus.textContent = `${session.email} | 🟡 Fallback mode`;
      nodes.sessionStatus.style.borderColor = "var(--warning)";
    } else {
      nodes.sessionStatus.textContent = `${session.email} | Ready`;
      nodes.sessionStatus.style.borderColor = "var(--line)";
    }
  }

  function renderRunLog(items, activeIndex) {
    nodes.runLog.innerHTML = items.map((item, index) => {
      const className = index <= activeIndex ? "done" : "idle";
      return `<li class="${className}">${escapeHtml(item)}</li>`;
    }).join("");
  }

  function renderProductPreview(page) {
    nodes.productPreview.className = "product-preview";
    nodes.previewSubtitle.textContent = `Generated ${new Date(page.generatedAt).toLocaleString()}`;
    nodes.productPreview.innerHTML = `
      <section class="product-hero">
        <div>
          <p class="eyebrow">Generated product page</p>
          <h4>${escapeHtml(page.headline)}</h4>
          <p>${escapeHtml(page.subheadline)}</p>
          <p class="price">${escapeHtml(page.price)}</p>
        </div>
        <div class="mock-photo">${page.visualSvg || escapeHtml(page.name)}</div>
      </section>
      <section class="product-section">
        <h4>Why shoppers will care</h4>
        <ul class="benefits">
          ${page.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}
        </ul>
      </section>
      <section class="product-section">
        <h4>Product story</h4>
        <p>${escapeHtml(page.description)}</p>
      </section>
      <section class="product-section">
        <h4>Specs</h4>
        <ul>
          ${page.specs.map((spec) => `<li>${escapeHtml(spec)}</li>`).join("")}
        </ul>
      </section>
      <section class="product-section">
        <h4>FAQ</h4>
        ${page.faqs.map((faq) => `
          <div class="faq-item">
            <strong>${escapeHtml(faq.question)}</strong>
            <p>${escapeHtml(faq.answer)}</p>
          </div>
        `).join("")}
      </section>
      <section class="product-section">
        <h4>SEO metadata</h4>
        <div class="seo-box">
          <strong>${escapeHtml(page.seo.title)}</strong>
          <p>${escapeHtml(page.seo.description)}</p>
        </div>
      </section>
    `;
  }

  function renderHistory() {
    const session = storage.getSession();
    const pages = storage.getPages().filter((page) => page.storeId === session.storeId);

    if (!pages.length) {
      nodes.historyList.innerHTML = `<p class="empty-state">No saved product pages yet.</p>`;
      return;
    }

    nodes.historyList.innerHTML = pages.map((page) => `
      <div class="history-item">
        <strong>${escapeHtml(page.name)}</strong>
        <span>${escapeHtml(page.price)} - ${new Date(page.savedAt).toLocaleString()}</span>
        <button class="secondary-button" type="button" data-page-id="${escapeHtml(page.id)}">Open</button>
      </div>
    `).join("");
  }

  function createExportHtml(page) {
    return codex.createStandaloneProductHtml(page);
  }

  function downloadPage(page) {
    const html = createExportHtml(page);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${page.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product-page"}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  nodes.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = nodes.emailInput.value.trim();
    const storeName = nodes.storeInput.value.trim();
    const accessCode = nodes.accessCodeInput.value.trim();
    nodes.authMessage.textContent = "";
    nodes.authMessage.className = "form-message";

    if (authMode === "signup") {
      if (!storeName) {
        nodes.authMessage.textContent = "Store name is required to create a user.";
        nodes.authMessage.classList.add("error");
        return;
      }
      const result = storage.saveUser({ email, storeName, accessCode });
      if (!result.ok) {
        nodes.authMessage.textContent = result.reason;
        nodes.authMessage.classList.add("error");
        return;
      }
      storage.setSession({
        email: result.user.email,
        storeName: result.user.storeName,
        storeId: result.user.userId,
        loggedInAt: new Date().toISOString()
      });
    } else {
      const user = storage.findUser(email, accessCode);
      if (!user) {
        nodes.authMessage.textContent = "No local user matched that email and access code. Create a user first.";
        nodes.authMessage.classList.add("error");
        return;
      }
      storage.setSession({
        email: user.email,
        storeName: user.storeName,
        storeId: user.userId,
        loggedInAt: new Date().toISOString()
      });
    }
    renderApp();
  });

  function setAuthMode(mode) {
    authMode = mode;
    nodes.signinTab.classList.toggle("active", mode === "signin");
    nodes.signupTab.classList.toggle("active", mode === "signup");
    nodes.storeInput.required = mode === "signup";
    nodes.authSubmit.textContent = mode === "signup" ? "Create user" : "Sign in";
    nodes.authCopy.textContent = mode === "signup"
      ? "Create a local merchant profile for this browser."
      : "Sign in with an existing local merchant profile.";
    nodes.authMessage.textContent = "";
    nodes.authMessage.className = "form-message";
  }

  nodes.signinTab.addEventListener("click", () => setAuthMode("signin"));
  nodes.signupTab.addEventListener("click", () => setAuthMode("signup"));

  nodes.logoutButton.addEventListener("click", () => {
    storage.clearSession();
    currentPage = null;
    renderApp();
  });

  nodes.generatorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = {
      name: nodes.productName.value,
      description: nodes.productDescription.value,
      price: nodes.productPrice.value,
      audience: nodes.productAudience.value,
      tone: nodes.productTone.value
    };

    const result = await codex.generateProductPageWithCodex(input);
    renderRunLog(result.steps, 0);
    result.steps.forEach((_, index) => {
      window.setTimeout(() => renderRunLog(result.steps, index), 180 * (index + 1));
    });

    currentPage = {
      ...result.page,
      storeId: storage.getSession().storeId
    };
    renderProductPreview(currentPage);
    updateStatusIndicator();
    nodes.saveButton.disabled = false;
    nodes.downloadButton.disabled = false;
  });

  nodes.saveButton.addEventListener("click", () => {
    if (!currentPage) return;
    currentPage = storage.savePage(currentPage);
    renderHistory();
  });

  nodes.downloadButton.addEventListener("click", () => {
    if (currentPage) downloadPage(currentPage);
  });

  nodes.historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page-id]");
    if (!button) return;
    const page = storage.getPages().find((item) => item.id === button.dataset.pageId);
    if (!page) return;
    currentPage = page;
    renderProductPreview(page);
    nodes.saveButton.disabled = false;
    nodes.downloadButton.disabled = false;
  });

  window.ShopScriptApp = {
    createExportHtml,
    renderProductPreview
  };

  renderApp();
})();
