function SummaryCard({ score }) {
  if (score === undefined || score === null) {
    return null;
  }

  const numericScore = Number(score) || 0;

  const scoreColor =
    numericScore >= 8
      ? "text-emerald-400"
      : numericScore >= 5
        ? "text-amber-300"
        : "text-rose-400";

  const message =
    numericScore >= 8
      ? "Excellent security posture"
      : numericScore >= 5
        ? "Moderate security"
        : "High risk cookies detected";

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-8 text-center shadow-[0_0_30px_rgba(45,212,255,0.12)] backdrop-blur">
      <h2 className="text-lg font-semibold tracking-wide text-cyan-300">
        Overall Security Score
      </h2>

      <div className="mt-5 flex items-end justify-center gap-2">
        <span className={`text-6xl font-black tracking-tight ${scoreColor}`}>
          {numericScore.toFixed(1)}
        </span>
        <span className="pb-2 text-2xl font-semibold text-slate-400">/10</span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-300">{message}</p>
    </div>
  );
}

export default SummaryCard;
