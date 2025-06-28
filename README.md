# ViStruct

A visualization structure analysis tool combining Next.js frontend with OpenCV-powered FastAPI backend.

## 📋 Overview

ViStruct is a visualization tool that connects with a FastAPI backend server for processing and analyzing visual data. The client provides an interactive interface for users to work with visualization structures.



## 🎬 Video Demo

Watch ViStruct in action:

   <p align="center">
     <video width="700" controls>
       <source src="assets/vistruct-video-demo.mp4" type="video/mp4">
     </video>
   </p>

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

## 📊 Evaluations

ViStruct has undergone rigorous evaluation to ensure its effectiveness and usability:

### Expert Evaluation

Twenty visualization experts evaluated ViStruct to assess its:
- Visualization decomposition accuracy
- Semantic region identification
- Visual attention cues effectiveness
- Feature comprehensiveness

The expert evaluation data and findings are available in the `evaluations/expert-review.zip` folder.

### Performance Evaluation

A comprehensive performance evaluation was conducted involving:
- 45 distinct visualization tasks
- 5 trials per task

This evaluation measured ViStruct's effectiveness across diverse visualization scenarios from VLAT and Mini-VLAT. The complete performance evaluation data can be found in the `evaluations/performance_evaluation.zip` folder.


