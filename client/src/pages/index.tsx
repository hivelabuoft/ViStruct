import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import fs from "fs";
import path from "path";
import Head from "next/head";

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
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState("");

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    
    setIsValidating(true);
    setError("");
    
    try {
      const response = await fetch('/api/checkValidKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      setIsValid(data.isValid);
      if (!data.isValid) {
        setError("Invalid API key. Please try again.");
      }
    } catch (err) {
      setError("An error occurred while validating the API key.");
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      <Head>
        <title>ViStruct</title>
        <meta name="description" content="Visualization Task Browser" />
      </Head>
      <div className={styles.mainContainer}>
        {!isValid ? (
           <div className={styles.container}>
           <div className={styles.apiContainer}>
             <header className={styles.header}>
               <h1 className={styles.title}>ViStruct: Visualization Task Browser</h1>
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
             </div>
           </div>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
              <div className={styles.apiContainer}>
                <h2 className={styles.apiTitle}>Enter Gemini API Key</h2>
                <div className={styles.apiInstructions}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className={styles.apiInput}
                  />
                  {error && (
                    <p className={styles.apiError}>{error}</p>
                  )}
                  <button
                    onClick={validateApiKey}
                    disabled={isValidating || !apiKey.trim()}
                    className={`${styles.apiButton} ${
                      isValidating || !apiKey.trim() ? styles.apiButtonDisabled : ''
                    }`}
                  >
                    {isValidating ? "Validating..." : "Validate API Key"}
                  </button>
                </div>
                <p className={styles.apiHint}>Don't have an API key? Try some of the chart demos below:</p>
                <div className={styles.chartGridWrapper}>
                  <div className={`${styles.chartGrid} ${styles.horizontalLayout}`}>
                    {['100stackedbar', 'bubble', 'line'].map((chartKey) => {
                      const chart = charts.find(c => c.route === chartKey);
                      return (
                        <Link legacyBehavior key={chart?.route} href={`/${chart?.route}`}>
                          <a className={styles.chartCard}>
                            <img src={chart?.image} alt={chart?.name} className={styles.chartImage} />
                            <h2 className={styles.chartName}>{chart?.name}</h2>
                            <button className={styles.viewButton}>View Tasks</button>
                          </a>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className={styles.container}>
            <div className={styles.apiContainer}>
              <div className="w-full bg-gray-100 p-2 mb-4 rounded-md text-center text-sm">
                Using API Key: {apiKey.slice(0, 8)}...{apiKey.slice(-4)}
              </div>
              <header className={styles.header}>
                <h1 className={styles.title}>ViStruct: Visualization Task Browser</h1>
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
              </div>
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
        )}
      </div>
    </>
  );
}

