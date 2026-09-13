# Lumina Scholar Portfolio

A personal academic portfolio website built with React, TypeScript, and Vite.

## Prerequisites

- Node.js (v18 or later recommended)
- npm (comes with Node.js)

## Getting Started

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Start the development server:**

    ```bash
    npm run dev
    ```

    Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Building for Production

To create a production build:

```bash
npm run build
```

The built artifacts will be in the `dist` directory.

## Content

Site content (publications, talks, projects, academic experience, awards, books, software, news) lives in `data/content.json` and is edited through a local admin console that ships with the repo:

```bash
npm run admin     # 打开 http://127.0.0.1:4399/
```

The console edits the JSON, validates it before writing, keeps timestamped snapshots for rollback, and can commit + push for you. It also pulls publications from **ORCID**, imports **BibTeX**, and syncs **Google Scholar** citation counts.

See [docs/content-management.md](docs/content-management.md) for the full workflow. Google Scholar citations are additionally refreshed daily by [`.github/workflows/update-citations.yml`](.github/workflows/update-citations.yml) into `data/scholar.json`.

## Previewing Production Build

To preview the production build locally:

```bash
npm run preview
```

## Deployment

This project is configured to deploy to GitHub Pages automatically using GitHub Actions.

1.  Push your changes to the `main` branch.
2.  The "Deploy to GitHub Pages" workflow will run automatically.
3.  Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Troubleshooting

### Failed to load module script ... MIME type of "application/octet-stream"

If you see this error, it means you are likely trying to open `index.html` directly in your browser or using a server that doesn't support the project's structure.

**Solution:** Always use `npm run dev` for local development or `npm run preview` to test the production build.
