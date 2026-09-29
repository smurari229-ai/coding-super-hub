# Coding Super Hub 🚀 (Pro Developer Suite 2026)

> **A privacy-aware developer toolbox with 535 registered catalog entries, verified dedicated tools, an honest generic engine, live sandboxes, AI Copilot, and built-in monetization.**

[![React 19](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ What Makes Coding Super Hub Different?

1. **535 Registered Catalog Entries**: Categorized across 8 departments (Text & Strings, Crypto & Security, Web & Frontend, Data & Formats, DevOps & Network, Math & Algorithms, Code Snippets & Sandbox, Productivity).
2. **Privacy-aware local tooling**: Many deterministic utilities (such as hashing, JWT decoding, JSON formatting, and regex work) run locally in the browser. AI Copilot is different: code/prompts submitted to it are sent to the configured server-side Gemini provider for inference.
3. **AI Copilot**: Server-protected Google Gemini 2.5 Flash integration for code explanations, bug fixing, test generation, optimization, and TypeScript conversion. Other model providers are not currently implemented.
4. **Live Code Sandbox**: Real-time multi-tab HTML/CSS/JS execution engine with sandboxed `<iframe>` isolation, device viewport toggles (desktop/mobile), and real-time console log interceptor.
5. **Built-in Monetization Stack**: Non-intrusive developer ads, curated affiliate resource center (DigitalOcean, Supabase, Cursor, Railway, etc.), Stripe / Lemon Squeezy-ready Pro upgrade modal, and creator tip jar.

---

## 📂 Project Architecture

```
/
├── src/
│   ├── types/
│   │   └── tools.ts             # TypeScript definitions for tools, categories, and affiliates
│   ├── data/
│   │   ├── tools-catalog.ts     # Central metadata catalog containing all 535 tools
│   │   └── affiliates.ts        # Curated developer affiliate deals & promotional vouchers
│   ├── components/
│   │   ├── Navbar.tsx           # Global header with Search trigger, Pro CTA, and theme toggle
│   │   ├── Sidebar.tsx          # 8 Category filters, Starred favorites, and history
│   │   ├── SearchModal.tsx      # Command-K (⌘K) spotlight fuzzy search with keyboard navigation
│   │   ├── KeyboardShortcutsModal.tsx  # Interactive '?' keyboard cheatsheet
│   │   ├── Monetization/
│   │   │   ├── AdBanner.tsx     # Developer contextual ad slot (Carbon/BuySellAds style)
│   │   │   ├── AffiliateHubModal.tsx   # Verified dev deals ($200 credits, discounts)
│   │   │   ├── ProUpgradeModal.tsx     # Freemium $9/mo or $79 lifetime checkout
│   │   │   ├── SponsorModal.tsx        # Buy Me a Coffee, GitHub Sponsors & UPI tip jar
│   │   │   └── TransparencyModal.tsx   # Monetization transparency & privacy commitment
│   │   └── tools/
│   │       ├── JsonFormatterTool.tsx      # Pretty-print, minify, validate, sort keys
│   │       ├── Base64ConverterTool.tsx    # Base64, URL, HTML entities, Hex, Binary
│   │       ├── CaseConverterTool.tsx      # camelCase, snake_case, kebab-case, slug
│   │       ├── UuidGeneratorTool.tsx      # UUID v4, UUID v7, NanoID bulk generator
│   │       ├── HashCryptoTool.tsx         # SHA-256, SHA-512, SHA-1, MD5, HMAC
│   │       ├── RegexTesterTool.tsx        # Live regex matching, capture groups, presets
│   │       ├── TextDiffTool.tsx           # Side-by-side & unified diff comparator
│   │       ├── JwtDecoderTool.tsx         # JWT claims, header, and expiry status
│   │       ├── MarkdownEditorTool.tsx     # Live Markdown editor + rendered HTML preview
│   │       ├── ColorPaletteTool.tsx       # HEX/RGB/HSL, Tailwind shades, WCAG contrast
│   │       ├── CssShadowGeneratorTool.tsx # Layered CSS Box-Shadow designer
│   │       ├── HtmlMetaGeneratorTool.tsx  # SEO Meta tags & live Twitter social preview
│   │       ├── DataConverterTool.tsx      # JSON ↔ CSV, JSON ↔ YAML, SQL INSERT generator
│   │       ├── TimestampConverterTool.tsx # Unix Epoch clock & ISO-8601 converter
│   │       ├── QrCodeGeneratorTool.tsx    # High-res downloadable QR code generator
│   │       ├── HttpStatusExplorerTool.tsx # 1xx to 5xx HTTP codes with RFC definitions
│   │       ├── GitIgnoreGeneratorTool.tsx # Multi-stack .gitignore & Dockerfile builder
│   │       ├── DevCalculatorsTool.tsx     # Percentages, units, GCD/LCM, prime checks
│   │       ├── CodePlaygroundTool.tsx     # Live HTML/CSS/JS sandbox with console output
│   │       ├── AiCopilotTool.tsx          # Gemini server-protected AI bug fixer and refactorer
│   │       └── GenericToolRunner.tsx      # Universal runner engine for tools without dedicated components
│   ├── App.tsx                  # Master application orchestrator
│   ├── main.tsx                 # React DOM entry point
│   └── index.css                # Tailwind CSS v4 entry point
├── index.html                   # HTML5 shell with optimized meta tags
├── package.json                 # Dependencies and npm build scripts
└── vite.config.ts               # Vite configuration
```

---

## 🧪 Verification

`npm run lint` checks TypeScript. `npm test` runs the pure engine suite with Vitest 5. `npm run build` performs the production Vite build. CI runs all three checks on pushes and pull requests.

### Minimal release smoke checklist
- [ ] Open 5 dedicated UI tools and verify their primary action.
- [ ] Open 5 generic engine tools and verify non-empty useful output.
- [ ] Open Playground and execute HTML/CSS/JS locally in its sandbox.
- [ ] Open AI Copilot with `GEMINI_API_KEY` configured and verify the server route responds.
- [ ] Open Pro modal and verify checkout/verification configuration without exposing secrets.

## 🔧 Current tool coverage

The catalog contains **535 registered entries**. The current repository has **48 catalog entries mapped to dedicated React tool components**. Those dedicated entries are the verified baseline for the release audit.

The generic engine now contains the prior audited handler surface plus **117 new explicit tool-ID handlers** added in the latest high-ROI pass. These are implementation-level routes, not blanket semantic PASS results. A current source-level routing heuristic estimates about **207 catalog entries** still lack a matched execution route; those entries remain explicitly Coming soon until semantic execution evidence exists.

Unsupported catalog entries never echo input as if processing succeeded. They return an explicit **“Coming soon — this catalog entry does not have a verified execution algorithm yet.”** message.

Therefore, this README does **not** claim that all 535 tools are production-grade.

## 🛠️ How to Add a New Tool in 30 Seconds

All tools are completely **data-driven**. To add a new utility, simply add an entry to `src/data/tools-catalog.ts`:

```typescript
t('my-custom-tool', 'CSS Gradient Animator', 'web-frontend', 'Generate smooth continuous CSS gradient animations', ['css', 'gradient', 'animation'], {
  isPopular: true,
  actionType: 'generate',
  defaultInput: 'linear-gradient(45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)'
})
```

If the tool needs a custom UI, specify `dedicatedComponent: 'MyCustomTool'` and export it in `src/components/tools/`.

---

## 🚀 1-Click Deployment (Vercel & Netlify)

### Deploy to Vercel:
```bash
npm install -g vercel
vercel
```

### Deploy to GitHub Pages:
```bash
npm run build
# The optimized static assets in dist/ can be served by any static host or CDN.
```

---

## 💰 Monetization Setup Checklist for the Creator

1. **Affiliate URLs**:
   - Configure only approved referral URLs through environment/configuration. Do not publish placeholders as verified links.
2. **Stripe / Lemon Squeezy (Pro Membership)**:
   - Configure provider secrets and product/checkout identifiers through Vercel environment variables. Never commit secret keys.
3. **Sponsor links**:
   - Configure sponsor URL/UPI values through environment variables. The repository does not hardcode personal payment handles.
4. **Contextual Developer Ads**:
   - Configure an approved ad provider only after its account/placement is actually available. Do not claim ad revenue or provider approval before verification.

---

## 📜 Catalog Breakdown — 535 Registered Entries

* **Text & String (85 Tools)**: JSON/YAML/XML/TOML formatters, Base64/URL/Hex/Binary/HTML converters, Case converters, Regex debugger, Diff checker, UUID/NanoID generator, Slugifier, Word frequency, Text statistics, Cron builder, and more.
* **Crypto & Security (64 Tools)**: SHA-256, SHA-512, MD5, HMAC, Password entropy meter, CSP generator, CORS header builder, X.509 PEM decoder, TOTP 2FA calculator, Chmod calculator, and SSRF guard.
* **Web & Frontend (102 Tools)**: Color palette generator, WCAG AA/AAA contrast checker, CSS Box Shadow & Gradient designer, Flexbox/Grid playgrounds, Glassmorphism generator, Fluid Typography (clamp) calculator, HTML Meta/OG generator, SVG tools, and responsive viewport tester.
* **Data & Formats (55 Tools)**: JSON ↔ CSV, CSV ↔ JSON, JSON ↔ YAML, SQL query formatter & INSERT generator, Unix Epoch converter, Number Base (Bin/Oct/Dec/Hex), MongoDB ObjectId generator, and GeoJSON validator.
* **DevOps & Network (75 Tools)**: Complete HTTP status explorer, Multi-stack .gitignore builder, Dockerfile generator, Docker Compose builder, Nginx server block builder, cURL-to-Fetch converter, Subnet CIDR calculator, and Linux/Git cheatsheets.
* **Math & Calculators (55 Tools)**: 4-type percentage calculator, Unit converters (Length, Weight, Temp, Bytes), GCD/LCM, Factorials, Fibonacci, Prime number checker, and Bitwise operation visualizer.
* **Code Snippets & Sandbox (45 Tools)**: Live HTML/CSS/JS Sandbox with real-time iframe execution, AI Code Copilot (Gemini; other model providers are not currently implemented), React custom hooks library, debounce/throttle, and async retry utilities.
* **Productivity & Misc (54 Tools)**: High-resolution QR code generator with SVG/PNG download, Developer scratchpad, GitHub README badge builder, open-source license selector, and production launch checklist.

---

© 2026 Coding Super Hub.
