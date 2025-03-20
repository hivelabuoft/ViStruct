import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

interface QuestionObject {
  question: string;
  mapping?: Record<string, any>; // You can type this more specifically
}

interface ChartData {
  mapping: any;
  questions: QuestionObject[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chart, questionId } = req.body;
  const dataPath = path.join(process.cwd(), "public", "segment", `${chart}.json`);


  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({ error: "Chart data file not found" });
  }

  const fileContents = fs.readFileSync(dataPath, "utf8");
  const data: ChartData = JSON.parse(fileContents);


  // If mapping already exists, return it
  if (data.mapping) {
    return res.status(200).json({ mapping: data.mapping, simulated: false });
  }

}
