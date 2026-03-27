import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CookieCard from "./CookieCard.jsx";
import SummaryCard from "./SummaryCard.jsx";
import { downloadReport, scanWebsite } from "../services/api.js";

function Scanner() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startScan = async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Enter a website URL to scan.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await scanWebsite(trimmedUrl);
      setData(response);

      const cookies = Array.isArray(response.cookies) ? response.cookies : [];
      const riskCookies = cookies.filter(
        (cookie) => (cookie?.security_score ?? 0) < 5
      ).length;

      localStorage.setItem(
        "scanData",
        JSON.stringify({
          url: trimmedUrl,
          totalCookies: cookies.length,
          score: response.average_score ?? 0,
          riskCookies,
        })
      );
    } catch (scanError) {
      setData(null);
      setError(scanError.message || "Unable to scan the website.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!data) {
      return;
    }

    try {
      const blob = await downloadReport({
        url: url.trim(),
        score: data.average_score ?? 0,
        aiSummary: data.ai_summary ?? "",
        cookies: Array.isArray(data.cookies) ? data.cookies : [],
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "cookie-security-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download the report.");
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[32px] border border-slate-800/80 bg-slate-950/70 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(45,212,255,0.12),_transparent_38%)] px-6 py-10 sm:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl text-center mx-auto">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
                  🍪 CookieSec
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-50 sm:text-5xl drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">
                  Cookie Security Analyzer
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  Scan any site and review cookie flags, score, and security guidance.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
              >
                View Analytics
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/80 p-3 sm:flex-row">
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              />
              <button
                type="button"
                onClick={startScan}
                disabled={loading}
                className="rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-bold tracking-[0.18em] text-slate-950 uppercase transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Scanning..." : "Scan"}
              </button>
            </div>

            {loading && (
              <div className="mt-6 flex items-center gap-3 text-sm text-cyan-200">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
                <p>Scanning cookies and calculating the security score...</p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
                {error}
              </div>
            )}
          </div>

          {data && (
            <section className="px-6 py-8 sm:px-10">
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <SummaryCard score={data.average_score ?? 0} />

                <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/60 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(45,212,255,0.12)] h-96 flex flex-col">

  <h2 className="text-lg font-semibold tracking-wide text-cyan-300">
    AI Security Summary
  </h2>

  <div className="mt-4 text-sm leading-relaxed text-slate-200 overflow-y-auto flex-1 pr-3 custom-scroll font-mono whitespace-pre-wrap break-words">
    {(data.ai_summary || "No summary available.")
      .replace(/&nbsp;/g, ' ')
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        if (trimmed === '') return null;
        if (trimmed.startsWith('=')) {
          return (
            <div key={index} className="my-3 text-cyan-400/60 tracking-wider">
              {trimmed}
            </div>
          );
        }
        return (
          <div key={index} className="mb-2">
            {line}
          </div>
        );
      })
      .filter(Boolean)}
  </div>

  <button
    type="button"
    onClick={handleDownload}
    className="mt-6 inline-flex items-center justify-center rounded-full bg-linear-to-r from-blue-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-105 hover:shadow-cyan-400/30"
  >
 
                    Download Report
                  </button>
                </div>
              </div>

              <div className="mt-10">
                <div className="flex items-end justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                      Report
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-50">
                      Detailed Cookie Report
                    </h2>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300">
                    {data.cookies?.length || 0} cookies
                  </span>
                </div>

                {Array.isArray(data.cookies) && data.cookies.length > 0 ? (
                  <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {data.cookies.map((cookie, index) => (
                      <CookieCard key={`${cookie.name || "cookie"}-${index}`} cookie={cookie} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-400">
                    No cookies were detected for this URL.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default Scanner;
