import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import fs from "fs";
import path from "path";

interface Chart {
  name: string;
  route: string;
  image: string;
}

interface ChartData {
  questions: any[];
}

const charts: Chart[] = [
  { name: "100% Stacked Bar", route: "100stackedbar", image: "/studyProblem/100stackedBar.png" },
  { name: "Area Chart", route: "area", image: "/studyProblem/area.png" },
  { name: "Bar Chart", route: "bar", image: "/studyProblem/bar.png" },
  { name: "Bubble Chart", route: "bubble", image: "/studyProblem/bubble.png" },
  { name: "Histogram", route: "histogram", image: "/studyProblem/histogram.png" },
  { name: "Line Chart", route: "line", image: "/studyProblem/line.png" },
  { name: "Choropleth Map", route: "map", image: "/studyProblem/map.png" },
  { name: "Pie Chart", route: "pie", image: "/studyProblem/pie.png" },
  { name: "Scatter Plot", route: "scatter", image: "/studyProblem/scatter.png" },
  { name: "Stacked Area Chart", route: "stackedArea", image: "/studyProblem/stackedArea.png" },
  { name: "Stacked Bar Chart", route: "stackedBar", image: "/studyProblem/stackedBar.png" },
  { name: "Treemap", route: "treemap", image: "/studyProblem/treemap.png" }
];

// Function to get total questions count from all data files
export async function getStaticProps() {
  let totalQuestions = 0;
  
  for (const chart of charts) {
    const dataPath = path.join(process.cwd(), "public", "data", `${chart.route}.json`);
    if (fs.existsSync(dataPath)) {
      const fileContents = fs.readFileSync(dataPath, "utf8");
      const data: ChartData = JSON.parse(fileContents);
      totalQuestions += data.questions.length;
    }
  }

  return {
    props: {
      totalQuestions
    }
  };
}

export default function Home({ totalQuestions }: { totalQuestions: number }) {
  return (
    <div className={styles.mainContainer}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Visualization Task Browser</h1>
          
          <p className={styles.description}>
            Explore a collection of chart visualization tasks selected from VLAT and Mini-VLAT benchmarks.
            Each card represents a different chart type with various analytical tasks.
          </p>
        </header>
        
        <div className={styles.contentWrapper}>
          <div className={styles.infoSection}>
            <h2>About the Tasks</h2>
            <div className={styles.stats}>
              <p className={styles.statsText}>
                Total questions across all charts: <span className={styles.statsNumber}>{totalQuestions}</span>
              </p>
            </div>
            <p>
              These chart and visualization tasks are selected from the following visualization literacy assessment tools:
            </p>
            <p>
              <strong>VLAT:</strong> The Visualization Literacy Assessment Test - <a href="https://www.bckwon.com/publication/vlat/" className={styles.sourceLink} target="_blank" rel="noopener noreferrer">https://www.bckwon.com/publication/vlat/</a>
            </p>
            <p>
              <strong>Mini-VLAT:</strong> A lightweight version of VLAT - <a href="https://washuvis.github.io/minivlat/" className={styles.sourceLink} target="_blank" rel="noopener noreferrer">https://washuvis.github.io/minivlat/</a>
            </p>
          </div>
          
          <div className={styles.chartGridWrapper}>
            <div className={styles.chartGrid}>
              {charts.map((chart) => (
                <Link legacyBehavior key={chart.route} href={`/${chart.route}`}>
                  <a className={styles.chartCard}>
                    <img src={chart.image} alt={chart.name} className={styles.chartImage} />
                    <h2 className={styles.chartName}>{chart.name}</h2>
                    <button className={styles.viewButton}>View Tasks</button>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

