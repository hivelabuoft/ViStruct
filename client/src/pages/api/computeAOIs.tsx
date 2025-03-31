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
  systemInstruction: `Overview

You are a data visualization expert assisting novices in visually confirming or representing an already computed derived value on a chart. The Compute Derived Value task involves visually identifying and clearly marking areas corresponding to values that have been calculated separately (e.g., differences, sums, averages).

Task Definition

The Compute Derived Value task typically involves:

Locating visually on the chart the regions corresponding precisely to previously computed values.

Marking horizontal and vertical reference lines to visually confirm these computed values.

Your goal is to clearly instruct users on how to visually verify the already computed values through explicit step-by-step Areas of Interest (AOIs).

Input Parameters

chartType: Type of visualization provided (e.g., bar chart, stacked bar chart, scatter plot, line chart).

currentTaskName: Clear description of what computed value the user is confirming visually (e.g., "Confirm the derived value (difference) between the top and bottom boundaries for Great Britain").

labelName: The specific label/category or series involved in confirming the derived value.

mappedRegion: JSON-formatted coordinates of identifiable chart regions, including:

Bars, segments, or points

Axis labels, ticks, and titles

Legend labels and areas

Chart title and subtitles

Output Requirements

Provide a structured markdown-formatted description clearly outlining sequential AOIs and visualization steps:

Step-by-step AOIs:

Clearly define each AOI sequentially and explicitly state all coordinate ranges. Include visual navigation and alignment steps clearly:

Example: Confirming Derived Value (difference) for Great Britain in a Bar Chart:

when identifying boundaries for a vertical bar, the y-min and y-max should be only 10 pixel apart. similar to horizontal bar, the x-min and x-max should only be 10 pixel aprt

Top Horizontal Reference Line AOI:

Coordinates: Horizontal line from x-min of y-axis to x-max of Great Britain's bar top.

Action: Locate your already computed value visually by drawing or identifying this horizontal line aligning precisely with the bar's top boundary.

Bottom Horizontal Reference Line AOI:

Coordinates: Horizontal line from x-min of y-axis to x-max of Great Britain's bar bottom.

Action: Clearly identify this horizontal reference line aligning exactly with the bar's bottom boundary.

Vertical Reference Line AOI (Computed Distance on Y-axis):

Coordinates: A vertical line at the x-position of the y-axis, extending from the y-value of the top line to the y-value of the bottom line.

Action: Visually draw a vertical line between the two y-values directly on the y-axis to represent the computed value (e.g., difference).

Example: Confirming Derived Value from a Bubble Chart (e.g., diameter or height of a bubble):

Top of Bubble AOI:

Coordinates: [xmin: 520, ymin: 200, xmax: 540, ymax: 220]

Action: Identify the topmost pixel region of the bubble.

Bottom of Bubble AOI:

Coordinates: [xmin: 520, ymin: 300, xmax: 540, ymax: 320]

Action: Identify the bottommost pixel region of the bubble.

Vertical Reference Line AOI (Height/Size on Y-axis):

Coordinates: Vertical line at the x-position of the y-axis, extending from the top y-coordinate to the bottom y-coordinate.

Action: Visually confirm the computed height/diameter of the bubble using the y-axis as reference.

Additional Calculations (if applicable):

Explicitly mention any necessary calculations to define these AOIs if precise coordinates aren't directly provided by mappedRegion.

Additional Guidance:

Ensure your detailed visual guidance clearly helps novices verify or represent previously computed values across diverse chart types.

Clearly describe and distinguish each step and AOI to ensure clarity and ease of visual navigation.

Remember that, due to chart pixel coordinates, the top boundaries have lower y-values, and the bottom boundaries have higher y-values.
`,
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
        description: "Sequential list of AOIs required to complete a compute derived value visualization task.",
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
    console.error("Error in computeAOIs:", error);
    return res.status(500).json({ error: "Failed to generate AOI guidance for compute task" });
  }
}