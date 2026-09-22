# My Stuff AI

A local-first home inventory application. Users will upload room photos, review AI-detected objects, save inventory items in IndexedDB, and export polished PDF reports.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
npm run build
```

Copy `.env.example` to `.env.local` and add a Google AI Studio Gemini API key when configuring AI detection. The current scaffold uses a local IndexedDB repository and validates Gemini's multimodal JSON response; detection review, item editing, and PDF export are the next feature slices.

Gemini is called directly from the browser for this local prototype. Do not use this direct-key mode for a public deployment without adding a server-side proxy. Google AI Studio's free tier is rate-limited, and you should review Google's data-use settings before sending private home photos.

## Architecture

- `src/types`: stable inventory and detection contracts
- `src/lib/db`: IndexedDB persistence boundary
- `src/lib/filtering`: pure search, filter, and sort logic
- `src/hooks`: stateful application services
- `src/app`: composition and application UI
- `tests`: unit and component test suites