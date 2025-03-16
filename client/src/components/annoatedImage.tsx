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
  }
  
  export default function AnnotateImage({ imageUrl, annotations }: AnnotateImageProps) {
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
          const { rectangular, color } = region;
  
          const scaleX = imageSize.width / (imageRef.current?.naturalWidth || 1);
          const scaleY = imageSize.height / (imageRef.current?.naturalHeight || 1);
  
          const left = rectangular.xmin * scaleX;
          const top = rectangular.ymin * scaleY;
          const width = (rectangular.xmax - rectangular.xmin) * scaleX;
          const height = (rectangular.ymax - rectangular.ymin) * scaleY;
  
          return (
            <div
              key={index}
              className={styles.annotationBox}
              style={{
                left,
                top,
                width,
                height,
                borderColor: color || "#00f",
              }}
              title={`Region ${index + 1}`}
            >
              <span className={styles.annotationLabel}>{index + 1}</span>
            </div>
          );
        })}
      </div>
    );
  }
