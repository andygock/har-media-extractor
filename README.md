# HAR Media Extractor

A minimalistic Vite + React + TypeScript app to extract and download all media (png, jpg, webp, svg, etc.) from a HAR file.

## Features

- Drag and drop a `.har` file
- Extracts and displays all media found in the HAR
- Download all media as a zip file

## Usage

I use [`pnpm`](https://pnpm.io/) for package management for this project, but you may use `npm`, `yarn`, etc instead if you prefer, but commands may differ slightly.

1. Start the dev server:

   ```sh
   pnpm install
   pnpm run dev
   ```

2. Open [http://localhost:5173](http://localhost:5173)
3. Drag and drop your HAR file into the app

## License

MIT
