# My Stuff AI

A local-first home inventory application. Users upload room photos, review AI-detected objects, edit their details and estimated values, save cropped inventory images in IndexedDB, and browse the resulting collection.

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

Copy `.env.example` to `.env.local` and add a Google AI Studio Gemini API key when configuring AI detection. Gemini returns object metadata, confidence, estimated value, and normalized bounding boxes. The app validates and normalizes common response variations before opening the review modal.

Gemini is called directly from the browser for this local prototype. Do not use this direct-key mode for a public deployment without adding a server-side proxy. Google AI Studio's free tier is rate-limited, and you should review Google's data-use settings before sending private home photos.

Each upload is processed independently. Saving the same photo more than once currently creates duplicate inventory records; duplicate detection is not implemented.

## Architecture

- `src/types`: stable inventory and detection contracts
- `src/components`: layout, inventory controls, feedback, and detection review UI
- `src/lib/db`: IndexedDB persistence boundary
- `src/lib/ai`: Gemini provider and response validation
- `src/lib/images`: bounding-box crop utilities
- `src/lib/filtering`: pure search, filter, and sort logic
- `src/hooks`: stateful application services
- `src/app`: composition and application UI
- `tests`: unit and component test suites

## Current Scope

Implemented: Gemini image analysis, staged analysis progress, modal detection review, editable names/categories/tags/descriptions/estimated values, remove/restore before saving, cropped Blob thumbnails, IndexedDB persistence, search, sorting, category filtering, tag filtering, grid/list views, inventory statistics, and entire-inventory PDF export with preview/download options.

Planned: manual object addition, richer image interaction, filtered PDF export, screenshots to README, hosting.