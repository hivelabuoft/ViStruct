import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '../styles/Guidance.module.css';
import Image from 'next/image';
import axios from 'axios';

interface Step {
  stepNumber: number;
  stepName: string;
  aoiDescription: string;
  calculations: string;
  coordinates: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

interface GuidanceProps {
  chartImage: string; // Path to chart image
  stepNumber: number; // Current step number
  taskName: string; // Task description
  type: string; // Component type (e.g., "retrieve", "compute")
  chartType: string; // Type of chart (e.g., "bar", "line")
  labelName?: string; // Optional label name
  mappedRegions: any[]; // Mapped regions from breakdown component
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Fetch AOI guidance on initial load for supported task types
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
      
      try {
        // Determine which API endpoint to use based on the task type
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
        
        // Make API call to get AOIs
        const response = await axios.post(apiEndpoint, {
          chartType,
          currentTaskName: taskName,
          labelName,
          mappedRegions,
        });
        
        if (response.data && response.data.steps) {
          setAoiGuidance(response.data.steps);
          // Set current step to the first step
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
  }, [chartType, taskName, type, labelName, mappedRegions]);

  // Get original image dimensions on load
  useEffect(() => {
    if (chartImage) {
      const img = document.createElement('img');
      img.onload = () => {
        setOriginalImageDimensions({
          width: img.width,
          height: img.height
        });
      };
      img.src = chartImage;
    }
  }, [chartImage]);

