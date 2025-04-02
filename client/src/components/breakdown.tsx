import { useEffect, useState } from "react";
import { FaPlay, FaTimes, FaInfoCircle, FaCheckCircle, FaArrowRight, FaChartBar } from "react-icons/fa";
import axios from "axios";
import styles from "../styles/Breakdown.module.css";
import AnnotateImage from "./annoatedImage";
import MappingOutput from "./mappingOutput";
import JSONFormatter from "./JSONFormatter";
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
  onMappingComplete?: (mappedRegions: any[]) => void; // New callback prop
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// const simulatedChartTaxonomy = {
//   "100stackedbar": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
//   "bar": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
//   "stackedBar": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
//   "histogram": { visualizationType: "chart", graphicSymbol: "surface", shape: "rectangular" },
//   "line": { visualizationType: "chart", graphicSymbol: "line", shape: "line" },
//   "area": { visualizationType: "chart", graphicSymbol: "area", shape: "vary" },
//   "stackedArea": { visualizationType: "chart", graphicSymbol: "area", shape: "vary" },
//   "100stackedArea": { visualizationType: "chart", graphicSymbol: "area", shape: "vary" },
//   "scatter": { visualizationType: "chart", graphicSymbol: "point", shape: "circle" },
//   "bubble": { visualizationType: "chart", graphicSymbol: "area", shape: "circle" },
//   "treemap": { visualizationType: "chart", graphicSymbol: "area", shape: "rectangular" },
//   "pie": { visualizationType: "chart", graphicSymbol: "area", shape: "sector" },
//   "map": { visualizationType: "map", graphicSymbol: "area", shape: "vary" },
// };

