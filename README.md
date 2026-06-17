# ShopScript: OpenAI Codex FDE Interview Submission

**Real-time AI product page generator demonstrating genuine OpenAI API integration.**

A merchant logs in, enters a product brief, and the app calls OpenAI's API to generate a complete product listing page — with automatic fallback to local generation if the API is unavailable. Pages can be previewed, saved, and downloaded as standalone HTML.

## ⭐ Key Highlights

- **Real Codex Integration:** Genuine OpenAI API calls (not mocked or templated)
- **4-Layer Architecture:** UI → Orchestration → Cache → AI (clear separation of concerns)
- **Production Path:** Scales from local demo to 100k+ users without API boundary change
- **Constraint-Driven Design:** Optimized for stability (Windows BlueScreen-safe)
- **Fully Tested:** 8 assertions covering all core flows

## 🏗️ Architecture

```
┌─────────────────────────┐
│  Browser (UI)           │  → index.html, app.js, styles.css
│  ├─ Vanilla JavaScript  │
│  └─ localStorage        │
└───────────┬─────────────┘
            │ HTTP POST
┌───────────▼─────────────┐
│  Python Server          │  → server.py
│  ├─ Static file server  │     (serves UI + API endpoint)
│  └─ /api/generate       │
└───────────┬─────────────┘
            │ HTTPS
┌───────────▼─────────────┐
│  OpenAI API             │  → Real Codex calls
│  (gpt-4o-mini model)    │     (generates product copy)
└─────────────────────────┘
```

- **Client:** Static HTML, CSS, and JavaScript (no npm, no build step).
- **Server:** Lightweight Python proxy (`server.py`) using stdlib only — no pip install.
- **API:** Live OpenAI calls via POST `/api/generate`, with automatic fallback.
- **Storage:** Browser localStorage (persists sessions & pages).

## ✅ Evaluation Criteria Met

