import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import styles from '../styles/Guidance.module.css';
import Image from 'next/image';

interface GuidanceProps {
  chartImage: string; // Path to chart image
  stepNumber: number; // Current step number
  taskName: string; // Task description
  type: string; // Component type (e.g., "retrieve", "compute")
  chartType: string; // Type of chart (e.g., "bar", "line")
  labelName?: string; // Optional label name
  mappedRegions: any[]; // Mapped regions from breakdown component
  onClose: () => void; // Close callback
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
}: GuidanceProps) {
  useEffect(() => {
    console.log({ chartImage, stepNumber, taskName, type, chartType, labelName, mappedRegions });
  }, [chartImage, stepNumber, taskName, type, chartType, labelName, mappedRegions]);

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
        </div>
        <div className={styles.imageContainer}>
          <Image
            src={chartImage}
            alt={`${chartType} chart`}
            layout="fill"
            objectFit="contain"
            className={styles.chartImage}
          />
        </div>
        <div className={styles.guidanceFooter}>
          <button className={styles.finishedButton} disabled>
            Finished
          </button>
        </div>
      </div>
    </div>
  );
}