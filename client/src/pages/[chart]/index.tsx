import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import path from "path";
import fs from "fs";
import styles from "../../styles/Chart.module.css";

interface ChartPageProps {
  chart: string;
  questions: string[];
}

export default function ChartPage({ chart, questions }: ChartPageProps) {
  return (
    <div className={styles.container}>
      <h1>{chart.toUpperCase()} Questions</h1>
      <ul className={styles.questionList}>
        {questions.map((question, index) => (
          <li key={index}>
            <Link legacyBehavior href={`/${chart}/${index + 1}`}>
              <a>{question}</a>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // List of chart routes (must match those in your Home page)
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

  const paths = charts.map((chart) => ({
    params: { chart },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const chart = context.params?.chart as string;
  // Assuming your JSON files are stored in /public/data/
  const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
  const fileContents = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(fileContents);
  const questions = data.questions || [];
  return {
    props: {
      chart,
      questions,
    },
  };
};
