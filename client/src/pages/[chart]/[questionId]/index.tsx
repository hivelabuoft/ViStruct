// This file is a client component because it uses useState and useEffect
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { FaSave, FaRedo, FaPlay, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import styles from "../../../styles/Question.module.css";
import ChartImageContainer from "../../../components/chartImageContainer";
import typeColors from "../../../utils/typeColor";
import BreakdownComponent from "@/src/components/breakdown";
import Guidance from "@/src/components/guidance";
import Head from "next/head";

interface ChartDescription {
  chartType: string;
  description: any;
}

interface QuestionPageProps {
  chart: string;
  questionId: number;
  question: string;
  chartDescription: ChartDescription;
}

export default function QuestionPage({
  chart,
  questionId,
  question,
  chartDescription,
}: QuestionPageProps) {
  const [generatedJSON, setGeneratedJSON] = useState<any>(null);
  const [isWaiting, setIsWaiting] = useState<boolean>(true);
  const [editorValue, setEditorValue] = useState<string>("");
  const [originalValue, setOriginalValue] = useState<string>("");
  const [zoom, setZoom] = useState<number>(1);
  const [isMapped, setIsMapped] = useState<boolean>(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [showMappingHint, setShowMappingHint] = useState<boolean>(false);
  const [showGuidanceButton, setShowGuidanceButton] = useState<boolean>(false);
  const [mappedRegions, setMappedRegions] = useState<any[]>([]);
  const [showGuidanceModal, setShowGuidanceModal] = useState<boolean>(false);
  // Track which steps have been guided
  const [guidedSteps, setGuidedSteps] = useState<number[]>([]);

  // Destructure chart description values.
  const { chartType, description } = chartDescription;
  const [showModal, setShowModal] = useState(false);

  // useEffect(() => {console.log(isWaiting)}, [isWaiting]);

  useEffect(() => {
    if (!chartType || !description || Object.keys(description).length === 0) {
      return;
    }

    async function simulateDecomposition() {
      try {
        setIsWaiting(true);
        const startTime = Date.now();
        // Call the simulation API endpoint; we pass chart and questionId.
        const response = await axios.post("/api/simulateDecomp", {
          chart,
          questionId,
        });
        setGeneratedJSON(response.data);
        const elapsed = Date.now() - startTime;
        if (elapsed < 5000) {
          await new Promise((resolve) => setTimeout(resolve, 5000 - elapsed));
        }
      } catch (error) {
        console.error("Error fetching decomposition (simulation):", error);
      } finally {
        setIsWaiting(false);
      }
    }    
    

    async function fetchDecomposition() {
      try {
        setIsWaiting(true);
        const response = await axios.post("/api/splitLowLevel", {
          question,
          chartType,
          description,
        });
        setGeneratedJSON(response.data);
      } catch (error) {
        console.error("Error fetching generated response:", error);
      } finally {
        setIsWaiting(false);
      }
    }

    const mode = process.env.NEXT_PUBLIC_SPLIT_MODE || "simulation";
    if (mode === "simulation") {
      simulateDecomposition();
    } else if (mode === "generate") {
      fetchDecomposition();
    }
  }, [question, chart, chartType, description, questionId]);

  useEffect(() => {
    if (generatedJSON) {
      const jsonString = JSON.stringify(generatedJSON, null, 2);
      setOriginalValue(jsonString);
      setEditorValue(jsonString);
    }
  }, [generatedJSON]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editorValue);
      setOriginalValue(editorValue);
      setGeneratedJSON(parsed);
    } catch (error) {
      alert("Invalid JSON. Please correct errors before saving.");
    }
  };

  const handleRedo = () => {
    setEditorValue(originalValue);
  };

  const handleZoomIn = () => {
    setZoom((prev) => prev + 0.1);
  };

  const handleZoomOut = () => {
    setZoom((prev) => (prev > 0.2 ? prev - 0.1 : prev));
  };
  
  const handleRunMapping = () => {
    setIsMapped(true);
    setShowModal(true);
  };
  
  const handleStepClick = (index: number) => {
    if (!isMapped) {
      // Show hint that mapping is required first
      setShowMappingHint(true);
      setTimeout(() => setShowMappingHint(false), 3000); // Hide hint after 3 seconds
      return;
    }
    
    setSelectedStep(selectedStep === index ? null : index);
    setShowGuidanceButton(selectedStep !== index);
  };
  
  const handleMappingComplete = (regions: any[]) => {
    setMappedRegions(regions);
    console.log("Mapping completed with regions:", regions);
  };
  
  const navigateToGuidance = (event: React.MouseEvent) => {
    // Prevent event propagation to parent elements
    event.stopPropagation();
    
    // Show the guidance modal immediately when clicking the Run Guidance button
    if (selectedStep !== null && generatedJSON && generatedJSON.example) {
      const exampleStep = generatedJSON.example[selectedStep];
      const componentInfo = generatedJSON.components.find(
        (comp: any) => comp.index === exampleStep.step
      );
      
      if (componentInfo) {
        setShowGuidanceModal(true);
      }
    }
  };

  const handleGuidanceComplete = (stepNumber: number) => {
    if (selectedStep !== null) {
      // Add this step to the list of guided steps if not already included
      if (!guidedSteps.includes(selectedStep)) {
        setGuidedSteps([...guidedSteps, selectedStep]);
      }
      
      // Close the guidance modal
      setShowGuidanceModal(false);
    }
  };

  // Format chart name for the title
  const formatChartName = (name: string) => {
    if (name === "100stackedbar") return "100% Stacked Bar Chart";
    if (name === "stackedArea") return "Stacked Area Chart";
    if (name === "stackedBar") return "Stacked Bar Chart";
    
    return name
      .split(/(?=[A-Z])/)
      .join(" ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) + " Chart";
  };

  return (
    <>
      <Head>
        <title>ViStruct - {formatChartName(chart)} - Question {questionId}</title>
        <meta name="description" content={`${question} - ${formatChartName(chart)} visualization task`} />
      </Head>
      <div className={styles.mainContainer}>
        {/* Loading Overlay */}
        {isWaiting ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}></div>
          </div>
        ) : (
          <>
            {/* Header Section (reduced vertical space) */}
            <header className={styles.header}>
              <div className={styles.headerContent}>
                <h1>
                  <span className={styles.chartTitle}>{chartType.toUpperCase()}</span> -{" "}
                  <span className={styles.questionIndex}>Question {questionId}:</span>{" "}
                  <span className={styles.questionContent}>{question}</span>
                </h1>
              </div>
            </header>

            {/* Display Area */}
            <div className={styles.displayArea}>
              {/* Left Panel: Editor with floating Save/Redo buttons */}
              <div className={styles.leftPanel}>
                <div className={styles.chartImageContainerWrapper}>
                  <ChartImageContainer src={`/studyProblem/${chart}.png`} alt={chartType} />
                </div>
                <div className={styles.editorContainer}>
                  <div className={styles.editorFloatingButtons}>
                    <button className={styles.saveButton} onClick={handleSave}>
                      <FaSave /> <span>Save</span>
                    </button>
                    <button
                      className={styles.redoButton}
                      onClick={handleRedo}
                      disabled={editorValue === originalValue}
                    >
                      <FaRedo /> <span>Reset</span>
                    </button>
                  </div>
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="vs-light"
                    value={editorValue || "Editor content here..."}
                    onChange={(value) => setEditorValue(value || "")}
                    options={{
                      readOnly: false, // set to false later
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      lineNumbersMinChars: 2,
                      fontSize: 14,
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>

              {/* Right Panel: Split into Left (65%) and Right (35%) sub-panels */}
              <div className={styles.rightPanel}>
                {/* Left Sub-panel: Top for chart image with zoom, bottom for decomposition cards */}
                <div className={styles.decompositionLeft}>
                  <div className={styles.decompositionCards}>
                    <h2 className={styles.panelTitle}>Low-Level Component Task Breakdown</h2>
                    {generatedJSON && generatedJSON.components ? (
                      generatedJSON.components.map((comp: any, index: number) => (
                        <div key={index} className={styles.decompositionCard}>
                          <div
                            className={styles.decompositionCardHeader}
                            style={{
                              backgroundColor:
                                typeColors[comp.type] || "rgba(229, 231, 235, 0.8)",
                            }}
                          >
                            <span className={styles.cardIndex}>#{comp.index}</span>
                            <span className={styles.cardType}>{comp.type}</span>
                          </div>
                          <div className={styles.decompositionCardBody}>
                            {comp.taskName}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No decomposition available</p>
                    )}
                  </div>
                </div>

                {/* Right Sub-panel: Full JSON output */}
                <div className={styles.decompositionRight}>
                  <div className={styles.flowChartHeader}>
                    <h2 className={styles.panelTitle}>Example Task Flow Chart</h2>
                    <button 
                      className={styles.runButton} 
                      onClick={handleRunMapping}
                      data-mapped={isMapped ? "true" : "false"}
                    >
                      <FaPlay /> <span>{isMapped ? "Mapped" : "Map"}</span>
                    </button>
                  </div>
                  
                  {!isMapped && (
                    <div className={styles.workflowStatus}>
                      <FaPlay /> Click the Map button to begin mapping chart coordinates to task components
                    </div>
                  )}
                  
                  <div className={styles.flowChart}>
                    {generatedJSON ? (
                      <div className={styles.flowChartContainer}>
                        {generatedJSON.example && generatedJSON.example.map((item: any, index: number) => {
                          const componentInfo = generatedJSON.components.find(
                            (comp: any) => comp.index === item.step
                          );
                          
                          return componentInfo ? (
                            <div 
                              key={index} 
                              className={styles.flowChartStep} 
                              onClick={() => handleStepClick(index)}
                              data-selected={selectedStep === index ? "true" : "false"}
                              data-guided={guidedSteps.includes(index) ? "true" : "false"}
                            >
                              <div 
                                className={styles.flowChartStepContent}
                                style={{
                                  backgroundColor: typeColors[componentInfo.type] || "rgba(229, 231, 235, 0.8)"
                                }}
                              >
                                <div className={styles.flowChartStepHeader}>
                                  <span className={styles.flowChartStepNumber}>Step {index + 1}</span>
                                  <span className={styles.flowChartStepType}>{componentInfo.type}</span>
                                </div>
                                <div className={styles.flowChartStepTask}>
                                  <strong>Task {item.step}:</strong> {componentInfo.taskName}
                                </div>
                                {item.labelName && (
                                  <div className={styles.flowChartStepVariable}>
                                    <span className={styles.variableLabel}>Value:</span> {item.labelName}
                                  </div>
                                )}
                              </div>
                              {selectedStep === index && (
                                <button className={styles.guidanceButton} onClick={(e) => navigateToGuidance(e)}>
                                  <FaArrowRight /> Run Guidance
                                </button>
                              )}
                              {index < generatedJSON.example.length - 1 && (
                                <div className={styles.flowChartConnector}>
                                  <div className={styles.flowChartConnectorLine}></div>
                                  <div className={styles.flowChartConnectorArrow}></div>
                                </div>
                              )}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      "JSON output here..."
                    )}
                  </div>
                  
                  {showMappingHint && (
                    <div className={styles.mappingHint}>
                      <FaPlay /> Please click "Map" first to map chart regions
                    </div>
                  )}
                </div>
                
                {/* Breakdown Modal */}
                {showModal && (
                  <div className={styles.modalWrapper}>
                    <BreakdownComponent
                      chart={chart}
                      questionId={questionId.toString()}
                      chartDescription={chartDescription}
                      onClose={() => setShowModal(false)}
                      onMappingComplete={handleMappingComplete}
                    />
                  </div>
                )}
                
                {/* Guidance Modal */}
                {showGuidanceModal && selectedStep !== null && generatedJSON && generatedJSON.example && (
                  <div className={styles.modalWrapper}>
                    <Guidance
                      chartImage={`/studyProblem/${chart}.png`}
                      stepNumber={selectedStep + 1}
                      taskName={generatedJSON.components.find(
                        (comp: any) => comp.index === generatedJSON.example[selectedStep].step
                      )?.taskName || ""}
                      type={generatedJSON.components.find(
                        (comp: any) => comp.index === generatedJSON.example[selectedStep].step
                      )?.type || ""}
                      chartType={chartType}
                      labelName={generatedJSON.example[selectedStep].labelName || ""}
                      mappedRegions={mappedRegions}
                      questionId={questionId}
                      chartName={chart}
                      onClose={() => setShowGuidanceModal(false)}
                      onGuidanceComplete={handleGuidanceComplete}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ---
// Server-side functions

import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";

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
