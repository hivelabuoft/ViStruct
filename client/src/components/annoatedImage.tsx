"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/AnnotatedImage.module.css";

interface Region {
    label: string;
    rectangular: {
      xmin: number;
      ymin: number;
      xmax: number;
      ymax: number;
    };
    color: string;
    barIndex?: number;
    segmentIndex?: number;
  }
  
  interface AnnotationData {
    regions: Region[];
  }
  
  interface AnnotateImageProps {
    imageUrl: string;
    annotations: AnnotationData;
    selectedSegment?: number | null;
  }
  
  export default function AnnotateImage({ imageUrl, annotations, selectedSegment }: AnnotateImageProps) {
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
      width: 1,
      height: 1,
    });
    
    // On image load, get rendered size
    useEffect(() => {
      const img = imageRef.current;
      if (img) {
        const updateSize = () => {
          setImageSize({ width: img.clientWidth, height: img.clientHeight });
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
      }
    }, [imageUrl]);
  
    return (
      <div className={styles.imageWrapper}>
        <img
          src={imageUrl}
          alt="Annotated Chart"
          className={styles.chartImage}
          ref={imageRef}
          onLoad={() => {
            const img = imageRef.current;
            if (img) {
              setImageSize({ width: img.clientWidth, height: img.clientHeight });
            }
          }}
        />
        {annotations?.regions?.map((region, index) => {
          // Skip regions that don't have rectangular coordinates
          if (!region.rectangular) return null;
          
          // console.log("Region", region);

          const { rectangular, color } = region;
  
          const scaleX = imageSize.width / (imageRef.current?.naturalWidth || 1);
          const scaleY = imageSize.height / (imageRef.current?.naturalHeight || 1);
  
          const left = rectangular.xmin * scaleX;
          const top = rectangular.ymin * scaleY;
          const width = (rectangular.xmax - rectangular.xmin) * scaleX;
          const height = (rectangular.ymax - rectangular.ymin) * scaleY;
          
          // Check if this segment is selected
          const isSelected = selectedSegment !== undefined && selectedSegment === index + 1;
  
          return (
            <div
              key={index}
              className={`${styles.annotationBox} ${isSelected ? styles.selectedAnnotation : ''}`}
              style={{
                left,
                top,
                width,
                height,
                borderColor: isSelected ? "#ff3e00" : "#00f",
                borderWidth: isSelected ? "3px" : "1px",
                boxShadow: isSelected ? "0 0 8px rgba(255, 62, 0, 0.7)" : "none"
              }}
              title={`Region ${index + 1}`}
            >
              <span className={`${styles.annotationLabel} ${isSelected ? styles.selectedLabel : ''}`}>
                {index + 1}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

