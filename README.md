# My Stuff AI

A home inventory application built in React. Users upload room photos, review AI-detected objects, edit their details and estimated values, save cropped inventory images in IndexedDB, and browse the resulting collection.

[Test it out live!](https://my-stuff-ai.netlify.app/) - hosted on Netlify

<img width="1891" height="944" alt="my-stuff-ai screenshot 1" src="https://github.com/user-attachments/assets/fd5811a3-23d0-4861-8fbc-e72064d4ebd9" />

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

## AI analysis

The AI returns object metadata, confidence, estimated value, and normalized bounding boxes. The app validates and normalizes common response variations before opening the review modal. At most 20 items are detected per photo (`MAX_DETECTED_ITEMS` in `src/lib/ai/detectionPrompt.ts`); any extras in a response are dropped.

The browser never sees the API key. It posts the image to a Netlify Function (`netlify/functions/analyze.mts`), which calls the AI provider (currently Google Gemini), validates the result, and returns the detected items.

- **Netlify:** set `GEMINI_API_KEY` in the site's environment variables, without a `VITE_` prefix. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`.
- **Local:** create `.env.local` containing `GEMINI_API_KEY=...` (optionally `GEMINI_MODEL=...`) and run `npm run dev`. A Vite dev middleware serves the function and reads the key from that file; restart after editing it.

Google AI Studio's free tier is rate-limited, and you should review Google's data-use settings before sending private home photos.

Each upload is processed independently. Saving the same photo more than once currently creates duplicate inventory records; duplicate detection is not implemented.

After detection, every item is cropped once from its bounding box (with padding) into a JPEG thumbnail that preserves the crop's aspect ratio and fits within 320px. The review modal shows those thumbnails and saving reuses them, falling back to the original photo if a crop failed.

## Architecture

- `src/types`: stable inventory and detection contracts
- `src/components`: layout, inventory controls, feedback, and detection review UI
- `src/lib/db`: IndexedDB persistence boundary
- `src/lib/ai`: provider-neutral detection contract (prompt, JSON schema, `VisionProvider` interface, response validation, error messages) and the browser client `analyzeImage`
- `netlify/functions`: `analyze.mts` selects a provider and returns validated items; `providers/gemini.ts` holds everything Gemini-specific (add a new file here to support another provider)
- `src/lib/images`: bounding-box crop utilities (aspect-preserving thumbnails, single image decode)
- `src/lib/filtering`: pure search, filter, and sort logic
- `src/hooks`: stateful application services
- `src/app`: composition and application UI
- `tests`: Vitest + React Testing Library unit and component tests, covering the AI contract, Gemini adapter, Netlify function, browser client, cropping, review modal, save flow, filtering, IndexedDB, and PDF export
- `public`: static assets (favicon)

## App Details

Features include:

- AI image analysis, detection, and cropping
- Item detection review
- Optional room labeling per upload (auto-suggested from existing rooms, added as a tag on every item in that room)
- Editable names/categories/rooms/tags/descriptions/estimated values
- IndexedDB persistence
- Search, sorting, category filtering, room filtering, tag filtering
- Grid/list views
- Inventory statistics, including room count
- My favorite: Configurable PDF export!

<img width="1891" height="943" alt="my-stuff-ai screenshot 2" src="https://github.com/user-attachments/assets/6d45d3a6-8b96-4795-a748-c193cae3c060" />
<img width="1880" height="922" alt="my-stuff-ai screenshot 3" src="https://github.com/user-attachments/assets/95c815cc-2039-4a5f-a10b-c84113b93109" />
<img width="1861" height="922" alt="my-stuff-ai screenshot 4" src="https://github.com/user-attachments/assets/def82153-829f-4c70-a347-af2fa8506e81" />
<img width="1880" height="944" alt="my-stuff-ai screenshot 5" src="https://github.com/user-attachments/assets/464a883f-58a7-4a27-908e-104924e3f8a7" />
<img width="1890" height="937" alt="my-stuff-ai screenshot 6" src="https://github.com/user-attachments/assets/25ab3ce7-71c2-4152-b60c-97d9a1fa9949" />
<img width="1889" height="942" alt="my-stuff-ai screenshot 7" src="https://github.com/user-attachments/assets/c838bf65-3530-43b8-95e3-57e8ec5676dc" />
<img width="1894" height="941" alt="my-stuff-ai screenshot 8" src="https://github.com/user-attachments/assets/dc78b43d-81c9-4616-b7ed-1dd16cafe28c" />
<img width="1914" height="952" alt="my-stuff-ai screenshot 9" src="https://github.com/user-attachments/assets/56380176-8a44-4680-b3c1-95326954a9c7" />
