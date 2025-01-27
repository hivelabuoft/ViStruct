import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/eye-tracker/status")
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
