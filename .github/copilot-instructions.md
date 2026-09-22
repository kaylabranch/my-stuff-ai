# Copilot Instructions — My Stuff AI

## Project Overview
My Stuff AI is a personal home-inventory application. Users upload photos of
rooms or spaces; AI vision analyzes each photo, detects individual objects,
and lets the user review, edit, and save them as inventory items. The app
then provides search, filtering, sorting, stats, and a polished PDF export
of the resulting inventory.

This file gives Copilot the functional, technical, and process requirements
to follow when generating or modifying code for this project. Treat it as
the source of truth for expected behavior — implementation details can
evolve, but the requirements below should still hold.

---

## Tech Stack
- **Frontend:** Modern React (function components + hooks only — no class
  components), TypeScript.
- **Storage:** browser IndexedDB (local-first, per-device persistence, no
  user accounts, no server-side storage of items or photos).
- **AI vision:** Google Gemini API via Google AI Studio (image input) for object
  identification/categorization/description.
- **PDF export:** client-side PDF generation (e.g. jsPDF).
- **Testing:** Vitest + React Testing Library for unit/component tests.
- **Fonts:** Playfair Display (headings) + DM Sans (body) via Google Fonts.

---

## Data Model

### Item record
| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique, e.g. `item_<timestamp>_<random>` |
| `name` | string | Editable, required |
| `category` | string | One of the fixed category list (below) |
| `description` | string | Optional, 1-sentence AI-generated or user-edited |
| `tags` | string[] | Free-form, comma-separated in UI |
| `imageBlob` | Blob | Cropped thumbnail image, stored natively in IndexedDB (not a base64 data URL — avoids ~33% size overhead and keeps React state light) |
| `estimatedValue` | number | Optional, defaults to 0 |
| `createdAt` | number (timestamp) | Set on save, used for sorting |

- Display images via `URL.createObjectURL(item.imageBlob)`; revoke object
  URLs on unmount/list changes to avoid memory leaks.

### Fixed category list
Furniture, Electronics, Appliances, Decor, Lighting, Clothing,
Books & Media, Kitchenware, Tools, Sports, Art, Plants, Toys, Storage, Other

---

## AI Vision
- A single Gemini vision call returns name, category, description, tags,
  confidence, and bounding box for each detected object — no separate
  localization/detection service.
- Bounding-box coordinates from the vision model are an approximation, not
  a precise detection — code that crops thumbnails from bboxes must
  tolerate imprecise/loose boxes (apply padding, and fall back to the full
  image if a crop looks degenerate, e.g. near-zero width/height).
- Never assume the vision API response is well-formed JSON — validate/
  extract before parsing, and fail into a visible error state, not a
  silent crash.
- Keep the detection schema (name, category, description, suggestedTags,
  confidence, bbox) stable — the crop, review, and save logic all depend
  on that exact shape.

---

## Functional Requirements

### 1. Photo Upload
- Support drag-and-drop **and** click-to-browse file selection.
- Accept image types (JPG, PNG, HEIC); reject non-image files with a
  user-visible message.
- Support multiple file selection, but process uploads one photo at a time
  through the detection flow.

### 2. AI Object Detection
- Request `name`, `category` (constrained to the fixed list),
  `description`, `suggestedTags`, `confidence` (0–1), and a normalized
  `bbox` (`x`, `y`, `w`, `h` in 0.0–1.0) for every detected object.
- Detect sets of object as one object, for instance a set of chairs as a 'set' not individual chairs
- Ensure that overlapping or partially occluded objects are still detected accurately.
- Ensure that small or partially visible objects are not ignored by the detection model.
- Handle cases where objects are partially outside the image boundaries gracefully.
- Ensure that the detection model can handle a variety of lighting conditions and image qualities.
- Handle and surface API errors clearly (missing key, network failure,
  malformed response) without crashing the review flow.

### 3. Detection Review (pre-save)
- Show the uploaded photo alongside a list of detected items.
- Generate a cropped thumbnail Blob from the source image using each
  item's `bbox` (with small padding), rendered client-side.
- Every detected item must be editable before saving: name, category
  (dropdown), tags, description/note, estimated value.
- Each item can be individually removed/excluded from the save (and
  restored) without discarding the rest of the batch.
- Display the AI's confidence score per item.
- Saving is blocked until detection completes; saving with zero eligible
  items should be prevented with feedback to the user.
- Show progress feedback while analysis and while saving are in progress.
- Allow user to click on an object in the photo that was detected to highlight and edit its details in the review panel.
- Allow user to click on an object in the photo that was NOT detected to add it to this list. This should trigger a prompt to enter the necessary details for the new item.

### 4. Inventory Storage
- Persist saved items (including image Blobs) in IndexedDB so the
  inventory survives a page reload.
- Support create, read, update, delete for individual items.

### 5. Inventory Browsing
- **Search:** free-text match against name, description, and tags.
- **Sort:** newest first, oldest first, name A→Z, name Z→A, by category,
  value high→low, value low→high.
- **Category filter:** single-select dropdown, populated dynamically from
  items actually in the inventory.