export default function BreakdownComponent({
  chart,
  questionId,
  chartDescription,
  onClose,
  onMappingComplete,
}: BreakdownComponentProps) {
  const [analysisOutput, setAnalysisOutput] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasStop, setHasStop] = useState<boolean>(true);
  const [screenshotCaptured, setScreenshotCaptured] = useState<boolean>(false);
  const [isMappingLoading, setIsMappingLoading] = useState<boolean>(false);
  const [mappedRegions, setMappedRegions] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  // Construct dynamic API path
  const getAPIEndpointForChart = (chartName: string): string => {
    const chartEndpoints: Record<string, string> = {
      "100stackedbar": "/analyze/100_stacked_bar_chart",
      "bar": "/analyze/bar_chart",
      "stackedBar": "/analyze/stacked_bar_chart",
      "histogram": "/analyze/histogram",
      "line": "/analyze/line_chart",
      "area": "/analyze/area_chart",
      "stackedArea": "/analyze/stacked_area_chart",
      "scatter": "/analyze/scatter_plot",
      "bubble": "/analyze/bubble_chart",
      "treemap": "/analyze/treemap",
      "pie": "/analyze/pie_chart",
      "map": "/analyze/map",
    };

    // Use the specific endpoint for the chart type, or fallback to a default
    if (chartEndpoints[chartName]) {
      return `${API_URL}${chartEndpoints[chartName]}`;
    } else {
      // Default fallback endpoint if chart type not found in mapping
      console.warn(`No endpoint mapping found for chart type: ${chartName}`);
      return `${API_URL}/analyze/bar_chart`; // Default fallback endpoint
    }
  };

  const analyzeImage = async (file: File, apiEndpoint: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(apiEndpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    let filteredRegions = response.data;
    
    filteredRegions = response.data.regions.filter((region: { rectangular: any; }) => region.rectangular);
    console.log("Regions from Python backend:", filteredRegions);
    return {
      "regions": filteredRegions,
    };
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
      setIsMappingLoading(true);
      
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
    } finally {
      setIsMappingLoading(false);
    }
  };

  const simulateMapping = async () => {
    try {
        // Set a delay of 2 seconds to simulate loading
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
  
        
        let filteredRegions = combinedRegions;
        if (['bar', 'histogram', '100stackedbar', 'stackedBar', 'treemap'].includes(chart)) {
          console.log("Filtering out non-rectangular elements for bar-type chart");
          filteredRegions = combinedRegions.filter((region: { rectangular: any; }) => region.rectangular);
        }
    
        // Update state with filtered regions
        setMappedRegions(filteredRegions);
        console.log("Filtered Regions:", filteredRegions);
    
        setHasStop(false); // Disable the mapping button after mapping is done
      } catch (error) {
        console.error("Error in fetchMapping:", error);
      }
  };

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

    // Filter out elements without the "rectangular" property for bar-type charts
    let filteredRegions = combinedRegions;
    if (['bar', 'histogram', '100stackedbar', 'stackedBar', 'treemap'].includes(chart)) {
      console.log("Filtering out non-rectangular elements for bar-type chart");
      filteredRegions = combinedRegions.filter((region: { rectangular: any; }) => region.rectangular);
    }

    // Update state with filtered regions
    setMappedRegions(filteredRegions);
    console.log("Filtered Regions:", filteredRegions);

    setHasStop(false); // Disable the mapping button after mapping is done
  } catch (error) {
    console.error("Error in fetchMapping:", error);
  }
};


  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.pageInstructions}>
          {hasStop ? (
            <div className={styles.instructionBox}>
              <div className={styles.instructionsTextContainer}>
                <FaInfoCircle className={styles.instructionIcon} />
                <p>OpenCV has identified regions in this chart. Click "Start Mapping" to assign meaning to each region.</p>
              </div>
              {analysisOutput && analysisOutput["regions"]?.length > 1 && (
              hasStop ? (
                <button
                  className={`${styles.actionButton} ${(!screenshotCaptured) ? styles.disabledButton : ""}`}
                  onClick={handleNextClick}
                  disabled={!screenshotCaptured || isMappingLoading}
                >
                  {!screenshotCaptured ? (
                    "Loading..."
                  ) : isMappingLoading ? (
                    "Processing..."
                  ) : (
                    <>
                      <FaPlay /> &nbsp; Start Mapping
                    </>
                  )}
                </button>
              ) : (
                <div className={styles.mappedStatus}>
                  <FaCheckCircle /> &nbsp; Mapping Complete
                </div>
              )
            )}
            </div>
          ) : (
            <div className={styles.instructionBox}>
              <div className={styles.instructionsTextContainer}>
                <FaCheckCircle className={styles.instructionIcon} />
                <p>Mapping complete! Click on any segment card to highlight its position in the chart.</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.container}>
          {/* Exit instructions banner at the top */}
          {!hasStop && (
            <div className={styles.exitBanner}>
              <p>You may now exit this screen using the close button <FaTimes /> in the top-right corner</p>
            </div>
          )}
          
          <div className={styles.leftDiv}>
            <h2 className={styles.sectionTitle}><FaChartBar /> Chart Segmentation</h2>
            <AnnotateImage 
              imageUrl={`/studyProblem/${chart}.png`} 
              annotations={analysisOutput} 
              selectedSegment={selectedSegment}
            />
          </div>
          
          <div className={styles.rightDiv}>
            {hasStop ? (
              <>
                <h2 className={styles.sectionTitle}><FaInfoCircle /> Region Detection</h2>
                <p className={styles.sectionDescription}>
                  Computer vision has detected the following regions in the chart:
                </p>
                {isLoading ? (
                  <p>Loading analysis...</p>
                ) : isMappingLoading ? (
                  <p>Loading mapping data...</p>
                ) : analysisOutput ? (
                  <JSONFormatter data={analysisOutput} />
                ) : (
                  <p>No analysis available.</p>
                )}
              </>
            ) : (
              <>
                <h2 className={styles.sectionTitle}><FaCheckCircle /> Data Segment Mapping</h2>
                <p className={styles.sectionDescription}>
                  Each region has been mapped to a data component.
                  <span className={styles.interactionTip}>
                    <FaInfoCircle /> Click any card to highlight it on the chart
                  </span>
                </p>
                <MappingOutput 
                  data={mappedRegions} 
                  onSegmentSelect={(segmentNumber) => setSelectedSegment(segmentNumber)}
                  selectedSegment={selectedSegment}
                />
              </>
            )}
          </div>
          
          <button
            className={`${styles.closeButton} ${hasStop ? styles.disabledCloseButton : ""}`}
            onClick={onClose}
            disabled={hasStop}
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}
