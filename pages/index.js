import { useState } from 'react';
import jsPDF from 'jspdf';

export default function Home() {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [riskScore, setRiskScore] = useState(null);
  const [flags, setFlags] = useState([]);
  const [eli5, setEli5] = useState(false);
  const [profile, setProfile] = useState('auditor');

  const handleScan = async () => {
    setStatus('');
    setExplanation('');
    setRiskScore(null);
    setFlags([]);
    setLoading(true);

    try {
      const res = await fetch(`/api/scan?address=${address}`);
      const data = await res.json();

      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        let result = `✅ ${data.name || 'Token'} is ${data.isVerified ? 'verified' : 'unverified'}.\nCompiler: ${data.compiler}\n\n🔎 Risk Score: ${data.score}/100`;

        if (data.flags.length > 0) {
          result += `\n\n🚨 Detected Red Flags:\n` + data.flags.map((f, i) => <li key={i}>{f}</li>);
        } else {
          result += `\n\n✅ No critical red flags found.`;
        }

        setStatus(result);
        setFlags(data.flags);
        setRiskScore(data.score);

        const savedScans = JSON.parse(localStorage.getItem('tokencheckr_scans')) || [];
        savedScans.unshift({ address, score: data.score, flags: data.flags });
        localStorage.setItem('tokencheckr_scans', JSON.stringify(savedScans.slice(0, 20)));
      }
    } catch (e) {
      setStatus('❌ Failed to scan contract.');
    }

    setLoading(false);
  };

  const explainFlags = async () => {
    setExplanation('Asking AI...');

    const cacheKey = `${address}_${eli5}_${profile}`;
    const cache = JSON.parse(localStorage.getItem('tokencheckr_ai_cache') || '{}');
    if (cache[cacheKey]) {
      setExplanation(cache[cacheKey].explanation);
      setRiskScore(cache[cacheKey].score);
      return;
    }

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags, address, eli5, profile })
      });

      const data = await res.json();

      if (!data.explanation) {
        setExplanation('❌ No explanation returned.');
      } else {
        setExplanation(data.explanation);
        if (data.score !== undefined) {
          setRiskScore(data.score);
        }

        cache[cacheKey] = { explanation: data.explanation, score: data.score };
        localStorage.setItem('tokencheckr_ai_cache', JSON.stringify(cache));
      }
    } catch (e) {
      setExplanation('❌ AI error.');
    }
  };

  const downloadCSV = (text) => {
    const blob = new Blob([text.replace(/\n/g, '\r\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token-scan.csv';
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text('TokenCheckr Scan Report', 20, 20);
    const lines = status.split('\n');
    lines.forEach((line, i) => doc.text(line, 20, 30 + i * 8));
    if (explanation) {
      doc.text('AI Explanation:', 20, 30 + lines.length * 8 + 8);
      doc.text(explanation, 20, 30 + lines.length * 8 + 16);
    }
    doc.save('token-report.pdf');
  };

  const getBadge = (score) => {
    if (score >= 80) return { text: '🚨 HIGH RISK', color: 'bg-red-600' };
    if (score >= 50) return { text: '⚠️ MEDIUM RISK', color: 'bg-yellow-600' };
    return { text: '✅ LOW RISK', color: 'bg-green-600' };
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-black text-white">
      <h1 className="text-4xl font-techno text-velkronCyan mb-4">TokenCheckr</h1>
      <p className="text-center text-gray-400 max-w-md mb-8">
        Paste a token contract address to scan for rug pulls, honeypots, proxy patterns, and suspicious functions.
      </p>

      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x..."
        className="w-full max-w-md px-4 py-2 mb-4 rounded border border-gray-600 bg-black text-white focus:outline-none focus:ring-2 focus:ring-velkronCyan"
      />

      <button
        onClick={handleScan}
        disabled={!address || loading}
        className="bg-velkronCyan text-black font-semibold px-6 py-2 rounded hover:bg-cyan-300 transition disabled:opacity-50"
      >
        {loading ? 'Scanning...' : 'Scan Token'}
      </button>

      {status && (
        <>
          <pre className="mt-6 text-sm text-green-400 whitespace-pre-wrap text-left max-w-md">{status}</pre>

          <div className="flex flex-col gap-3 mt-4 w-full max-w-md">
            <div className="flex items-center justify-between text-sm text-gray-300">
              <label className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={eli5}
                  onChange={() => setEli5(!eli5)}
                  className="accent-velkronCyan"
                />
                Explain Like I’m 5
              </label>

              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="px-2 py-1 rounded bg-zinc-800 text-white border border-zinc-600 text-sm"
              >
                <option value="auditor">🧠 Auditor</option>
                <option value="developer">👨‍💻 Developer</option>
                <option value="beginner">🪄 Beginner</option>
              </select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={explainFlags}
                className="bg-velkronRed text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Explain Flags with AI
              </button>
              <button
                onClick={() => downloadCSV(status)}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Download CSV
              </button>
              <button
                onClick={exportPDF}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Export PDF
              </button>
            </div>
          </div>
        </>
      )}

      {explanation && (
        <div className="mt-6 p-4 bg-zinc-900 text-sm text-gray-100 rounded max-w-md w-full">
          <p className="mb-1 font-semibold text-velkronCyan">🧠 AI Explanation:</p>
          <p className="whitespace-pre-line mb-3">{explanation}</p>

          {riskScore !== null && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-sm font-medium">Risk Score: {riskScore}/100</div>
              <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-in-out ${
                    riskScore >= 80 ? 'bg-red-600' : riskScore >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded w-fit mt-1 text-white ${getBadge(riskScore).color}`}>
                {getBadge(riskScore).text} — {riskScore}/100
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
