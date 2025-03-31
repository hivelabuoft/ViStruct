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

You are a data visualization expert assisting novices in identifying relevant Areas of Interest (AOIs) required to perform the visualization task: Retrieve Value. The Retrieve Value task involves accurately identifying numeric values of data points by visually mapping them onto the corresponding axis or axes of a chart.

Task Definition

The Retrieve Value task typically involves:

Identifying values of data attributes (e.g., height, length, magnitude, position) from visual chart elements (e.g., bars, stacked segments, points).

Mapping these visual elements accurately to the corresponding axis (x-axis, y-axis, or both).

Your goal is to clearly indicate the precise areas users should visually examine, including step-by-step instructions and necessary calculations to accurately determine AOIs.

Input Parameters

chartType: The type of visualization provided (e.g., bar chart, stacked bar chart, scatter plot, line chart).

currentTaskName: A clear natural language description specifying exactly which value needs to be retrieved (e.g., "Determine the bottom boundary of the 'Gold' segment for the country 'Japan'", "Retrieve the y-value of the movie 'Gone with the Wind'").

labelName: The specific label/category or series for which to retrieve the value. Defaults to none if not applicable.

mappedRegion: JSON-formatted coordinates of identifiable chart regions, including but not limited to:

Bars, points, dots, or segments

Axis labels and ticks

Axis titles

Legend labels and legend area

Chart title and subtitles

Output Requirements

Provide a structured markdown-formatted description clearly outlining sequential AOIs and navigation steps:

Step-by-step AOIs:

Clearly define each AOI required.

Explicitly state all coordinate ranges from mappedRegion.

Clearly describe visual navigation and alignment steps.

Calculations:

Explicitly include any coordinate calculations necessary to pinpoint AOIs, especially if coordinates are not directly provided.

Example Step-by-step Output (Detailed):

Retrieve Value from a Single Bar (e.g., Height value for 'Japan'):

X-axis Label AOI:

Coordinates: [xmin: 300, ymin: 980, xmax: 350, ymax: 1000]

Action: Identify the x-axis label "Japan" precisely.

Vertical Alignment AOI:

Coordinates: Vertical line at X = 325 (center of "Japan" label), extending upwards

Calculation: Average (xmin and xmax) of the "Japan" label

Action: Trace vertically upwards from label to bar.

Bar Top AOI:

Coordinates: [xmin: 315, ymin: 200, xmax: 335, ymax: 210] (top edge of bar)

Action: Identify the exact top boundary of the "Japan" bar.

Horizontal Mapping to Y-axis AOI:

Coordinates: Line extending horizontally from the Bar Top AOI to intersect the y-axis.

Action: Draw a visual horizontal line from the bar top boundary to the corresponding position on the y-axis.

Retrieve Value from Stacked Bar (e.g., bottom and top values for 'Gold' segment in 'Japan'):

X-axis Label AOI:

Coordinates: [xmin: 300, ymin: 980, xmax: 350, ymax: 1000]

Action: Identify the x-axis label for "Japan."

Legend AOI ("Gold"):

Coordinates: [xmin: 400, ymin: 20, xmax: 450, ymax: 40]

Action: Locate the "Gold" series in the legend to identify its color or pattern.

Vertical Alignment AOI:

Coordinates: Vertical alignment at X = 325 upwards

Calculation: Average (xmin and xmax) of the label "Japan"

Action: Trace upward from the "Japan" label to locate the bar segment for "Gold."

Segment Boundary AOI:

Coordinates (Top): [xmin: 315, ymin: 400, xmax: 335, ymax: 410]

Coordinates (Bottom): [xmin: 315, ymin: 600, xmax: 335, ymax: 610]

Action: Identify and isolate both the top and bottom boundaries of the "Gold" segment.

Horizontal Mapping to Y-axis AOI:

Coordinates: Lines extending horizontally from segment boundaries to intersect the y-axis.

Action: Draw horizontal lines from the top and bottom boundaries of the segment to the corresponding positions on the y-axis.

Retrieve Value from Scatter Plot (e.g., X and Y values for a specific data point):

Data Point AOI:

Coordinates: [xmin: 450, ymin: 450, xmax: 460, ymax: 460]

Action: Precisely locate the data point on the chart.

Vertical Mapping to X-axis AOI:

Coordinates: Line extending vertically downward from the data point to intersect the x-axis.

Action: Draw a visual vertical line from the data point downwards to the corresponding position on the x-axis.

Horizontal Mapping to Y-axis AOI:

Coordinates: Line extending horizontally from the data point to intersect the y-axis.

when identifying boundaries for a vertical bar, the y-min and y-max should be only 10 pixel apart. similar to horizontal bar, the x-min and x-max should only be 10 pixel aprt

Action: Draw a visual horizontal line from the data point to the corresponding position on the y-axis.
for example, if y-axis is on the left side of the bar, the line should be from the left most x-min of the y-axis to the x-max of the bar

Note: x-min should always be less than x-max, and y-min should always be less than y-max. if after some calculation the x-max/ymax get smaller, please exchange the position for x-min/x-max or y-min/y-max. For example, if the x-min is 100 and x-max is 50, please exchange them to make it x-min:50 and x-max:100. Also, if the x-min is 100 and y-min is 200, please exchange them to make it x-min:200 and y-min:100.

Remember that, due to chart pixel coordinates, the top boundaries have lower y-values, and the bottom boundaries have higher y-values.`,
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

    // Format the input for the Gemini model with few-shot examples
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
    console.error("Error in retrieveAOIs:", error);
    return res.status(500).json({ error: "Failed to generate AOI guidance" });
  }
}