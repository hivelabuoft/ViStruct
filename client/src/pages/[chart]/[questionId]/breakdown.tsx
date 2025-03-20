import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaPlay } from "react-icons/fa";
import axios from "axios";
import styles from "../../../styles/Breakdown.module.css";
import AnnotateImage from "@/src/components/annoatedImage";

interface ChartDescription {
  chartType: string;
  description: any;
}

interface BreakdownPageProps {
  chartDescription: ChartDescription;
}


const API_URL = process.env.NEXT_PUBLIC_API_URL;

const simulatedChartTaxonomy = {
  "100stackedbar": {
    "visualizationType": "chart",
    "graphicSymbol": "surface",
    "shape": "rectangular"
  },
  "bar": {
    "visualizationType": "chart",
    "graphicSymbol": "surface",
    "shape": "rectangular"
  },
  "stackedBar": {
    "visualizationType": "chart",
    "graphicSymbol": "surface",
    "shape": "rectangular"
  },
  "histogram": {
    "visualizationType": "chart",
    "graphicSymbol": "surface",
    "shape": "rectangular"
  },
  "line": {
    "visualizationType": "chart",
    "graphicSymbol": "line",
    "shape": "line"
  },
  "area": {
    "visualizationType": "chart",
    "graphicSymbol": "area",
    "shape": "vary"
  },
  "stackedArea": {
    "visualizationType": "chart",
    "graphicSymbol": "area",
    "shape": "vary"
  },
  "scatter": {
    "visualizationType": "chart",
    "graphicSymbol": "point",
    "shape": "circle"
  },
  "bubble": {
    "visualizationType": "chart",
    "graphicSymbol": "area",
    "shape": "circle"
  },
  "treemap": {
    "visualizationType": "chart",
    "graphicSymbol": "area",
    "shape": "rectangular"
  },
  "pie": {
    "visualizationType": "chart",
    "graphicSymbol": "area",
    "shape": "sector"
  },
  "map": {
    "visualizationType": "map",
    "graphicSymbol": "area",
    "shape": "vary"
  }
};

