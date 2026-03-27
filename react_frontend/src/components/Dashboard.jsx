import { useNavigate, useLocation } from "react-router-dom";
import { Pie, Line } from "react-chartjs-2";
import {
  securityData,
  httpOnlyData,
  expiryData,
} from "../utils/chart";

// 🔹 ORIGINAL FUNCTION (KEEP SAME)
function getSavedStats() {
  const savedData = localStorage.getItem("scanData");
  const data = savedData ? JSON.parse(savedData) : null;

  if (!data) {
    return {
      totalScans: "--",
      avgScore: "--",
      riskPercent: "--",
    };
  }

  const totalCookies = Number(data.totalCookies) || 0;
  const riskCookies = Number(data.riskCookies) || 0;

  return {
    totalScans: totalCookies,
    avgScore: data.score ?? "--",
    riskPercent:
      totalCookies > 0
        ? `${Math.round((riskCookies / totalCookies) * 100)}%`
        : "0%",
  };
}

// 🔹 ORIGINAL CARD (KEEP SAME)
function StatCard({ value, label }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-center shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/30">
      <div className="text-4xl font-black tracking-tight text-cyan-300">
        {value}
      </div>
      <p className="mt-3 text-sm uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const cookies = location.state?.cookies || [];
  const stats = getSavedStats();

  // Debug: Log the cookies and their scores
  console.log("Dashboard Cookies:", cookies);
  console.log("Security Scores:", cookies.map(c => ({ name: c.name, security_score: c.security_score })));

  // Recalculate risk percentage from actual cookies array
  const riskCookies = cookies.filter(
    (cookie) => (cookie?.security_score ?? 0) < 5
  ).length;
  
  console.log("Risk Cookies (score < 5):", riskCookies);
  console.log("Total Cookies:", cookies.length);
  
  const riskPercent =
    cookies.length > 0
      ? `${Math.round((riskCookies / cookies.length) * 100)}%`
      : "0%";

  console.log("Risk Percent:", riskPercent);

  // Override the stats with recalculated risk percent
  const updatedStats = {
    ...stats,
    riskPercent,
    totalScans: cookies.length || stats.totalScans,
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* 🔥 ORIGINAL HEADER */}
        <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/70 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6">

          <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                CookieSec
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">
                Analytics Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Latest scan metrics saved from the scanner workflow.
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
            >
              Back Home
            </button>
          </div>

          {/* 🔥 ORIGINAL STAT CARDS */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard value={updatedStats.totalScans} label="Total Cookies" />
            <StatCard value={updatedStats.avgScore} label="Average Score" />
            <StatCard value={updatedStats.riskPercent} label="High Risk %" />
          </div>
        </div>

        {/* 🔥 ADD YOUR CHARTS BELOW (NEW SECTION) */}
        {cookies.length > 0 && (
          <div style={{ marginTop: "40px" }}>

            {/* TOP ROW */}
            <div style={rowStyle}>
              <div style={cardStyle}>
                <h3 style={titleStyle}>🔒 Secure vs Insecure</h3>
                <div style={chartBox}>
                  <Pie
                    data={securityData(cookies)}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={titleStyle}>🔐 HttpOnly Cookies</h3>
                <div style={chartBox}>
                  <Pie
                    data={httpOnlyData(cookies)}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>

            {/* BOTTOM CENTER */}
            <div style={centerWrapper}>
              <div style={{ ...cardStyle, width: "100%", maxWidth: "500px" }}>
                <h3 style={titleStyle}>⏳ Expiry Analysis</h3>
                <div style={{ height: "260px" }}>
                  <Line
                    data={expiryData(cookies)}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// 🎨 STYLES (YOUR CHART STYLES ONLY)
const rowStyle = {
  display: "flex",
  gap: "30px",
  justifyContent: "center",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const centerWrapper = {
  display: "flex",
  justifyContent: "center",
  marginTop: "40px",
  padding: "0 10px",
};

const cardStyle = {
  background: "#0f172a",
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid rgba(71, 85, 105, 0.5)",
  width: "100%",
  maxWidth: "400px",
  minWidth: "350px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
};

const chartBox = {
  height: "260px",
  width: "100%",
};

const titleStyle = {
  textAlign: "center",
  marginBottom: "15px",
  color: "#e0f2fe",
  fontWeight: "600",
};

export default Dashboard;