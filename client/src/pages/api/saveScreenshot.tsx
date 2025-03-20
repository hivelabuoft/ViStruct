import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { image } = req.body;
  if (!image) {
    res.status(400).json({ message: "No image data provided" });
    return;
  }

  // Remove the prefix "data:image/png;base64," from the data URL
  const base64Data = image.replace(/^data:image\/png;base64,/, "");

  // Define the temp directory path (ensure the directory exists)
  const tempDir = path.join(process.cwd(), "api", "temp");

  // Create the directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  } else {
    // Empty the temp folder by deleting all files
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  }

  // Create a unique filename
  const fileName = `chart.png`;
  const filePath = path.join(tempDir, fileName);

  // Write the file (decoding the base64 string)
  fs.writeFileSync(filePath, base64Data, "base64");

  res.status(200).json({ filePath });
}