| Requirement | Status | Evidence |
|---|---|---|
| **Login/Authorization** | ✅ | app.js, tests.js (test #1-3) |
| **Data Persistence** | ✅ | storage.js, tests.js (test #6) |
| **Meaningful Tests** | ✅ | tests.js (8 assertions, all passing) |
| **Programmatic Codex Use** | ✅ | codexClient.js, server.py (real API) |

## Setup

1. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   ```

2. Start the server:
   ```bash
   python server.py
   ```

3. Open http://localhost:3000 in your browser.

## Evaluation Criteria

| Requirement | Status | How it works |
|---|---|---|
| **Login / authorization** | ✅ Functional | Users create and sign in with email + store name + access code, stored in `localStorage`. Session gates the dashboard. (Note: this is a demo, not production auth; real auth would be OAuth/SSO.) |
| **Data persistence** | ✅ Real | Saved product pages persist in `localStorage` and survive refresh. Each page is scoped to the merchant's store ID. |
| **Meaningful tests** | ✅ Solid | 8 assertions in [tests.js](tests.js) cover user creation, login, logout, live/fallback page generation, defaults, persistence, and HTML export. Open [tests.html](tests.html) to run them. |
| **OpenAI API Integration** | ✅ **Live** | `generateProductPageWithCodex()` in [codexClient.js](codexClient.js) makes a real HTTP request to `server.py` → OpenAI API. Returns structured product page JSON + benefits, FAQs, SEO. Falls back gracefully if unavailable. |

## How It Works

### User Flow

1. Open `http://localhost:3000`.
2. Create a local merchant profile (email, store name, access code).
3. Log out and sign back in.
4. Enter a product brief: name (required), description (required), price/audience/tone (optional).
5. Click "Generate with Codex adapter".
6. See the Codex run log, generated product visual, live preview, SEO, and FAQ.
7. Save the page or download as HTML.
8. Open `tests.html` to run browser tests.

### API Boundary

When you click "Generate," the browser calls `POST /api/generate`:

**Request:**
```json
{
  "name": "AeroBrew Travel Coffee Kit",
  "description": "A compact pour-over kit for commuters.",
  "price": "$79",
  "audience": "busy commuters",
  "tone": "premium"
}
```

**Response:**
```json
{
  "page": {
    "name": "AeroBrew Travel Coffee Kit",
    "headline": "AeroBrew for busy commuters",
    "benefits": ["...", "...", "..."],
    "description": "...",
    "specs": ["...", "...", "..."],
    "faqs": [{"question": "...", "answer": "..."}, ...],
    "seo": {
      "title": "AeroBrew Travel Coffee Kit | ...",
      "description": "..."
    },
    "visualSvg": "<svg>...</svg>",
    "integrationMode": "live-api"
  },
  "steps": [
    "Normalize product brief",
    "Call OpenAI Codex API",
    "Parse structured page response",
    "Render downloadable HTML"
  ]
}
```

### Server (`server.py`)

- **Reads `.env`** for `OPENAI_API_KEY`.
- **Serves static files** from the directory (index.html, styles.css, etc.).
- **POST `/api/generate`:**
  - Accepts merchant input (name, description, optional price/audience/tone).
  - Calls OpenAI's API with a structured prompt asking for product page JSON.
  - Returns the parsed response + deterministic product visual SVG.
  - No subprocess or heavy workload — just an HTTP request.

### Client Fallback

If the API call fails or times out:
- `codexClient.js` automatically falls back to `createStructuredProductPage()`.
- The deterministic adapter generates a valid page using string interpolation and defaults.
- The UI shows "🟡 Fallback mode" in the status pill.

This keeps the demo working even if the API is unavailable or the network is slow.

## Demo Script (5 minutes)

### 0:00–2:15 Demo

1. **Introduce ShopScript:** "This is an AI-powered product page generator for eCommerce merchants. I'll log in, enter a product brief, and show you a complete page generated in real time."
2. **Auth flow:** Create a new merchant, then sign out and sign in as the same user to show persistence.
3. **Generate:** Enter the AeroBrew product brief (or fill in some fields, leave others blank to show defaults).
4. **Show output:**
   - Point to the Codex run log (showing the API call happened).
   - Show the generated product visual (deterministic SVG).
   - Scroll through benefits, FAQ, specs, SEO metadata.
   - Click Save and refresh to show persistence.
   - Click Download to save the HTML.
5. **Tests:** Open tests.html and show the test results (all green).

### 2:15–5:00 How I Built This With Codex

1. **Constraints:** "My development machine had Windows BlueScreen instability, so I avoided npm, dev servers, and local subprocesses."
2. **Design:** "I built ShopScript as a static client + lightweight Python server, with a real API boundary to OpenAI."
3. **Implementation:**
   - **Client:** Vanilla JS, localStorage, one clear `generateProductPageWithCodex()` function.
   - **Server:** Python stdlib only — no pip install, no external deps. One endpoint: POST `/api/generate`.
   - **Codex integration:** The server calls OpenAI's API with a structured prompt, parses the response, and returns product page JSON.
   - **Resilience:** If the API fails, the client falls back to deterministic generation so the demo keeps working.
4. **Code quality:** "The API boundary is clean — the UI doesn't know or care if it's calling a real API or a fallback. This makes it easy to swap in a backend SDK or MCP later."
5. **Expansion path:**
   - Real auth (OAuth, SSO, or passwordless).
   - Backend database for users and pages.
   - Real image generation or product media upload.
   - Template management and approval workflows.
   - Rate limiting, audit logs, content review.
   - CI/CD with unit tests, integration tests, and automated deploys.

## Comparison: Local vs. Production

| Aspect | This Demo | Production |
|---|---|---|
| **Auth** | Local user + access code in `localStorage` | OAuth, SSO, or passwordless |
| **Persistence** | Browser `localStorage` | Database (PostgreSQL, DynamoDB, etc.) |
| **Codex calls** | API key on server; browser calls `POST /api/generate` | Backend SDK with request validation, rate limits, audit logs |
| **Image generation** | Deterministic SVG | Real image gen (DALL-E, hosted provider, or product upload) |
| **Observability** | Console logs | Logging service (CloudWatch, Datadog), APM tracing |
| **Deployment** | Local Python server | Docker container → cloud platform (AWS, GCP, Heroku) |
| **Security** | None (dev only) | TLS, secrets management, tenant isolation, content review |

## Tests

Run in browser by opening [tests.html](tests.html):

- User creation and persistence
- Login with email + access code
- Logout and session clearing
- Page generation (live API or fallback)
- Optional field defaults
- HTML export with correct content
- Deterministic visual generation

## Files

- **[index.html](index.html):** Merchant studio UI (login, generator, preview, saved pages, integration mode panel).
- **[styles.css](styles.css):** Design system and responsive layout.
- **[app.js](app.js):** Client logic (auth flows, page generation, save, download, persistence).
- **[codexClient.js](codexClient.js):** API adapter (calls `/api/generate`, falls back to deterministic).
- **[storage.js](storage.js):** User and page persistence via `localStorage`.
- **[server.py](server.py):** Python HTTP server + OpenAI API proxy.
- **[tests.html](tests.html) & [tests.js](tests.js):** Browser test suite.

## Next Steps (if continuing development)

1. **Real auth:** Replace local users with OAuth (e.g., Auth0, Google).
2. **Database:** Use a real datastore (PostgreSQL, DynamoDB) instead of `localStorage`.
3. **Backend:** Move Codex logic to a backend service; add schema validation, error handling, rate limiting.
4. **Images:** Integrate DALL-E or product media upload.
5. **Templates:** Let merchants choose page templates; Codex fills in content.
6. **MCP:** If the merchant's eCommerce platform has an MCP server, wire that up so Codex can directly write product pages to the store.
7. **Approval workflow:** Merchants review AI-generated copy before publish.
8. **Deployment:** Docker → Cloud Run, ECS, or Kubernetes.

## Notes

- **Laptop safety:** This build keeps the local workload minimal — no npm watcher, no dev server subprocess, no Codex CLI subprocess. Just a lightweight Python server for request routing.
- **API key security:** The `.env` file is untracked (git-ignored) and contains the API key. *Before sharing this code, rotate the key at platform.openai.com/api-keys.* In production, use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.).
- **Fallback resilience:** The app gracefully degrades if the API is slow or unavailable, so the demo keeps working even with spotty internet.
