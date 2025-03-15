import { GetStaticPaths, GetStaticProps } from "next";
import path from "path";
import fs from "fs";
import styles from "../../styles/Question.module.css";

interface QuestionPageProps {
  chart: string;
  questionId: number;
  question: string;
}

export default function QuestionPage({ chart, questionId, question }: QuestionPageProps) {
  return (
    <div className={styles.container}>
      <h1>
        {chart.toUpperCase()} - Question {questionId}
      </h1>
      <p>{question}</p>
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
      const data = JSON.parse(fileContents);
      const questions: string[] = data.questions || [];
      questions.forEach((_, index) => {
        paths.push({
          params: { chart, questionId: (index + 1).toString() },
        });
      });
    }
  });

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const chart = context.params?.chart as string;
  const questionId = parseInt(context.params?.questionId as string, 10);
  const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
  const fileContents = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(fileContents);
  const questions: string[] = data.questions || [];
  const question = questions[questionId - 1] || "";

  return {
    props: {
      chart,
      questionId,
      question,
    },
  };
};
