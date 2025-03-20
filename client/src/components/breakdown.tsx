import { useEffect, useState } from "react";
import { FaPlay } from "react-icons/fa";
import axios from "axios";
import styles from "../styles/Breakdown.module.css";
import AnnotateImage from "./annoatedImage";
import { FaTimes } from "react-icons/fa";
import MappingOutput from "./mappingOutput";
import html2canvas from "html2canvas";

interface ChartDescription {
  chartType: string;
  description: any;
}

interface BreakdownComponentProps {
  chart: string;
  questionId: string;
  chartDescription: ChartDescription;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const simulatedChartTaxonomy = {
  "100stackedbar": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
  "bar": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
  "stackedBar": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
  "histogram": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
  "line": { visualizationType: "chart", graphicSymbol: "line", shape: "line" },
  "area": { visualizationType: "chart", graphicSymbol: "area", shape: "vary" },
  "stackedArea": { visualizationType: "chart", graphicSymbol: "area", shape: "vary" },
  "scatter": { visualizationType: "chart", graphicSymbol: "point", shape: "circle" },
  "bubble": { visualizationType: "chart", graphicSymbol: "area", shape: "circle" },
  "treemap": { visualizationType: "chart", graphicSymbol: "area", shape: "rectangular" },
  "pie": { visualizationType: "chart", graphicSymbol: "area", shape: "sector" },
  "map": { visualizationType: "map", graphicSymbol: "area", shape: "vary" },
};

export default function BreakdownComponent({
  chart,
  questionId,
  chartDescription,
  onClose,
}: BreakdownComponentProps) {
  const [analysisOutput, setAnalysisOutput] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasStop, setHasStop] = useState<boolean>(true);
  const [screenshotCaptured, setScreenshotCaptured] = useState<boolean>(false);

  // Construct dynamic API path
  const getAPIEndpointForChart = (chartName: string): string => {
    const taxonomy = simulatedChartTaxonomy[chartName as keyof typeof simulatedChartTaxonomy];
    const { visualizationType, graphicSymbol, shape } = taxonomy;
    const endpoint = `/breakdown_image_for_${visualizationType}_${graphicSymbol}_${shape}`;
    return `${API_URL}${endpoint}`;
  };

  const analyzeImage = async (file: File, apiEndpoint: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(apiEndpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  };


  // Capture screenshot using html2canvas and send to API
 const captureScreenshot = async () => {
    // Cast element to HTMLElement
    const element = document.querySelector(".AnnotatedImage-module__IWnhea__imageWrapper") as HTMLElement;
    console.log(element);
    if (element) {
      try {
        const canvas = await html2canvas(element);
        const dataURL = canvas.toDataURL("image/png");
        // Send the screenshot to the API route
        const response = await fetch("/api/saveScreenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataURL }),
        });
        const result = await response.json();
        console.log("Screenshot saved at:", result.filePath);
        setScreenshotCaptured(true);
      } catch (error) {
        console.error("Error capturing screenshot:", error);
      }
    }
  };

//   wait 5 second before taking the screenshot
  useEffect(() => {
    if (analysisOutput && !screenshotCaptured) {
      // Disable mapping button while waiting (hasStop remains true)
      const timer = setTimeout(() => {
        captureScreenshot();
      }, 2000);
      console.log("Capturing Screenshot");
      return () => clearTimeout(timer);
    }
  }, [analysisOutput]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        const dynamicAPI = getAPIEndpointForChart(chart);
        const imageResponse = await fetch(`/studyProblem/${chart}.png`);
        const blob = await imageResponse.blob();
        const file = new File([blob], `${chart}.png`, { type: blob.type });
        const result = await analyzeImage(file, dynamicAPI);
        setAnalysisOutput(result);
      } catch (error) {
        console.error("Error analyzing image:", error);
      } finally {
        setIsLoading(false);
      }
    };
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
  
      // After mapping is done, disable button
      setHasStop(false);
    } catch (error) {
      console.error("Error handling Next click:", error);
    }
  };

  const simulateMapping = async () => {
    try {
        const response = await axios.post("/api/simulatedMapping", {
            chart,
            questionId,
        });
        // console.log("Generated Mapping:", response.data);
    
        const mappingArray = response.data.mapping; // Array of mappings
        const regionsArray = analysisOutput.regions; // Original regions
    
        // Map each region with its corresponding mapping by index
        const combinedRegions = regionsArray.map((region: any, index: number) => {
          const mapping = mappingArray[index];
          return {
            segmentNumber: mapping.segmentNumber,
            description: mapping.description,
            label: region.label,
            rectangular: region.rectangular,
            color: region.color, // Optional: preserve original color
          };
        });
    
        // Update state with combined regions
        setMappedRegions(combinedRegions);
        console.log("Combined Regions:", combinedRegions);
    
        setHasStop(false); // Disable the mapping button after mapping is done
      } catch (error) {
        console.error("Error in fetchMapping:", error);
      }
  };

  const [mappedRegions, setMappedRegions] = useState<any[]>([]);

const fetchMapping = async () => {
  try {
    const response = await axios.post("/api/mappingSegment", {
      chartdescription: chartDescription,
      regions: analysisOutput,
    });
    // console.log("Generated Mapping:", response.data);

    const mappingArray = response.data.mapping; // Array of mappings
    const regionsArray = analysisOutput.regions; // Original regions

    // Map each region with its corresponding mapping by index
    const combinedRegions = regionsArray.map((region: any, index: number) => {
      const mapping = mappingArray[index];
      return {
        segmentNumber: mapping.segmentNumber,
        description: mapping.description,
        label: region.label,
        rectangular: region.rectangular,
        color: region.color, // Optional: preserve original color
      };
    });

    // Update state with combined regions
    setMappedRegions(combinedRegions);
    console.log("Combined Regions:", combinedRegions);

    setHasStop(false); // Disable the mapping button after mapping is done
  } catch (error) {
    console.error("Error in fetchMapping:", error);
  }
};


  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.container}>
        <button
            className={`${styles.closeButton} ${hasStop ? styles.disabledCloseButton : ""}`}
            onClick={onClose}
            disabled={hasStop}
            >
            <FaTimes />
            </button>
        <div className={styles.leftDiv}>
            <AnnotateImage imageUrl={`/studyProblem/${chart}.png`} annotations={analysisOutput} />
        </div>
        <div className={styles.rightDiv}>
        {hasStop ? (
            <>
                <h2>OpenCV Output</h2>
                {isLoading ? (
                <p>Loading analysis...</p>
                ) : analysisOutput ? (
                <pre>{JSON.stringify(analysisOutput, null, 2)}</pre>
                ) : (
                <p>No analysis available.</p>
                )}
            </>
            ) : (
            <>
                <h2>Regions Coordinate Mapping</h2>
                <MappingOutput data={mappedRegions} />
              </>
            )}

            {analysisOutput && analysisOutput["regions"]?.length > 1 && (
            <button
            className={`${styles.runButton} ${(hasStop && !screenshotCaptured) ? styles.disabledCloseButton : ""}`}
            onClick={handleNextClick}
            disabled={!screenshotCaptured || !hasStop} // Disable if screenshot not done OR mapping is done
          >
            {(!screenshotCaptured && hasStop) ? (
              "Loading..."
            ) : hasStop ? (
              <>
                <FaPlay /> &nbsp; Start Mapping
              </>
            ) : (
              <>
                Mapped
              </>
            )}
            </button>
            )}
        </div>
        </div>
      </div>
    </div>
  );
}
