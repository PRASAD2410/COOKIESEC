function getScoreStyles(score) {
  if (score >= 8) {
    return "bg-emerald-400 text-slate-950";
  }

  if (score >= 5) {
    return "bg-amber-300 text-slate-950";
  }

  return "bg-rose-400 text-white";
}

function getBadgeStyles(isSafe) {
  return isSafe
    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : "border border-rose-400/20 bg-rose-400/10 text-rose-300";
}

function CookieCard({ cookie }) {
  if (!cookie) {
    return null;
  }

  const sameSiteSafe = cookie.SameSite && cookie.SameSite !== "None";

  return (
    <article className="relative rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.3)] backdrop-blur transition hover:-translate-y-1 hover:border-cyan-400/30">
      <div
        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-sm font-black shadow-lg ${getScoreStyles(cookie.security_score)}`}
      >
        {cookie.security_score ?? "--"}
      </div>

      <div className="pr-14">
        <h3 className="text-xl font-bold tracking-tight text-slate-50">
          {cookie.name || "Unknown Cookie"}
        </h3>
        <p className="mt-1 text-sm text-slate-400">{cookie.domain || "N/A"}</p>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-cyan-200 uppercase">
        {cookie.category || "Uncategorized"}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-200">
        {cookie.description || "No description available"}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeStyles(cookie.HttpOnly)}`}>
          HttpOnly: {cookie.HttpOnly ? "YES" : "NO"}
        </span>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeStyles(cookie.Secure)}`}>
          Secure: {cookie.Secure ? "YES" : "NO"}
        </span>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeStyles(sameSiteSafe)}`}>
          SameSite: {cookie.SameSite || "NO"}
        </span>

        {cookie.Sensitive_Leak && (
          <span className="rounded-full border border-rose-500/20 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200">
            Sensitive Data Leak!
          </span>
        )}
      </div>

      <p className="mt-5 border-t border-dashed border-slate-700 pt-4 text-sm italic text-cyan-200/80">
        {cookie.value_pattern || "No pattern detected"}
      </p>
    </article>
  );
}

export default CookieCard;
