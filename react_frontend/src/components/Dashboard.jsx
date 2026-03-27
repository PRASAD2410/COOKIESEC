import { useNavigate } from "react-router-dom";

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
      totalCookies > 0 ? `${Math.round((riskCookies / totalCookies) * 100)}%` : "0%",
  };
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-center shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/30">
      <div className="text-4xl font-black tracking-tight text-cyan-300">{value}</div>
      <p className="mt-3 text-sm uppercase tracking-[0.22em] text-slate-400">{label}</p>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const stats = getSavedStats();

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
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
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
            >
              Back Home
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard value={stats.totalScans} label="Total Cookies" />
            <StatCard value={stats.avgScore} label="Average Score" />
            <StatCard value={stats.riskPercent} label="High Risk %" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
