import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";




export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract question and chart from the request body.
  const { question, chartType, description } = req.body;

  // Build the shared prompt JSON object.
  let promptObject: { chartType: string; task: string; description: any } = {
    chartType: chartType,
    task: question,
    description: description,
  };

  

  // Stringify the shared prompt for both API calls.
  const promptMessage = JSON.stringify(promptObject);

  const modelType = (process.env.MODEL || "openai").toLowerCase();

  if (modelType === "gemini") {
    try {
      const {
        GoogleGenerativeAI,
        HarmCategory,
        HarmBlockThreshold,
      } = require("@google/generative-ai");

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }
      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction:
          `# Overview:
You are an data visualization experts who is helping novices to breakdown a visualization task into **low level analytical component task** given a visualization type and chart. 
The low level component task taxonomy includes:
1. Retrieve Value
2. Filter
3. Compute Derived Value
4. Find Extremum
5. Sort
6. Determine Range
7. Characterize Distribution
8. Find Anomalies
9. Cluster
10. Correlate 
Your job is to break a given task into the very fundamental steps, until ### there is no lower level to breakdown into ###. 

#Input
You will be provided with a json file containing 
{
    chartType: <the chart type of the visualization>
    task: <high level visalization task to solve>
    description: <a breif description of the data and label encodings the chart contains in json format. >
}

here is an example of json descrption for a 100% stacked bar chart
{
  "title": "Tokyo Olympic 2020 Performance",
  "x_axis": {
    "label": "Countries",
    "categories": ["U.S.A.", "Great Britain", "Japan", "Australia"]
  },
  "y_axis": {
    "label": "Olympic Medals (in %)",
    "range": "0% to 100%"
  },
  "legend": [Gold, Silver, Bronze],
}

each chart description json format will be unique due to the differences in the chart type

#Split into the Lowest-level component task
in an example of find country that has the lowest proportion of Gold medals, you may seperate into [
    {
      "index": 1,
      "taskName": "Retrieve the proportion of Gold medals for each country.",
      "type": "Retrieve Value"
    },
    {
      "index": 2,
      "taskName": "Find the minimum proportion of Gold medals among all countries.",
      "type": "Find Extremum"
    }
  ]

However, these are not the lowest levels. for reteive value of gold medals of each country, one would first identify the segement that represent gold. and then identify the country name, and then retrive value for country1, retrive value for country2. since it is a stackedarea chart, you would have to determine the value for both up and bottom of the segment 
so the workflow would contains some repeative steps. I.e filter the bar of a country, filter the label segement that is gold.  retrive the value of the lower segment, retrive the value of higher segment. compute the derived value. and then repeat the steps for other countries. 

#Output
Your output should contains a JSON with an array of low-level component task to be required to accomplish the task. With the combination of these low level tasks, one could successfully get the solution. Also provide an example workflow of the combination
the output json format should strictly be:
  {
    "components": [
     {
       "index": 1,
       "type": "<refer to the provided 10 low-level component taxonomy>",
       "taskName": "<what to do for this task>"
     },
     {
       "index": 2,
       "type": "<refer to the provided 10 low-level component taxonomy>",
       "taskName": "<what to do for this task>"
     },
    ...
    ],
    "example": [
     1(label name), 2, 1(label name), 3, etc <the workflow of how to use those low level component to combine and get the final visualization task, label name is optional, only include if you apply that task for different labels repeatly. Label name also required if the current task is based on the previous task about a specific label>.
    ]
   }
    if it is a repeated task, you should include the label name in the example array. and do not include the label name in the low level component task array, prevent (e.g.). 
    Prevent to use "repeat XXX" in the low level component task names, as it is not a low level task, the repeated part just need to be mentioned in workflow. 
    Imagine it is like you have multiple types of bricks (components), and you provide some type of combination in workflow to assemable those bricks (example)`,
      });

      const generationConfig = {
        temperature: 0.25,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            components: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: {
                    type: "integer",
                    description: "Unique identifier for the component.",
                  },
                  type: {
                    type: "string",
                    description:
                      "Refers to one of the provided 10 low-level component taxonomy.",
                  },
                  taskName: {
                    type: "string",
                    description:
                      "Describes what the component does for this task.",
                  },
                },
                required: ["index", "type", "taskName"],
              },
            },
            example: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: {
                    type: "number",
                    description: "Component index for the workflow.",
                  },
                  labelName: {
                    type: "string",
                    description:
                      "Optional label name if the task is applied repeatedly for different labels. Label name also required if the current task is based on the previous task about a specific label",
                  },
                },
                required: ["step"],
              },
            },
          },
          required: ["components", "example"],
        },
      };

      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {
                text:
                  "{\n    chartType: '100% Stacked Bar Chart',\n    task: 'Which country has the lowest proportion of Gold medals?',\n    description: {\n      chartType: '<the chart type of the visualization>',\n      task: '<high level visualization task to solve>',\n      description: {\n        \"title\": \"Tokyo Olympic 2020 Performance\",\n        \"x_axis\": { \"label\": \"Countries\", \"categories\": [\"U.S.A.\", \"Great Britain\", \"Japan\", \"Australia\"] },\n        \"y_axis\": { \"label\": \"Olympic Medals (in %)\", \"range\": \"0% to 100%\" },\n        \"legend\": [\"Gold\", \"Silver\", \"Bronze\"]\n      }\n    }\n}"
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text:
                  `{
  "components": [
    {
      "index": 1,
      "taskName": "Identify the bar segments representing 'Gold' medals in the chart legend.",
      "type": "Filter"
    },
    {
      "index": 2,
      "taskName": "Identify a country on the x-axis.",
      "type": "Filter"
    },
    {
      "index": 3,
      "taskName": "Determine the bottom boundary of the 'Gold' segment for the country.",
      "type": "Retrieve Value"
    },
    {
      "index": 4,
      "taskName": "Determine the top boundary of the 'Gold' segment for the country.",
      "type": "Retrieve Value"
    },
    {
      "index": 5,
      "taskName": "Calculate the proportion of 'Gold' medals by subtracting the bottom boundary from the top boundary.",
      "type": "Compute Derived Value"
    },
    {
      "index": 6,
      "taskName": "Find the country with the minimum proportion of 'Gold' medals among all calculated proportions.",
      "type": "Find Extremum"
    }
  ],
  "example": [
    {
      "step": 1
    },
    {
      "step": 2,
      "labelName": "U.S.A."
    },
    {
      "step": 3,
      "labelName": "U.S.A."
    },
    {
      "step": 4,
      "labelName": "U.S.A."
    },
    {
      "step": 5,
      "labelName": "U.S.A."
    },
    {
      "step": 2,
      "labelName": "Great Britain"
    },
    {
      "step": 3,
      "labelName": "Great Britain"
    },
    {
      "step": 4,
      "labelName": "Great Britain"
    },
    {
      "step": 5,
      "labelName": "Great Britain"
    },
    {
      "step": 2,
      "labelName": "Japan"
    },
    {
      "step": 3,
      "labelName": "Japan"
    },
    {
      "step": 4,
      "labelName": "Japan"
    },
    {
      "step": 5,
      "labelName": "Japan"
    },
    {
      "step": 2,
      "labelName": "Australia"
    },
    {
      "step": 3,
      "labelName": "Australia"
    },
    {
      "step": 4,
      "labelName": "Australia"
    },
    {
      "step": 5,
      "labelName": "Australia"
    },
    {
      "step": 6
    }
  ]
}`,
              },
            ],
          },
        ],
      });


      // Send the question to the chat session and await the response.
      const result = await chatSession.sendMessage(promptMessage);
      const generatedText = result.response.text();

      let generatedJSON;
      try {
        generatedJSON = JSON.parse(generatedText);
      } catch (err) {
        generatedJSON = { response: generatedText };
      }
      return res.status(200).json(generatedJSON);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return res.status(500).json({ error: "Failed to generate response with Gemini" });
    }
  } else {
    // Default to OpenAI using the new library syntax
    try {
      const openaiAPIKey = process.env.OPENAI_API_KEY;
      if (!openaiAPIKey) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }
      const client = new OpenAI({ apiKey: openaiAPIKey });
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Generate a JSON object with details for the following question: ${promptMessage}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 1,
        max_completion_tokens: 599,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      const generatedText = completion.choices[0].message.content;
      let generatedJSON;
      if (!generatedText) {
        return res.status(500).json({ error: "Failed to generate response with OpenAI" });
      }
      try {
        generatedJSON = JSON.parse(generatedText);
      } catch (err) {
        generatedJSON = { response: generatedText };
      }
      return res.status(200).json(generatedJSON);
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return res.status(500).json({ error: "Error calling OpenAI" });
    }
  }
}