- **Tag filters:** multi-select chips, populated dynamically; selecting
  multiple tags narrows results to items containing **all** selected tags
  (AND logic).
- **View modes:** grid view and list view, user-toggleable.
- Filters, search, and sort must all combine correctly (AND semantics).
- Provide an explicit empty state for (a) no items yet and (b) no items
  matching current filters — these should read differently.

### 6. Item Detail & Editing
- Selecting an item opens a detail view showing image, name, category,
  description, tags, estimated value, and date added.
- All editable fields must be saveable individually and deletable, each
  with user feedback (e.g., toast/confirmation).
- Deleting an item should ask for confirmation before removing it.

### 7. Stats
- Show running totals: total item count, distinct category count, distinct
  tag count, and total estimated value.
- Estimated value stat must reflect the **currently filtered view** when a
  filter/search is active, and be labeled to make that clear.

### 8. PDF Export
- Let the user choose export scope: current filtered view vs. entire
  inventory (each labeled with an item count).
- Let the user toggle what's included: summary/category totals, item
  photos, estimated values, tags.
- Let the user set a custom report title.
- Generated report should include a summary section, per-category
  breakdown table (if enabled), per-item listing per include settings, and
  page numbers.
- Show the PDF in-app with an explicit download action — don't force an
  immediate silent download.
- Handle export failures gracefully with a visible error message.

---

## Non-Functional Requirements
- **Local-first / offline-friendly:** browsing, editing, and deleting
  existing inventory items should not require network access; only AI
  detection needs it.
- **Responsive UI:** usable at common desktop widths.
- **Resilience:** a failed image render should fall back to a placeholder
  rather than a broken image icon; always revoke stale object URLs.
- **No data loss on partial failure:** if saving a batch of detected items
  partially fails, already-saved items should remain saved.
- **Feedback for every async action:** uploads, AI analysis, saving,
  deleting, and exporting should all show loading and success/error
  states — never a silent hang.

---

## General Coding Guidelines

### Principles
- **Simplicity:** write code that is easy to read, understand, and
  maintain. Avoid unnecessary complexity.
- **Modularity:** organize code into small, reusable units — e.g. separate
  the IndexedDB layer, the AI-detection layer, and UI components so any
  one of them (storage engine, vision provider) can be swapped without
  rewriting the others.
- **Single Responsibility:** each component, hook, or function should have
  one clear purpose. Keep data-fetching/storage logic out of presentational
  components — use custom hooks (e.g. `useInventory`, `useDetection`) to
  separate concerns.
- **Consistency:** follow consistent naming, formatting, and structure
  across the codebase.
- **Readability:** prioritize clarity over cleverness.
- **Modern Practices:** use modern React (function components, hooks,
  concurrent-safe patterns) and current TypeScript idioms — avoid
  deprecated APIs or patterns.

### Language and Framework
- TypeScript throughout; avoid `any` — type the item model, detection
  response schema, and IndexedDB layer explicitly.
- Use the latest stable React and TypeScript conventions (hooks, not
  lifecycle classes; function components only).

### Naming Conventions
- Use descriptive, meaningful names for variables, functions, components,
  and types.
- Avoid abbreviations or single-letter names unless universally understood
  in context.
- camelCase for variables/functions, PascalCase for components/
  types/interfaces, UPPER_CASE for constants (e.g. `CATEGORIES`).

### Code Reuse and Utilities
- Prefer existing functions/hooks over writing new ones with overlapping
  behavior.
- Avoid duplicating logic — factor repeated code (e.g. IndexedDB CRUD,
  bbox cropping, category-color mapping) into shared utilities/hooks.
- Document utility functions and hooks with their purpose and expected
  inputs/outputs.
- Check existing files/components before adding new functionality that
  might already exist; reuse or extend rather than duplicate.

---

## Documentation
- **README:** must be kept current as features are added or changed —
  setup instructions, environment variables (e.g. Gemini API key),
  available scripts, and a summary of app features.
- **This file (`copilot-instructions.md`):** must be updated alongside the
  README whenever requirements, data model, or architecture change, so
  Copilot's guidance never drifts from the actual app behavior.

## Testing
- Write unit tests for all new features and bug fixes.
- Cover edge cases and failure scenarios specific to this app, at minimum:
  - Malformed/unexpected AI detection responses.
  - Bounding boxes at or near the image edges, zero-size, or missing.
  - Filter/search/sort combinations, including empty-result states.
  - IndexedDB read/write/delete, including failure handling.
  - PDF export with each include-option combination (images on/off,
    values on/off, etc.).
- Use Vitest + React Testing Library consistently; keep tests readable and
  maintainable, not just passing.
- When modifying existing code, update or add tests in the same change so
  they never fall out of sync with behavior — treat stale tests as a bug.

---

## Explicit Non-Goals (for now)
- No user accounts / multi-device sync — inventory is per-device/local.
- No server-side storage of uploaded photos or item data.
- No editing of the AI-generated bounding boxes themselves (only the
  resulting item fields).