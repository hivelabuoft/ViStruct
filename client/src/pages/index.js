import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    axios.get(`${API_URL}/eye-tracker/status`)
      .then(response => {
        setStatus(response.data);
      })
      .catch(error => {
        console.error("Error fetching status:", error);
      });
  }, []);

  return (
    <div>
      <h1>Eye Tracker Status</h1>
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
