import type { NextApiRequest, NextApiResponse } from 'next';
const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required', isValid: false });
  }

  try {
    // Try to initialize the API with the provided key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Try to make a simple API call to validate the key
    await model.generateContent("test");
    
    // If we get here, the key is valid
    return res.status(200).json({ isValid: true });
  } catch (error) {
    console.error('API Key validation error:', error);
    return res.status(200).json({ isValid: false });
  }
}