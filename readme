# ViStruct Client

This is the frontend client for the ViStruct project, built using [Next.js](https://nextjs.org).

## 📋 Overview

ViStruct is a visualization tool that connects with a FastAPI backend server for processing and analyzing visual data. The client provides an interactive interface for users to work with visualization structures.

## 🔧 System Requirements

- Node.js version 20.0 or higher
- npm version 25.0 or higher

## 🚀 Getting Started

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the client folder with:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

Start the development server:

```bash
npm run dev
```

This uses turbopack for faster development builds. The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## 🔄 Connecting to the Backend

The client communicates with a FastAPI server. To run the full stack:

```bash
cd ../server
```

1. Start the backend server first (from the server directory):
   ```bash
   uvicorn main:app --reload
   ```
   
2. Then start the frontend client (from the client directory):
   ```bash
   npm run dev
   ```

## 🧩 Key Features

- Integration with Google Generative AI
- Monaco Editor for code visualization
- Axios for API communication with backend
- HTML to canvas conversion for visualization capturing
- Icon-rich interface with React Icons
- Screenshot capture and processing with html2canvas
- Communication with OpenCV-powered backend for visualization analysis

## 🌐 Deployment

- **Server:** [https://server-silent-dew-747-fast-api.fly.dev](https://server-silent-dew-747-fast-api.fly.dev)
- **Client:** [https://vi-struct-prkmwfhrd-hive-labs-projects.vercel.app/](https://vi-struct-prkmwfhrd-hive-labs-projects.vercel.app/)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [React Documentation](https://react.dev) - learn about React

## 📝 Notes for Developers

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font).

## 📊 Visualization Processing

The ViStruct client works with the server's OpenCV-based visualization analysis system:

1. **Screenshot Capture**: The client can capture screenshots of visualizations using html2canvas
2. **Image Analysis**: Captured images are sent to the backend server where OpenCV processes them
3. **Component Detection**: The system detects visualization components like:
   - Chart axes, titles, and legends
   - Bar charts, scatter plots, and bubble charts
   - Treemap labels and components
   - Pie chart slices and other visualization elements
4. **Interactive Mapping**: Users can map detected regions to meaningful data entities
5. **Structure Analysis**: The system provides structural analysis of visualizations

This allows users to analyze, understand, and work with various visualization structures directly in the browser.
