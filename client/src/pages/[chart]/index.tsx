import Link from "next/link";
import { GetStaticPaths, GetStaticProps } from "next";
import path from "path";
import fs from "fs";
import styles from "../../styles/Chart.module.css";
import ChartImageContainer from "../../components/chartImageContainer";
import Head from "next/head";

interface QuestionObject {
  question: string;
  decomposition?: any;
}

interface ChartData {
  questions: QuestionObject[];
}

interface ChartPageProps {
  chart: string;
  questions: QuestionObject[];
}

export default function ChartPage({ chart, questions }: ChartPageProps) {
  // Display the chart name in a more readable format
  const formatChartName = (name: string) => {
    if (name === "100stackedbar") return "100% Stacked Bar Chart";
    if (name === "stackedArea") return "Stacked Area Chart";
    if (name === "stackedBar") return "Stacked Bar Chart";
    
    return name
      .split(/(?=[A-Z])/)
      .join(" ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) + " Chart";
  };

  return (
    <>
      <Head>
        <title>ViStruct - {formatChartName(chart)}</title>
        <meta name="description" content={`${formatChartName(chart)} visualization tasks`} />
      </Head>
      <div className={styles.pageContainer}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.pageTitle}>{formatChartName(chart)}</h1>
        </div>
        
        <div className={styles.contentWrapper}>
          <div className={styles.questionsSection}>
            <h2>Questions ({questions.length})</h2>
            <ul className={styles.questionList}>
              {questions.map((q, index) => (
                <li key={index}>
                  <Link legacyBehavior href={`/${chart}/${index + 1}`}>
                    <a>
                      {typeof q.question === 'string' ? q.question : JSON.stringify(q.question)}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.chartSection}>
            <div className={styles.chartImageWrapper}>
              <ChartImageContainer 
                src={`/studyProblem/${chart}.png`} 
                alt={`${chart} chart`} 
              />
            </div>
            
            <div className={styles.sourceInfo}>
              <p>
                These chart visualization tasks are selected from the 
                <a href="https://www.bckwon.com/publication/vlat/" className={styles.sourceLink} target="_blank" rel="noopener noreferrer"> VLAT </a> 
                and 
                <a href="https://washuvis.github.io/minivlat/" className={styles.sourceLink} target="_blank" rel="noopener noreferrer"> Mini-VLAT </a> 
                visualization literacy assessment tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const charts = [
    "100stackedbar",
    "area",
    "bar",
    "bubble",
    "histogram",
    "line",
    "map",
    "pie",
    "scatter",
    "stackedArea",
    "stackedBar",
    "treemap",
  ];

  let paths: { params: { chart: string; questionId: string } }[] = [];

  charts.forEach((chart) => {
    const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
    if (fs.existsSync(dataPath)) {
      const fileContents = fs.readFileSync(dataPath, "utf8");
      const data: ChartData = JSON.parse(fileContents);
      data.questions.forEach((_, index) => {
        paths.push({ params: { chart, questionId: (index + 1).toString() } });
      });
    }
  });

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const chart = context.params?.chart as string;
  const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
  const fileContents = fs.readFileSync(dataPath, "utf8");
  const data: ChartData = JSON.parse(fileContents);

  return {
    props: {
      chart,
      questions: data.questions,
    },
  };
};
