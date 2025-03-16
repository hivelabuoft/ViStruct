import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaPlay } from "react-icons/fa";
import axios from "axios";
import styles from "../../../styles/Breakdown.module.css";
import AnnotateImage from "@/src/components/annoatedImage";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BreakdownPage() {
  const router = useRouter();
  const { chart, questionId } = router.query;
  const [analysisOutput, setAnalysisOutput] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to analyze image by sending it to the Python backend.
  async function analyzeImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    // Adjust the URL if needed (e.g., if running locally)
    const response = await axios.post(`${API_URL}/breakdown_image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data; // JSON with detected regions
  }

  useEffect(() => {
    async function fetchAnalysis() {
      if (!chart) return;
      try {
        setIsLoading(true);
        // Fetch the image as blob from the public folder.
        const imageResponse = await fetch(`/studyProblem/${chart}.png`);
        const blob = await imageResponse.blob();
        // Convert blob to a File.
        const file = new File([blob], `${chart}.png`, { type: blob.type });
        const result = await analyzeImage(file);
        setAnalysisOutput(result);
      } catch (error) {
        console.error("Error analyzing image:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalysis();
  }, [chart]);

  return (
    <div className={styles.container}>
      <div className={styles.leftDiv}>
        <AnnotateImage
            imageUrl={`/studyProblem/${chart}.png`}
            annotations={analysisOutput}
        />
      </div>
      <div className={styles.rightDiv}>
        <h2>Right Side Panel - Analysis Output</h2>
        {isLoading ? (
          <p>Loading analysis...</p>
        ) : analysisOutput ? (
          <pre>{JSON.stringify(analysisOutput, null, 2)}</pre>
        ) : (
          <p>No analysis available.</p>
        )}
        <Link legacyBehavior href={`/${chart}/${questionId}/guidance`}>
          <button className={styles.runButton}>
            <FaPlay /> &nbsp; Run Guidance
          </button>
        </Link>
      </div>
    </div>
  );
}
