import React, { useEffect, useState, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '../styles/Guidance.module.css';
import Image from 'next/image';
import axios from 'axios';

interface Coordinate {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

interface Step {
  stepNumber: number;
  stepName: string;
  aoiDescription: string;
  calculations?: string;
  // Coordinates are optional since a step might use a trendline instead.
  coordinates?: Coordinate | Coordinate[];
  trendline?: Coordinate;
}

interface GuidanceProps {
  chartImage: string; // Path to chart image
  stepNumber: number; // Current step number (1-indexed)
  taskName: string; // Task description
  type: string; // Component type (e.g., "retrieve", "compute", "correlate")
  chartType: string; // Type of chart (e.g., "bar", "line")
  labelName?: string; // Optional label name
  mappedRegions: any[]; // Mapped regions from breakdown component
  questionId: number;
  chartName: string; // Name of the chart
  onClose: () => void; // Close callback
  onGuidanceComplete?: (stepNumber: number) => void; // Callback when guidance is completed
}

export default function Guidance({
  chartImage,
  stepNumber,
  taskName,
  type,
  chartType,
  labelName,
  mappedRegions,
  questionId,
  chartName,
  onClose,
  onGuidanceComplete,
}: GuidanceProps) {
  const [aoiGuidance, setAoiGuidance] = useState<Step[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [originalImageDimensions, setOriginalImageDimensions] = useState({ width: 0, height: 0 });
  const [imageReady, setImageReady] = useState(false);
  const [imagePosition, setImagePosition] = useState({ top: 0, left: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const actualImageRef = useRef<HTMLImageElement | null>(null);

  // Fetch guidance data (local file or API)
  useEffect(() => {
    const fetchAOIGuidance = async () => {
      const lowerCaseType = type.toLowerCase();
      if (
        lowerCaseType !== 'filter' &&
        lowerCaseType !== 'retrieve value' &&
        lowerCaseType !== 'compute derived value' &&
        lowerCaseType !== 'compute' &&
        lowerCaseType !== 'find extremum' &&
        lowerCaseType !== 'determine range' &&
        lowerCaseType !== 'correlate'
      )
        return;
      
      setLoading(true);
      setError(null);

      try {
        const localUrl = `/data/${chartName}/${questionId}.json`;
        const localResponse = await fetch(localUrl);
        if (localResponse.ok) {
          const jsonData = await localResponse.json();
          let selectedTask = jsonData.tasks.find((task: any) => task.id == stepNumber.toString());
          if (selectedTask && selectedTask.steps) {
            setAoiGuidance(selectedTask.steps);
            setCurrentStep(0);
            setLoading(false);
            return;
          } else {
            setError('Local guidance file found but no valid task/steps data available.');
          }
        }
        // Determine the API endpoint based on type (fallback)
        let apiEndpoint = '';
        if (lowerCaseType === 'filter') {
          apiEndpoint = '/api/filterAOIs';
        } else if (lowerCaseType === 'retrieve value') {
          apiEndpoint = '/api/retrieveAOIs';
        } else if (lowerCaseType === 'compute derived value' || lowerCaseType === 'compute') {
          apiEndpoint = '/api/computeAOIs';
        } else if (lowerCaseType === 'find extremum') {
          apiEndpoint = '/api/findExtremum';
        } else if (lowerCaseType === 'determine range') {
          apiEndpoint = '/api/determineRange';
        } else if (lowerCaseType === 'correlate') {
          apiEndpoint = '/api/correlateAOIs';
        }
        
        const response = await axios.post(apiEndpoint, {
          chartType,
          currentTaskName: taskName,
          labelName,
          mappedRegions,
        });
        
        if (response.data && response.data.steps) {
          setAoiGuidance(response.data.steps);
          setCurrentStep(0);
        } else {
          setError('Invalid response format from API');
        }
      } catch (err) {
        console.error(`Error fetching AOI guidance for ${type}:`, err);
        setError('Failed to fetch guidance data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAOIGuidance();
  }, [chartType, taskName, type, labelName, mappedRegions, chartImage, stepNumber, chartName, questionId]);

  // Load original image dimensions
  useEffect(() => {
    if (chartImage) {
      const img = document.createElement('img');
      img.onload = () => {
        setOriginalImageDimensions({
          width: img.width,
          height: img.height
        });
        console.log('Original image dimensions:', {
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
      };
      img.src = chartImage;
    }
  }, [chartImage]);

  // Update rendered image dimensions
  useEffect(() => {
    const updateActualImageDimensions = () => {
      if (imageRef.current) {
        const imgElement = imageRef.current.querySelector('img');
        if (imgElement) {
          actualImageRef.current = imgElement;
          const rect = imgElement.getBoundingClientRect();
          setImageDimensions({
            width: rect.width,
            height: rect.height
          });
          if (imageContainerRef.current) {
            const containerRect = imageContainerRef.current.getBoundingClientRect();
            setImagePosition({
              left: rect.left - containerRect.left,
              top: rect.top - containerRect.top
            });
          }
          setImageReady(true);
        }
      }
    };
    
    updateActualImageDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateActualImageDimensions();
    });
    
    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }
    window.addEventListener('resize', updateActualImageDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateActualImageDimensions);
    };
  }, [imageReady]);

  // Calculate a bounding box style for a given coordinate
  const calculateAoiPosition = (coordinates: Coordinate) => {
    if (
      !originalImageDimensions.width ||
      !originalImageDimensions.height ||
      !imageContainerRef.current ||
      !actualImageRef.current
    ) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        display: 'none'
      };
    }
  
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const displayedImgRect = actualImageRef.current.getBoundingClientRect();
    const displayedWidth = displayedImgRect.width;
    const displayedHeight = displayedImgRect.height;
  
    const scaleX = displayedWidth / originalImageDimensions.width;
    const scaleY = displayedHeight / originalImageDimensions.height;
    const offsetLeft = (containerRect.width - displayedWidth) / 2;
    const offsetTop = (containerRect.height - displayedHeight) / 2;
  
    const validCoords = {
      xmin: Math.min(coordinates.xmin, coordinates.xmax),
      xmax: Math.max(coordinates.xmin, coordinates.xmax),
      ymin: Math.min(coordinates.ymin, coordinates.ymax),
      ymax: Math.max(coordinates.ymin, coordinates.ymax)
    };
  
    return {
      left: offsetLeft + validCoords.xmin * scaleX,
      top: offsetTop + validCoords.ymin * scaleY,
      width: (validCoords.xmax - validCoords.xmin) * scaleX,
      height: (validCoords.ymax - validCoords.ymin) * scaleY,
      display: 'block'
    };
  };

  // Calculate style for rendering a trendline overlay.
  const calculateTrendlineStyle = (trendline: Coordinate) => {
    if (
      !originalImageDimensions.width ||
      !originalImageDimensions.height ||
      !imageContainerRef.current ||
      !actualImageRef.current
    ) {
      return { display: 'none' };
    }
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const displayedImgRect = actualImageRef.current.getBoundingClientRect();
    const displayedWidth = displayedImgRect.width;
    const displayedHeight = displayedImgRect.height;
  
    const scaleX = displayedWidth / originalImageDimensions.width;
    const scaleY = displayedHeight / originalImageDimensions.height;
    const offsetLeft = (containerRect.width - displayedWidth) / 2;
    const offsetTop = (containerRect.height - displayedHeight) / 2;
  
    // Compute start and end points
    const startX = offsetLeft + trendline.xmin * scaleX;
    const startY = offsetTop + trendline.ymin * scaleY;
    const endX = offsetLeft + trendline.xmax * scaleX;
    const endY = offsetTop + trendline.ymax * scaleY;
  
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
    return {
      position: 'absolute',
      left: startX,
      top: startY,
      width: length,
      height: 2, // line thickness
      backgroundColor: 'blue', // you can change this to any color you like
      transform: `rotate(${angle}deg)`,
      transformOrigin: '0 50%',
      zIndex: 10,
      display: 'block'
    };
  };

  const currentAoiStep = aoiGuidance.length > 0 && currentStep < aoiGuidance.length
    ? aoiGuidance[currentStep]
    : null;

  const handleNextStep = () => {
    if (currentStep < aoiGuidance.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinished = () => {
    if (onGuidanceComplete) {
      onGuidanceComplete(stepNumber);
    }
    onClose();
  };

  useEffect(() => {
    if (imageReady && actualImageRef.current) {
      const rect = actualImageRef.current.getBoundingClientRect();
      console.log('Rendered image dimensions:', {
        width: rect.width,
        height: rect.height,
        aspectRatio: rect.width / rect.height,
        intrinsicSize: originalImageDimensions,
        intrinsicAspectRatio: originalImageDimensions.width / originalImageDimensions.height
      });
    }
  }, [imageReady, originalImageDimensions, imageDimensions]);

  const supportsAoiGuidance = () => {
    const lowerCaseType = type.toLowerCase();
    return (
      lowerCaseType === 'filter' ||
      lowerCaseType === 'retrieve value' ||
      lowerCaseType === 'compute derived value' ||
      lowerCaseType === 'compute' ||
      lowerCaseType === 'find extremum' ||
      lowerCaseType === 'determine range' ||
      lowerCaseType === 'correlate'
    );
  };

  return (
    <div className={styles.guidanceModal}>
      <div className={styles.guidanceContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className={styles.guidanceHeader}>
          <h2>
            Step {stepNumber}: <span className={styles.taskType}>{type}</span>
          </h2>
          {supportsAoiGuidance() && aoiGuidance.length > 0 && (
            <div className={styles.stepCounter}>
              Step {currentStep + 1} of {aoiGuidance.length}
            </div>
          )}
        </div>

        <div className={styles.guidanceBody}>
          {/* Left side - Image container (70%) */}
          <div className={styles.imageContainer} ref={imageContainerRef}>
            <div ref={imageRef} className={styles.imageWrapper}>
              <Image
                src={chartImage}
                alt={`${chartType} chart`}
                className={styles.chartImage}
                width={originalImageDimensions.width || 1000}
                height={originalImageDimensions.height || 800}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  margin: 'auto',
                  display: 'block'
                }}
                onLoadingComplete={(img) => {
                  if (img.naturalWidth && img.naturalHeight) {
                    setTimeout(() => setImageReady(true), 100);
                  }
                }}
              />
              {/* Render overlay(s): either trendline or coordinate bounding boxes */}
              {currentAoiStep && imageReady && (
                <>
                  {currentAoiStep.trendline ? (
                    <div
                      className={styles.aoiTrendline}
                      style={calculateTrendlineStyle(currentAoiStep.trendline) as React.CSSProperties}
                    />
                  ) : currentAoiStep.coordinates ? (
                    Array.isArray(currentAoiStep.coordinates) ? (
                      currentAoiStep.coordinates.map((coord, index) => (
                        <div 
                          key={index}
                          className={styles.aoiHighlight}
                          style={{
                            position: 'absolute',
                            ...calculateAoiPosition(coord),
                            border: '2px solid red',
                            backgroundColor: 'rgba(255, 0, 0, 0.2)',
                            zIndex: 10,
                          }}
                        />
                      ))
                    ) : (
                      <div 
                        className={styles.aoiHighlight}
                        style={{
                          position: 'absolute',
                          ...calculateAoiPosition(currentAoiStep.coordinates as Coordinate),
                          border: '2px solid red',
                          backgroundColor: 'rgba(255, 0, 0, 0.2)',
                          zIndex: 10,
                        }}
                      />
                    )
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Right side - AOI Guidance details (30%) */}
          {supportsAoiGuidance() && (
            <div className={styles.aoiGuidance}>
              {loading ? (
                <p>Loading guidance...</p>
              ) : error ? (
                <p className={styles.error}>{error}</p>
              ) : currentAoiStep ? (
                <>
                  <div className={styles.stepDetails}>
                    <h3>{currentAoiStep.stepName}</h3>
                    <p>{currentAoiStep.aoiDescription}</p>
                    {currentAoiStep.calculations && (
                      <div className={styles.calculations}>
                        <h4>Calculations:</h4>
                        <p>{currentAoiStep.calculations}</p>
                      </div>
                    )}
                    <div className={styles.coordinates}>
                      <h4>
                        {currentAoiStep.trendline ? "Trendline Coordinates:" : "Region Coordinates:"}
                      </h4>
                      <p>
                        {currentAoiStep.trendline ? (
                          <>
                            X: {currentAoiStep.trendline.xmin} to {currentAoiStep.trendline.xmax}<br />
                            Y: {currentAoiStep.trendline.ymin} to {currentAoiStep.trendline.ymax}
                          </>
                        ) : currentAoiStep.coordinates ? (
                          Array.isArray(currentAoiStep.coordinates) ? (
                            currentAoiStep.coordinates.map((coord, index) => (
                              <span key={index}>
                                Region {index + 1}: X: {coord.xmin} to {coord.xmax}, Y: {coord.ymin} to {coord.ymax}<br />
                              </span>
                            ))
                          ) : (
                            <>
                              X: {(currentAoiStep.coordinates as Coordinate).xmin} to {(currentAoiStep.coordinates as Coordinate).xmax}<br />
                              Y: {(currentAoiStep.coordinates as Coordinate).ymin} to {(currentAoiStep.coordinates as Coordinate).ymax}
                            </>
                          )
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className={styles.navigationButtons}>
                    <button 
                      onClick={handlePrevStep} 
                      disabled={currentStep <= 0}
                      className={styles.navButton}
                    >
                      Previous
                    </button>
                    <button 
                      onClick={handleNextStep} 
                      disabled={currentStep >= aoiGuidance.length - 1}
                      className={styles.navButton}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : aoiGuidance.length === 0 && !loading ? (
                <p>No guidance available for this task.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className={styles.guidanceFooter}>
          <button 
            className={
              supportsAoiGuidance() && currentStep < aoiGuidance.length - 1
                ? styles.finishedButtonDisabled 
                : styles.finishedButton
            }
            onClick={handleFinished}
            disabled={supportsAoiGuidance() && currentStep < aoiGuidance.length - 1}
          >
            Finished
          </button>
        </div>
      </div>
    </div>
  );
}
