#!/usr/bin/env python3
"""
ShopScript server: static file server + OpenAI API proxy.
Stdlib only — no pip install needed. Reads OPENAI_API_KEY from .env.
Run: python server.py
Then open http://localhost:3000 in your browser.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


def load_env():
    """Load .env file into environment variables."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()


load_env()


class ShopScriptHandler(SimpleHTTPRequestHandler):
    """Serve static files + proxy /api/generate to OpenAI."""

    def do_GET(self):
        """Serve static files."""
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        """Handle POST /api/generate: call OpenAI and return structured product page."""
        if self.path != "/api/generate":
            self.send_error(404, "Not found")
            return

        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = self.rfile.read(content_length).decode("utf-8")
            request_data = json.loads(body)
        except (ValueError, UnicodeDecodeError) as e:
            self.send_error(400, f"Invalid JSON: {e}")
            return

        try:
            result = self.call_openai_for_product_page(request_data)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))
        except Exception as e:
            self.send_error(500, f"Error calling OpenAI: {e}")

    def call_openai_for_product_page(self, request_data):
        """Call OpenAI API to generate product page from merchant brief."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set in environment")

        name = request_data.get("name", "Product")
        description = request_data.get("description", "")
        price = request_data.get("price", "")
        audience = request_data.get("audience", "")
        tone = request_data.get("tone", "")

        prompt = self.build_product_page_prompt(name, description, price, audience, tone)

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        try:
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            raise ValueError(f"OpenAI API error: {e.code} {error_body}")

        assistant_message = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not assistant_message:
            raise ValueError("Empty response from OpenAI")

        # Parse the JSON response from the model
        try:
            page_data = json.loads(assistant_message)
        except json.JSONDecodeError:
            # If the model doesn't return pure JSON, try to extract it
            start = assistant_message.find("{")
            end = assistant_message.rfind("}") + 1
            if start >= 0 and end > start:
                page_data = json.loads(assistant_message[start:end])
            else:
                raise ValueError("Could not parse product page JSON from OpenAI response")

        # Ensure required fields exist with fallbacks
        page = {
            "id": page_data.get("id") or self.simple_uuid(),
            "generatedAt": page_data.get("generatedAt") or self.iso_now(),
            "source": "codex-api-live",
            "name": page_data.get("name", name),
            "price": page_data.get("price", price or "Price available on request"),
            "headline": page_data.get("headline", f"{name} for {audience or 'modern shoppers'}"),
            "subheadline": page_data.get("subheadline", description),
            "benefits": page_data.get("benefits", self.default_benefits(name, audience)),
            "description": page_data.get("description", description),
            "specs": page_data.get("specs", [f"Generated from merchant notes", f"Tone: {tone or 'premium'}", "Export format: standalone HTML"]),
            "faqs": page_data.get("faqs", self.default_faqs(name, audience)),
            "seo": page_data.get("seo", {"title": f"{name} product page", "description": description[:155]})
        }

        # Generate a deterministic visual SVG (same as browser adapter)
        page["visualSvg"] = self.create_product_visual(page)

        steps = [
            "Normalize product brief",
            "Call OpenAI Codex API",
            "Parse structured page response",
            "Render downloadable HTML"
        ]

        return {"page": page, "steps": steps}

    @staticmethod
    def build_product_page_prompt(name, description, price, audience, tone):
        """Build the prompt for OpenAI to generate structured product page JSON."""
        return f"""You are a professional eCommerce copywriter. A merchant has provided product details, and you must generate a complete, structured product page in JSON format.

Merchant Input:
- Product name: {name}
- Description: {description}
- Price: {price or "(not provided)"}
- Target audience: {audience or "(not provided)"}
- Tone: {tone or "professional"}

