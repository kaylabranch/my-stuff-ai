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

Copy `.env.example` to `.env.local` when configuring AI detection. The current scaffold uses a local IndexedDB repository and a mocked-free empty inventory shell; upload detection, item editing, and PDF export are the next feature slices.

## Architecture

- `src/types`: stable inventory and detection contracts
- `src/lib/db`: IndexedDB persistence boundary
- `src/lib/filtering`: pure search, filter, and sort logic
- `src/hooks`: stateful application services
- `src/app`: composition and application UI
- `tests`: unit and component test suites