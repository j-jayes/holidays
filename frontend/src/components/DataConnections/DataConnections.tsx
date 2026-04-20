import { useState } from "react";
import { getApiBaseUrl } from "../../api/baseUrl";

const API_BASE = getApiBaseUrl();

const ODATA_URL = `${API_BASE}/api/v1/odata/`;

const EXPORTS = [
  {
    label: "CSV — Tidy Data",
    description: "Flat table, one row per request. Opens directly in Excel.",
    href: `${API_BASE}/api/v1/exports/leave-requests.csv`,
    icon: "📊",
    filename: "leave-requests.csv",
  },
  {
    label: "JSON",
    description: "Machine-readable array, same enriched fields as the CSV.",
    href: `${API_BASE}/api/v1/exports/leave-requests.json`,
    icon: "{ }",
    filename: "leave-requests.json",
  },
  {
    label: "Excel Live Link (.iqy)",
    description: "Open once in Excel — then use Data → Refresh All to pull the latest data.",
    href: `${API_BASE}/api/v1/exports/leave-requests.iqy`,
    icon: "🔗",
    filename: "leave-requests.iqy",
  },
] as const;

export default function DataConnections() {
  const [copied, setCopied] = useState(false);

  const copyODataUrl = async () => {
    try {
      // Resolve the absolute URL at copy time so it works with relative API_BASE
      const absoluteUrl = new URL(ODATA_URL, window.location.origin).href;
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const el = document.getElementById("odata-url-input") as HTMLInputElement | null;
      el?.select();
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">

      {/* ── Download Exports ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Download Exports</h2>
        <p className="text-xs text-gray-400 mb-4">
          All leave requests — employee email, name, business unit, ISO dates, and status labels.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EXPORTS.map((exp) => (
            <a
              key={exp.filename}
              href={exp.href}
              download={exp.filename}
              className="flex flex-col gap-1.5 rounded-xl border border-gray-100 p-4 hover:border-nexer-light-purple/40 hover:bg-[#f5eefe] transition-colors group no-underline"
            >
              <span className="text-2xl leading-none">{exp.icon}</span>
              <span className="font-semibold text-sm text-gray-800 group-hover:text-nexer-purple transition-colors">
                {exp.label}
              </span>
              <span className="text-xs text-gray-400 leading-snug">{exp.description}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Power Query — Get & Transform ───────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔌</span>
          <h2 className="text-lg font-bold text-gray-800">Power Query — Get &amp; Transform</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Connect Excel directly to live data. Updates whenever you choose
          <strong className="font-medium text-gray-600"> Data → Refresh All</strong> — no
          re-downloading needed.
        </p>

        {/* OData URL copy row */}
        <div className="flex items-center gap-2 mb-5">
          <input
            id="odata-url-input"
            readOnly
            value={new URL(ODATA_URL, window.location.origin).href}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none select-all"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            onClick={copyODataUrl}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors
              ${copied
                ? "bg-green-100 text-green-700"
                : "bg-nexer-light-blue text-nexer-blue hover:bg-nexer-blue hover:text-white"
              }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Step-by-step instructions */}
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Excel step-by-step
        </h3>
        <ol className="flex flex-col gap-2">
          {[
            <>Open Excel and go to <strong>Data → Get Data → From Other Sources → From OData Feed</strong></>,
            <>Paste the URL above and click <strong>OK</strong></>,
            <>In the Navigator, select the <strong>LeaveRequests</strong> table</>,
            <>Click <strong>Load</strong> (or <strong>Transform Data</strong> to customise columns first)</>,
            <>To refresh anytime: <strong>Data → Refresh All</strong></>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-nexer-light-blue text-nexer-blue text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700 leading-snug">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-xs text-gray-400">
          Requires Excel 2016 or later, or Microsoft 365.
        </p>
      </div>
    </div>
  );
}
