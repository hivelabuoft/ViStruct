import type { NextApiRequest, NextApiResponse } from "next";

// Import Gemini API libraries
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Configure the model with the required system instructions
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: "Overview\n\nYou are a data visualization expert assisting novices in identifying relevant Areas of Interest (AOIs) required to perform the visualization task: Filter. The Filter task involves selecting or isolating specific subsets of data based on labels or series names in a chart.\n\nTask Definition\n\nThe Filter task typically involves:\n\nSelecting specific categories (e.g., countries, products, years) on one of the axes.\n\nSelecting specific data series identified by the legend (e.g., Gold, Silver, Bronze).\n\nYour goal is to clearly indicate where users should look on the visualization, including necessary step-by-step instructions and any calculations required to accurately identify AOIs.\n\nInput Parameters\n\nchartType: The type of visualization provided (e.g., bar chart, stacked bar chart, line chart, pie chart).\n\ncurrentTaskName: A clear natural language description specifying exactly what needs filtering (e.g., \"Filter for the country 'USA'\", \"Filter by medal type: 'Gold'\").\n\nlabelName: The target label/category or series for filtering. If not provided, it defaults to none.\n\nmappedRegion: JSON-formatted coordinates of each identifiable chart region, including but not limited to:\n\nBars, points, or segments\n\nAxis labels and ticks\n\nAxis titles\n\nLegend labels and legend area\n\nChart title and subtitles\n\nOutput Requirements\n\nProvide a structured markdown-formatted description clearly outlining a sequential step-by-step navigation through AOIs:\n\nStep-by-step AOIs:\n\nClearly define each AOI the user must sequentially reference.\n\nExplicitly state all coordinate ranges from mappedRegion. Perform calculations as needed to determine precise AOI coordinates.\n\nDescribe exactly how users should visually navigate the visualization step-by-step.\n\nExample Step-by-step Output (Detailed):\n\nFiltering by Axis (e.g., Country \"Japan\" in a 100% Stacked Bar Chart):\n\nX-axis Area AOI:\n\nCoordinates: [xmin: 259, ymin: 989, xmax: 978, ymax: 1009]\n\nAction: First, locate the entire area containing the x-axis labels.\n\nSpecific X-axis Label AOI (\"Japan\"):\n\nCalculation: Identify exact coordinates of the label \"Japan\" within the x-axis AOI using the provided mappedRegion.\n\nExample calculated coordinates: [xmin: 300, ymin: 989, xmax: 350, ymax: 1009]\n\nAction: Precisely identify the \"Japan\" label within the axis labels.\n\nVertical Alignment AOI:\n\nCalculation: From the horizontal center of the \"Japan\" label (average of xmin and xmax), draw a vertical line upwards.\n\nCoordinates: Vertical line at X = 325 (center of Japan label), extending from ymax of label upwards.\n\nAction: Visually trace upwards from the \"Japan\" label to locate the corresponding stacked bar.\n\nBar Segment AOI:\n\nCoordinates: [xmin: 224, ymin: 59, xmax: 377, ymax: 978] (full bar area aligned vertically with the \"Japan\" label).\n\nAction: Visually isolate this entire stacked bar region for filtering purposes.\n\nFiltering by Legend (e.g., Series \"Gold\"):\n\nLegend Area AOI:\n\nCoordinates: [X_start: 300, X_end: 400, Y_start: 10, Y_end: 50]\n\nAction: Locate the entire legend region first.\n\nSpecific Legend Series AOI (\"Gold\"):\n\nCalculation: Precisely locate \"Gold\" series label coordinates from the mappedRegion.\n\nExample coordinates: [X_start: 320, X_end: 360, Y_start: 20, Y_end: 30]\n\nAction: Identify and isolate the legend entry for the \"Gold\" series.\n\nCorresponding Chart AOI:\n\nCalculation: Identify all segments or points on the chart corresponding explicitly to the \"Gold\" legend series based on mappedRegion.\n\nCoordinates: Include calculated or directly provided coordinates for each relevant segment.\n\nAction: Clearly identify all chart elements that correspond to the selected legend series.\n\nAdditional Calculations:\n\nExplicitly include any coordinate calculations necessary to pinpoint AOIs, especially when precise coordinates are not directly given by mappedRegion.\n\nEnsure this detailed step-by-step approach allows novices to precisely follow and successfully complete the filtering task across diverse chart types. for the stepNumber, if there are multiple thing user can do at a certain step, make the step number the same. i.e, there could be multiple stepNumber:1, 2 or 3\n\n",
});

// Configure the generation parameters
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        description: "Sequential list of AOIs required to complete a filter visualization task.",
        items: {
          type: "object",
          properties: {
            stepNumber: {
              type: "integer",
              description: "Order number of the step."
            },
            stepName: {
              type: "string",
              description: "Concise name summarizing the purpose of the step."
            },
            aoiDescription: {
              type: "string",
              description: "Detailed explanation of what action the user should take within this AOI."
            },
            calculations: {
              type: "string",
              description: "Optional explanation of calculations performed to determine AOI coordinates. Use null if not applicable."
            },
            coordinates: {
              type: "object",
              description: "Coordinates defining the boundaries of this AOI.",
              properties: {
                xmin: {
                  type: "number",
                  description: "Minimum x-coordinate of the AOI."
                },
                ymin: {
                  type: "number",
                  description: "Minimum y-coordinate of the AOI."
                },
                xmax: {
                  type: "number",
                  description: "Maximum x-coordinate of the AOI."
                },
                ymax: {
                  type: "number",
                  description: "Maximum y-coordinate of the AOI."
                }
              },
              required: [
                "xmin",
                "ymin",
                "xmax",
                "ymax"
              ]
            }
          },
          required: [
            "stepNumber",
            "stepName",
            "aoiDescription",
            "coordinates",
            "calculations"
          ]
        }
      }
    },
    required: [
      "steps"
    ]
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chartType, currentTaskName, labelName, mappedRegions } = req.body;

    // Format the input for the Gemini model
    const prompt = `[chartType] ${chartType}
[currentTaskName] ${currentTaskName}
[labelName] ${labelName || "None"}
[mappedRegions] ${JSON.stringify(mappedRegions)}`;

    // Start a chat session with the Gemini model
    const chatSession = model.startChat({ generationConfig });
    
    // Send the prompt to the model
    const result = await chatSession.sendMessage(prompt);
    const responseText = result.response.text();

    // Parse the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (err) {
      console.error("Error parsing response:", err);
      parsedResponse = { raw: responseText };
    }

    return res.status(200).json(parsedResponse);
  } catch (error) {
    console.error("Error in filterAOIs:", error);
    return res.status(500).json({ error: "Failed to generate AOI guidance" });
  }
}