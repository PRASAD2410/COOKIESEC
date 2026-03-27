import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
);

// 🔒 Secure vs Insecure
export const securityData = (cookies) => {
  let secure = 0;
  let insecure = 0;

  cookies.forEach((c) => (c.secure ? secure++ : insecure++));

  return {
    labels: ["Secure", "Insecure"],
    datasets: [
      {
        label: "Security Status",
        data: [secure, insecure],
        backgroundColor: ["#4CAF50", "#F44336"],
      },
    ],
  };
};

// 🔐 HttpOnly
export const httpOnlyData = (cookies) => {
  let httpOnly = 0;
  let accessible = 0;

  cookies.forEach((c) => (c.httpOnly ? httpOnly++ : accessible++));

  return {
    labels: ["HttpOnly", "Accessible"],
    datasets: [
      {
        label: "HttpOnly Status",
        data: [httpOnly, accessible],
        backgroundColor: ["#2196F3", "#FFC107"],
      },
    ],
  };
};

// ⏳ Expiry
export const expiryData = (cookies) => {
  const now = Date.now() / 1000;

  let short = 0,
    medium = 0,
    long = 0;

  cookies.forEach((c) => {
    const days = (c.expires - now) / 86400;

    if (days <= 1) short++;
    else if (days <= 30) medium++;
    else long++;
  });

  return {
    labels: ["≤1 Day", "≤30 Days", "Long-term"],
    datasets: [
      {
        label: "Cookie Expiry Distribution",
        data: [short, medium, long],
        borderColor: "#673AB7",
        backgroundColor: "rgba(103, 58, 183, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };
};