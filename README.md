# Brahmi Character Recognizer

A static web client for AI-powered recognition of Early Brahmi inscriptions. Built as a research frontend for the University of Peradeniya (Grant No. MRG_06_2025).

The recognition model is hosted separately. This repository is **frontend only** and talks to that API after build; the deployed site is a static GitHub Pages app.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS
- Framer Motion (subtle fade-in and hover motion)

## Getting started

```bash
npm install
npm run dev
```

The Vite `base` path is `/brahmi-recognizer/` (GitHub Pages project site). In development the app is served at `http://localhost:5173/brahmi-recognizer/`.

## Images

Place the following files in `src/assets/images/` (the filenames are required):

| File | Use |
| --- | --- |
| `uop_logo.png` | Header logo |
| `supervisor_maheshi.png` | Prof. Maheshi B. Dissanayake |
| `developer_anna.png` | Anna Kurera |
| `developer_namidu.png` | Namidu S. Wickamanayaka |

Tiny placeholders exist so the project builds; replace them with the real photographs.

The site title is the carved-stone image `title_stone_{800,1200,1664}.webp` in the same folder (three widths, so phones download the small one). To change it, export new WebP files at those widths with the same names.

## Supported letters

The letters shown above the upload field live in `src/components/SupportedLetters.tsx`. To add one:

1. Put its sample image in `src/assets/letters/`, named after the label the model returns (e.g. `ja.webp`). WebP, PNG and JPEG all work; WebP keeps the page light.
2. Add a line such as `{ name: 'ja', sinhala: 'ජ' }` to `SUPPORTED_LETTERS`, in alphabet order.

The image is matched to the letter by file name, so nothing else needs importing.

## API configuration

Edit `src/config.ts`:

```ts
export const API_URL = "https://your-api-endpoint-here.com/predict";
export const API_PAYLOAD: "multipart" | "json" = "multipart";
export const API_IMAGE_FIELD = "image";
```

- **multipart** — `FormData` with the image field (default)
- **json** — JSON body `{ "image": "<base64 data URL>" }`

`parsePredictions()` normalizes common response shapes, including:

```json
{
  "predictions": [
    { "label": "ka", "confidence": 0.95 },
    { "label": "ma", "confidence": 0.03 }
  ]
}
```

Confidence values may be `0–1` or `0–100`. Alternate keys such as `class`, `score`, or `probability` are accepted.

Images are downscaled client-side to a maximum edge of 1024px before upload.

If the live API uses a different envelope, adjust `parsePredictions` only — the rest of the UI reads a `{ label, confidence }[]`.

**CORS:** the model host must allow requests from `https://<you>.github.io`.

## GitHub Pages

1. Create a repository named `brahmi-recognizer`.
2. Set `API_URL` in `src/config.ts`.
3. Push the project, then either:

```bash
npm run deploy
```

or enable GitHub Pages from the `gh-pages` branch (created by that script).

If the repository name is not `brahmi-recognizer`, change `base` in `vite.config.ts` to `/<repo-name>/`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run deploy` | Build and publish to GitHub Pages |

## Project structure

```
brahmi-recognizer/
├── public/
├── src/
│   ├── assets/images/
│   ├── components/
│   ├── App.tsx
│   ├── main.tsx
│   ├── config.ts
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```