Generate a JSON object (ONLY the JSON, no markdown, no extra text) with this exact structure:
{{
  "headline": "<compelling headline for the product page, 8-12 words>",
  "subheadline": "<supporting subheadline describing the product benefit>",
  "benefits": [
    "<benefit 1: why customers care>",
    "<benefit 2: what problem it solves>",
    "<benefit 3: unique value proposition>"
  ],
  "specs": [
    "<spec 1>",
    "<spec 2>",
    "<spec 3>"
  ],
  "faqs": [
    {{
      "question": "<FAQ question 1>",
      "answer": "<FAQ answer 1>"
    }},
    {{
      "question": "<FAQ question 2>",
      "answer": "<FAQ answer 2>"
    }}
  ],
  "seo": {{
    "title": "<SEO title, max 60 chars>",
    "description": "<SEO description, max 155 chars>"
  }}
}}

Ensure:
- All text is clear, persuasive, and eCommerce-focused.
- Benefits are specific to the product and audience.
- FAQs address common objections or feature questions.
- SEO metadata is keyword-rich and clickable.
- Return ONLY valid JSON, nothing else."""

    @staticmethod
    def default_benefits(name, audience):
        return [
            f"Built for {audience or 'modern shoppers'} who want a clear reason to buy.",
            "Highlights the product value in plain language.",
            "Includes trust-building content ready for a storefront."
        ]

    @staticmethod
    def default_faqs(name, audience):
        return [
            {
                "question": f"Who is {name} best for?",
                "answer": f"{name} is positioned for {audience or 'modern shoppers'} who want a reliable, easy-to-understand product experience."
            },
            {
                "question": "Can this page be edited after generation?",
                "answer": "Yes. The generated page is saved locally and can be downloaded as editable HTML."
            }
        ]

    @staticmethod
    def create_product_visual(page):
        """Generate a deterministic product visual SVG (same algorithm as browser)."""
        name = page.get("name", "Product")
        hue = sum(ord(c) * 17 for c in name) % 360
        accent = f"hsl({hue}, 58%, 38%)"
        warm = f"hsl({(hue + 42) % 360}, 68%, 72%)"
        label = " ".join(name.split()[:2])

        return f'''<svg class="product-art" viewBox="0 0 320 260" role="img" aria-label="Generated product visual for {name}" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="260" rx="18" fill="#ffffff"/>
      <rect x="22" y="22" width="276" height="216" rx="16" fill="{warm}" opacity="0.45"/>
      <circle cx="238" cy="74" r="44" fill="{accent}" opacity="0.18"/>
      <path d="M80 190 C88 112, 132 66, 202 82 C238 90, 254 124, 236 158 C214 198, 138 220, 80 190 Z" fill="{accent}" opacity="0.9"/>
      <path d="M103 171 C122 127, 157 105, 204 107" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity="0.6"/>
      <rect x="64" y="188" width="192" height="28" rx="14" fill="#18212f" opacity="0.88"/>
      <text x="160" y="207" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#ffffff">{label}</text>
    </svg>'''

    @staticmethod
    def simple_uuid():
        """Generate a simple UUID-like string."""
        import random
        import string
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=36))

    @staticmethod
    def iso_now():
        """Return current time in ISO format."""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"

    def log_message(self, format, *args):
        """Suppress default request logging; print custom logs instead."""
        if isinstance(args[0], str) and "GET" in args[0]:
            return  # Suppress GET logs to keep output clean
        print(f"[{self.__class__.__name__}] {format % args}")


def run_server(host="127.0.0.1", port=3000):
    """Start the ShopScript server."""
    os.chdir(Path(__file__).parent)  # Ensure we serve from the demo directory

    server_address = (host, port)
    httpd = HTTPServer(server_address, ShopScriptHandler)

    print("\n" + "=" * 60)
    print("ShopScript Server")
    print("=" * 60)
    print(f"Open http://{host}:{port} in your browser")
    print(f"API endpoint: POST http://{host}:{port}/api/generate")
    print("Press Ctrl+C to stop")
    print("=" * 60 + "\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        httpd.shutdown()


if __name__ == "__main__":
    run_server()
