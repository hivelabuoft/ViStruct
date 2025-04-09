import React, { useEffect, useState, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '../styles/Guidance.module.css';
import Image from 'next/image';
import axios from 'axios';

interface Step {
  stepNumber: number;
  stepName: string;
  aoiDescription: string;
  calculations?: string;
  coordinates: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

interface GuidanceProps {
  chartImage: string; // Path to chart image
  stepNumber: number; // Current step number (1-indexed)
  taskName: string; // Task description
  type: string; // Component type (e.g., "retrieve", "compute")
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

  // Modified: Try to get guidance from a local JSON file in public folder first.
  useEffect(() => {
    const fetchAOIGuidance = async () => {
      // Only fetch for supported task types
      const lowerCaseType = type.toLowerCase();
      if (
        lowerCaseType !== 'filter' && 
        lowerCaseType !== 'retrieve value' && 
        lowerCaseType !== 'compute derived value' &&
        lowerCaseType !== 'compute' &&
        lowerCaseType !== 'find extremum'
      ) return;
      
      setLoading(true);
      setError(null);

      // Derive questionId from chartImage.
      // Assumes chartImage is something like "/studyProblem/someId.png"

      try {
        // Attempt to fetch the local JSON file
        const localUrl = `/data/${chartName}/${questionId}.json`;
        const localResponse = await fetch(localUrl);
        if (localResponse.ok) {
          const jsonData = await localResponse.json();
          console.log('Local JSON data:', jsonData);
          // Assume the JSON structure has a tasks array
          // Try to find the task based on labelName or taskName
          let selectedTask = jsonData.tasks.find((task: any) => task.label === labelName);
          if (!selectedTask) {
            // Fallback: try matching taskName against description (you can adjust the logic as needed)
            selectedTask = jsonData.tasks.find((task: any) => task.description.includes(taskName));
          }
          // If still not found, take the first task (or you can set an error)
          if (!selectedTask && jsonData.tasks.length > 0) {
            selectedTask = jsonData.tasks[0];
          }
          if (selectedTask && selectedTask.steps) {
            setAoiGuidance(selectedTask.steps);
            // Optionally, set the current step based on stepNumber prop (converted from 1-indexed to 0-indexed)
            setCurrentStep(stepNumber > 0 && stepNumber <= selectedTask.steps.length ? stepNumber - 1 : 0);
            setLoading(false);
            return; // Exit early if local JSON is used
          } else {
            setError('Local guidance file found but no valid task/steps data available.');
          }
        }
        // If the file is not found or the structure is not as expected, fall back to the API call.

        // Determine API endpoint based on the task type if needed.
        let apiEndpoint = '';
        if (lowerCaseType === 'filter') {
          apiEndpoint = '/api/filterAOIs';
        } else if (lowerCaseType === 'retrieve value') {
          apiEndpoint = '/api/retrieveAOIs';
        } else if (lowerCaseType === 'compute derived value' || lowerCaseType === 'compute') {
          apiEndpoint = '/api/computeAOIs';
        } else if (lowerCaseType === 'find extremum') {
          apiEndpoint = '/api/findExtremum';
        }
        
        // API call as fallback
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
  }, [chartType, taskName, type, labelName, mappedRegions, chartImage, stepNumber]);

  // (The remaining code is unchanged)

  // Get original image dimensions on load
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

  // Update actual rendered image measurements
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

  const calculateAoiPosition = (coordinates: any) => {
    // Ensure required values are present:
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
  
    // Get the container dimensions (the div that holds the image)
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
  
    // Get the displayed image dimensions from the actual image element
    const imgRect = actualImageRef.current.getBoundingClientRect();
    const displayedWidth = imgRect.width;
    const displayedHeight = imgRect.height;

    console.log('Container dimensions:', { containerWidth, containerHeight });
    console.log('Displayed image dimensions:', { originalImageDimensions });
  
    // Use the displayed dimensions and the natural dimensions to calculate the scale.
    // (For an image rendered via object-fit: contain, these factors should be identical.)
    const scaleX = displayedWidth / originalImageDimensions.width;
    const scaleY = displayedHeight / originalImageDimensions.height;

    console.log('Scale factors:', { scaleX, scaleY });
  
    // Calculate letterbox offsets: determine how much the image is inset inside the container.
    const offsetLeft = (containerWidth - displayedWidth) / 2;
    const offsetTop = (containerHeight - displayedHeight) / 2;
  
    // Validate coordinates ordering in case they come reversed from the JSON
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
      lowerCaseType === 'find extremum'
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
                    // setOriginalImageDimensions({
                    //   width: img.naturalWidth,
                    //   height: img.naturalHeight
                    // });
                    setTimeout(() => setImageReady(true), 100);
                  }
                }}
              />
              {currentAoiStep && imageReady && (
                <div 
                  className={styles.aoiHighlight}
                  style={{
                    position: 'absolute',
                    ...calculateAoiPosition(currentAoiStep.coordinates),
                    border: '2px solid red',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    zIndex: 10,
                  }}
                />
              )}
            </div>
          </div>

          {/* Right side - AOI Guidance (30%) */}
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
                      <h4>Region Coordinates:</h4>
                      <p>
                        X: {currentAoiStep.coordinates.xmin} to {currentAoiStep.coordinates.xmax}<br />
                        Y: {currentAoiStep.coordinates.ymin} to {currentAoiStep.coordinates.ymax}
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
