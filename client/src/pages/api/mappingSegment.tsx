import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

// Gemini SDKs
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: `###Overview
You are a data visualization expert. Given a chart image, your goal is to analyze and break it down into its visual components.

#Input
You will be provided with a json file containing 

[ChartDescription]
{
  chartType: <the chart type of the visualization>
  task: <high level visalization task to solve>
  description: <brief description of the chart structure>
}

You will also be given a JSON file containing regions (e.g., x-axis, y-axis, title, bars, segments).

[Regions]
{
  "regions": [list of regions]
}

Your task is to identify and describe each region, returning a JSON like:
{
  mapping: [
    { segmentNumber: 1, description: "Stacked bar segment for Bronze medals for Australia" },
    ...
  ]
}
Note: Number of mapping elements must match regions count.`,
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      mapping: {
        type: "array",
        items: {
          type: "object",
          properties: {
            segmentNumber: {
              type: "integer",
              description: "Unique identifier for each chart segment or component.",
            },
            description: {
              type: "string",
              description: "Detailed description of the chart segment or element.",
            },
          },
          required: ["segmentNumber", "description"],
        },
      },
    },
    required: ["mapping"],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chartdescription, regions} = req.body;

    const imageURL = "temp/chart.png";


    // Build the prompt text and include the image URL if available.
    const chartDescriptionText = `[ChartDescription]: ${JSON.stringify(chartdescription)}
    [Regions]: ${JSON.stringify(regions)}
    ${imageURL ? `[ChartImage]: ${imageURL}` : ""}`;

    // Start the chat session using the generation config.
    const chatSession = model.startChat({ generationConfig });
    const result = await chatSession.sendMessage(chartDescriptionText);
    // console.log(chartDescriptionText);
    const responseText = result.response.text();

    // Try to parse the response as JSON
    let parsedJSON;
    try {
      parsedJSON = JSON.parse(responseText);
    } catch (err) {
      parsedJSON = { raw: responseText };
    }

    return res.status(200).json(parsedJSON);
  } catch (error) {
    console.error("Error in mappingSegment:", error);
    return res.status(500).json({ error: "Failed to generate mapping" });
  }
}
