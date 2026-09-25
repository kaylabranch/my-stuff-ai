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

## App Details

Features include:

- Gemini image analysis, detection, and cropping
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
