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
