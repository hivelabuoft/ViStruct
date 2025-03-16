import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

interface QuestionObject {
  question: string;
  decomposition?: any;
}

interface ChartData {
  questions: QuestionObject[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Expect chart and questionId in the body
  const { chart, questionId } = req.body;
  const dataPath = path.join(process.cwd(), "public", "data", `${chart}.json`);
  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({ error: "Chart data file not found" });
  }

  // Read the current data
  const fileContents = fs.readFileSync(dataPath, "utf8");
  const data: ChartData = JSON.parse(fileContents);

  const index = parseInt(questionId, 10) - 1;
  if (index < 0 || index >= data.questions.length) {
    return res.status(400).json({ error: "Invalid questionId" });
  }

  // If decomposition already exists, return it
  if (data.questions[index].decomposition) {
    return res.status(200).json(data.questions[index].decomposition);
  }

  // Otherwise, simulate generating a decomposition.
  const dummyDecomposition = {
    components: [
      {
        index: 1,
        type: "Retrieve Value",
        taskName: "Retrieve the value for the first country."
      },
      {
        index: 2,
        type: "Retrieve Value",
        taskName: "Retrieve the value for the second country."
      }
    ],
    example: [
      { step: 1 },
      { step: 2, labelName: "Country A" }
    ]
  };

  // Update the question object with the new decomposition
  data.questions[index].decomposition = dummyDecomposition;
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");

  return res.status(200).json(dummyDecomposition);
}