  // Update actual rendered image measurements
  useEffect(() => {
    const updateActualImageDimensions = () => {
      // Find the actual img element rendered by Next.js Image component
      if (imageRef.current) {
        const imgElement = imageRef.current.querySelector('img');
        if (imgElement) {
          actualImageRef.current = imgElement;
          const rect = imgElement.getBoundingClientRect();
          
          setImageDimensions({
            width: rect.width,
            height: rect.height
          });
          
          // Calculate position relative to container with more precision
          if (imageContainerRef.current) {
            const containerRect = imageContainerRef.current.getBoundingClientRect();
            
            // Get the exact offset position of the image within its container
            setImagePosition({
              left: rect.left - containerRect.left,
              top: rect.top - containerRect.top
            });
            
            // Log for debugging
            console.log('Image position within container:', {
              left: rect.left - containerRect.left,
              top: rect.top - containerRect.top,
              imageWidth: rect.width,
              containerWidth: containerRect.width
            });
          }
          
          setImageReady(true);
        }
      }
    };
    
    // Initial update
    updateActualImageDimensions();
    
    // Set up observer to track resize events
    const resizeObserver = new ResizeObserver(() => {
      updateActualImageDimensions();
    });
    
    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }
    
    // Set up window resize listener
    window.addEventListener('resize', updateActualImageDimensions);
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', updateActualImageDimensions);
    };
  }, [imageReady]);

  // Calculate AOI position relative to the rendered image with more precise calculations
  const calculateAoiPosition = (coordinates: any) => {
    if (!imageReady || 
        !actualImageRef.current ||
        !originalImageDimensions.width || 
        !originalImageDimensions.height ||
        !imageDimensions.width ||
        !imageDimensions.height) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        display: 'none'
      };
    }
    
    // Get the actual image element's dimensions and position
    const actualImageRect = actualImageRef.current.getBoundingClientRect();
    const containerRect = imageContainerRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
    
    // Calculate the actual horizontal offset of the image within its container
    // This accounts for the fact that the image might not take up 100% of the container width
    const horizontalOffset = actualImageRect.left - containerRect.left;
    const verticalOffset = actualImageRect.top - containerRect.top;
    
    // Calculate the scale factors between original and actual rendered image
    const scaleX = actualImageRect.width / originalImageDimensions.width;
    const scaleY = actualImageRect.height / originalImageDimensions.height;
    
    // Ensure correct coordinate ordering for x and y values
    const validCoords = {
      xmin: Math.min(coordinates.xmin, coordinates.xmax),
      xmax: Math.max(coordinates.xmin, coordinates.xmax),
      ymin: Math.min(coordinates.ymin, coordinates.ymax),
      ymax: Math.max(coordinates.ymin, coordinates.ymax)
    };
    
    // Log for debugging
    console.log('AOI calculation:', {
      horizontalOffset,
      verticalOffset,
      scaleX,
      scaleY,
      originalCoords: coordinates,
      validatedCoords: validCoords,
      calculatedLeft: horizontalOffset + (validCoords.xmin * scaleX),
      calculatedTop: verticalOffset + (validCoords.ymin * scaleY)
    });
    
    // Calculate the positioned coordinates using the actual image position and scale
    return {
      top: verticalOffset + (validCoords.ymin * scaleY),
      left: horizontalOffset + (validCoords.xmin * scaleX),
      width: (validCoords.xmax - validCoords.xmin) * scaleX,
      height: (validCoords.ymax - validCoords.ymin) * scaleY,
      display: 'block'
    };
  };

  // Get the current step to display
  const currentAoiStep = aoiGuidance.length > 0 && currentStep < aoiGuidance.length
    ? aoiGuidance[currentStep]
    : null;

  // Move to next step
  const handleNextStep = () => {
    if (currentStep < aoiGuidance.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Move to previous step
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle finished button click
  const handleFinished = () => {
    // Notify parent component that guidance is complete
    if (onGuidanceComplete) {
      onGuidanceComplete(stepNumber);
    }
    // Close the guidance modal
    onClose();
  };

  // For debugging
  useEffect(() => {
    if (imageReady && actualImageRef.current) {
      const rect = actualImageRef.current.getBoundingClientRect();
      console.log('Rendered image dimensions:', {
        width: rect.width,
        height: rect.height,
        aspectRatio: rect.width/rect.height,
        intrinsicSize: originalImageDimensions,
        intrinsicAspectRatio: originalImageDimensions.width/originalImageDimensions.height
      });
    }
  }, [imageReady, originalImageDimensions, imageDimensions]);

  // Check if the current task type supports AOI guidance
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
            Step {stepNumber} Guidance: <span className={styles.taskType}>{type}</span>
          </h2>
          {supportsAoiGuidance() && aoiGuidance.length > 0 && (
            <div className={styles.stepCounter}>
              Step {currentStep + 1} of {aoiGuidance.length}
            </div>
          )}
        </div>
        
        <div className={styles.guidanceBody}>
          <div className={styles.imageContainer} ref={imageContainerRef}>
            <div 
              ref={imageRef}
              className={styles.imageWrapper}
            >
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
                    setOriginalImageDimensions({
                      width: img.naturalWidth,
                      height: img.naturalHeight
                    });
                    setTimeout(() => setImageReady(true), 100);
                  }
                }}
              />
              
              {/* Overlay highlight for the current AOI step */}
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
        </div>
        
        {/* Show AOI guidance for supported task types */}
        {supportsAoiGuidance() && (
          <div className={styles.aoiGuidance}>
            {loading ? (
              <p>Loading guidance...</p>
            ) : error ? (
              <p className={styles.error}>{error}</p>
            ) : currentAoiStep ? (
              <div className={styles.stepDetails}>
                <h3>{currentAoiStep.stepName}</h3>
                <p>{currentAoiStep.aoiDescription}</p>
                <div className={styles.coordinates}>
                  <h4>Coordinates:</h4>
                  <p>
                    xmin: {currentAoiStep.coordinates.xmin}, 
                    ymin: {currentAoiStep.coordinates.ymin}, 
                    xmax: {currentAoiStep.coordinates.xmax}, 
                    ymax: {currentAoiStep.coordinates.ymax}
                  </p>
                </div>
              </div>
            ) : aoiGuidance.length === 0 && !loading ? (
              <p>No guidance available for this task.</p>
            ) : null}
            
            {aoiGuidance.length > 0 && (
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
            )}
          </div>
        )}
        
        <div className={styles.guidanceFooter}>
          <button 
            className={
              supportsAoiGuidance() && 
              currentStep < aoiGuidance.length - 1
                ? styles.finishedButtonDisabled 
                : styles.finishedButton
            }
            onClick={handleFinished}
            disabled={
              supportsAoiGuidance() && 
              currentStep < aoiGuidance.length - 1
            }
          >
            Finished
          </button>
        </div>
      </div>
    </div>
  );
}

