import React, { useState } from "react";
import { FaSearchPlus, FaSearchMinus, FaExpand, FaTimes } from "react-icons/fa";
import styles from "../styles/ChartImageContainer.module.css";

interface ChartImageContainerProps {
  src: string;
  alt: string;
}

export default function ChartImageContainer({ src, alt }: ChartImageContainerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleZoomIn = () => {
    setZoom((prev) => prev + 0.1);
  };

  const handleZoomOut = () => {
    setZoom((prev) => (prev > 0.2 ? prev - 0.1 : prev));
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className={styles.chartImageContainer}>
        <img
          src={src}
          alt={alt}
          className={styles.chartImage}
          style={{ transform: `scale(${zoom})` }}
        />
        <div className={styles.zoomButtons}>
          <button onClick={handleZoomIn} className={styles.zoomButton}>
            <FaSearchPlus />
          </button>
          <button onClick={handleZoomOut} className={styles.zoomButton}>
            <FaSearchMinus />
          </button>
          <button onClick={openModal} className={styles.zoomButton}>
            <FaExpand />
          </button>
        </div>
      </div>
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalButton} onClick={closeModal}>
              <FaTimes />
            </button>
            <img src={src} alt={alt} className={styles.modalImage} />
          </div>
        </div>
      )}
    </>
  );
}
