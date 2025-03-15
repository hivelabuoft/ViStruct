// import { useState, useEffect } from "react";
// import axios from "axios";

// const API_URL = process.env.NEXT_PUBLIC_API_URL;

// export default function Home() {
//   const [status, setStatus] = useState("");

//   useEffect(() => {
//     axios.get(`${API_URL}/eye-tracker/status`)
//       .then(response => {
//         setStatus(response.data);
//       })
//       .catch(error => {
//         console.error("Error fetching status:", error);
//       });
//   }, []);

//   return (
//     <div>
//       <h1>Eye Tracker Status</h1>
//       <pre>{JSON.stringify(status, null, 2)}</pre>
//     </div>
//   );
// }

import Link from "next/link";
import styles from "../styles/Home.module.css";

interface Chart {
  name: string;
  route: string;
  image: string;
}

const charts: Chart[] = [
  { name: "100% Stacked Bar", route: "100stackedbar", image: "/studyProblem/100stackedBar.png" },
  { name: "Area Chart", route: "area", image: "/studyProblem/area.png" },
  { name: "Bar Chart", route: "bar", image: "/studyProblem/bar.png" },
  { name: "Bubble Chart", route: "bubble", image: "/studyProblem/bubble.png" },
  { name: "Histogram", route: "histogram", image: "/studyProblem/histogram.png" },
  { name: "Line Chart", route: "line", image: "/studyProblem/line.png" },
  { name: "Choropleth Map", route: "map", image: "/studyProblem/map.png" },
  { name: "Pie Chart", route: "pie", image: "/studyProblem/pie.png" },
  { name: "Scatter Plot", route: "scatter", image: "/studyProblem/scatter.png" },
  { name: "Stacked Area Chart", route: "stackedArea", image: "/studyProblem/stackedArea.png" },
  { name: "Stacked Bar Chart", route: "stackedBar", image: "/studyProblem/stackedBar.png" },
  { name: "Treemap", route: "treemap", image: "/studyProblem/treemap.png" }
];

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>Choose a Chart</h1>
      <div className={styles.chartGrid}>
        {charts.map((chart) => (
          <Link legacyBehavior key={chart.route} href={`/${chart.route}`}>
          <a className={styles.chartCard}>
            <img src={chart.image} alt={chart.name} className={styles.chartImage} />
            <h2>{chart.name}</h2>
          </a>
        </Link>
        ))}
      </div>
    </div>
  );
}

