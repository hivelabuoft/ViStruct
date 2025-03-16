import Link from "next/link";
import { GetStaticPaths, GetStaticProps } from "next";
import path from "path";
import fs from "fs";
import styles from "../../styles/Chart.module.css";

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
  return (
    <div className={styles.container}>
      <h1>{chart.toUpperCase()} Questions</h1>
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