export default function BreakdownPage({ chartDescription }: BreakdownPageProps) {
  const router = useRouter();
  const { chart, questionId } = router.query;
  const [analysisOutput, setAnalysisOutput] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [localChart, setLocalChart] = useState<string | null>(null);
  const [localQuestionId, setLocalQuestionId] = useState<string | null>(null);  
  const [hasStop, setHasStop] = useState<boolean>(true);

  useEffect(() => {
    if (router.isReady) {
      setLocalChart(chart as string);
      setLocalQuestionId(questionId as string);
    }
  }, [router.isReady, chart, questionId]);
  

  // Construct dynamic API path from chart taxonomy
  const getAPIEndpointForChart = (chartName: string): string => {
    console.log(chartName);
    const taxonomy = simulatedChartTaxonomy[chartName as keyof typeof simulatedChartTaxonomy];
    // if (!taxonomy) return `${API_URL}/breakdown_image`;

    const { visualizationType, graphicSymbol, shape } = taxonomy;
    const endpoint = `/breakdown_image_for_${visualizationType}_${graphicSymbol}_${shape}`;
    return `${API_URL}${endpoint}`;
  };

  // Analyze image using dynamically chosen API endpoint
  async function analyzeImage(file: File, apiEndpoint: string) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(apiEndpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data; // JSON with detected regions
  }

  useEffect(() => {
    async function fetchAnalysis() {
      if (!chart) return;
      try {
        setIsLoading(true);

        // Get chart-specific API endpoint
        const dynamicAPI = getAPIEndpointForChart(chart as string);

        // Fetch image blob
        const imageResponse = await fetch(`/studyProblem/${chart}.png`);
        const blob = await imageResponse.blob();

        // Convert blob to File
        const file = new File([blob], `${chart}.png`, { type: blob.type });

        // Analyze with dynamic API
        const result = await analyzeImage(file, dynamicAPI);
        setAnalysisOutput(result);
      } catch (error) {
        console.error("Error analyzing image:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalysis();
  }, [chart]);

  const handleNextClick = async () => {
    const mode = process.env.NEXT_PUBLIC_SPLIT_MODE || "simulation";
    try {
      if (mode === "simulation") {
        await simulateMapping();
      } else if (mode === "generate") {
        await fetchMapping();
      } else {
        console.warn(`Unknown mode: ${mode}`);
      }
    } catch (error) {
      console.error("Error handling Next click:", error);
    }
  };  

  // Simulate a mapping by calling /api/simulatedMapping with chart and questionId
  const simulateMapping = async () => {
    try {
      const response = await axios.post("/api/simulatedMapping", {
        chart: localChart,
        questionId: localQuestionId,
      });
      console.log("Simulated Mapping:", response.data);
      setHasStop(false); // Enable "Run Guidance" button
    } catch (error) {
      console.error("Error in simulateMapping:", error);
    }
  };

  // Generate a real mapping by calling /api/mappingSegment
  const fetchMapping = async () => {
    try {
      const response = await axios.post("/api/mappingSegment", {
        chartdescription: chartDescription,
        regions: analysisOutput,
      });
      console.log("Generated Mapping:", response.data);
      setHasStop(false); // Enable "Run Guidance" button
    } catch (error) {
      console.error("Error in fetchMapping:", error);
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.leftDiv}>
        <AnnotateImage
          imageUrl={`/studyProblem/${chart}.png`}
          annotations={analysisOutput}
        />
      </div>
      <div className={styles.rightDiv}>
        <h2>Right Side Panel - Analysis Output</h2>
        {isLoading ? (
          <p>Loading analysis...</p>
        ) : analysisOutput ? (
          <pre>{JSON.stringify(analysisOutput, null, 2)}</pre>
        ) : (
          <p>No analysis available.</p>
        )}
        {localChart && localQuestionId && analysisOutput && analysisOutput["regions"].length > 1 && (
          hasStop ? (
            <button className={styles.runButton} onClick={handleNextClick}>
              <FaPlay /> &nbsp; Next
            </button>
          ) : (
            <Link legacyBehavior href={`/${localChart}/${localQuestionId}/guidance`}>
              <button className={styles.runButton}>
                <FaPlay /> &nbsp; Run Guidance
              </button>
            </Link>
          )
        )}
      </div>
    </div>
  );
}

import { GetStaticPaths, GetStaticProps } from "next";

export const getStaticPaths: GetStaticPaths = async () => {
  const fs = require("fs");
  const path = require("path");

  const charts = [
    "100stackedbar",
    "area",
    "bar",
    "bubble",
    "histogram",
    "line",
    "map",
    "pie",
    "scatter",
    "stackedArea",
    "stackedBar",
    "treemap",
  ];

  let paths: { params: { chart: string; questionId: string } }[] = [];

  charts.forEach((chart) => {
    const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
    if (fs.existsSync(dataPath)) {
      const fileContents = fs.readFileSync(dataPath, "utf8");
      const data = JSON.parse(fileContents);
      const questions: any[] = data.questions || [];
      questions.forEach((_: any, index: number) => {
        paths.push({
          params: { chart, questionId: (index + 1).toString() },
        });
      });
    }
  });

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const fs = require("fs");
  const path = require("path");

  const chart = context.params?.chart as string;
  const questionId = parseInt(context.params?.questionId as string, 10);

  // Read the questions from /public/data/<chart>.json
  const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
  const fileContents = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(fileContents);
  const questions: any[] = data.questions || [];
  const questionObj = questions[questionId - 1] || {};
  const question = questionObj.question || "";

  // Read the chart description from /public/chartDescription/<chart>.json
  const chartDescPath = path.join(
    process.cwd(),
    "public",
    "chartDescription",
    `${chart}.json`
  );
  let chartDescription = { chartType: "", description: {} };
  if (fs.existsSync(chartDescPath)) {
    const chartDescContent = fs.readFileSync(chartDescPath, "utf8");
    chartDescription = JSON.parse(chartDescContent);
  } else {
    console.warn(`Chart description for ${chart} not found`);
  }

  return {
    props: {
      chart,
      questionId,
      question,
      chartDescription,
    },
  };
};
