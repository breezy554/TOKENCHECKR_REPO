import { useState } from 'react';
import jsPDF from 'jspdf';

export default function Home() {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [riskScore, setRiskScore] = useState(null);
  const [flags, setFlags] = useState([]);

  const getSeverity = (flag) => {
    const critical = ['proxy', 'selfdestruct', 'mint', 'hidden owner'];
    const warning = ['trading cooldown', 'blacklist', 'transfer limit', 'call()'];
    const suspicious = ['pause', 'reentrancy', 'max tx'];

    const text = flag.toLowerCase();

    if (critical.some(f => text.includes(f))) return 'Critical';
    if (warning.some(f => text.includes(f))) return 'Warning';
    if (suspicious.some(f => text.includes(f))) return 'Suspicious';
    return 'Info';
  };

  const getBadge = (score) => {
    if (score >= 80) return { text: '🚨 HIGH RISK', color: 'bg-red-600' };
    if (score >= 50) return { text: '⚠️ MEDIUM RISK', color: 'bg-yellow-600' };
    return { text: '✅ LOW RISK', color: 'bg-green-600' };
  };

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
          result += `\n\n🚨 Detected Red Flags:\n` + data.flags.map(f => `- ${f}`).join('\n');
        } else {
          result += `\n\n✅ No critical red flags found.`;
        }

        setStatus(result);
        setFlags(data.flags);

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
    const cache = JSON.parse(localStorage.getItem('tokencheckr_ai_cache') || '{}');
    if (cache[address]) {
      setExplanation(cache[address].explanation);
      setRiskScore(cache[address].score);
      return;
    }

    setExplanation('Asking AI...');

    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags, address })
    });

    const data = await res.json();
    setExplanation(data.explanation || 'No explanation returned.');
    setRiskScore(data.score);

    cache[address] = { explanation: data.explanation, score: data.score };
    localStorage.setItem('tokencheckr_ai_cache', JSON.stringify(cache));
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

          {flags.length > 0 && (
            <div className="mt-6 w-full max-w-md text-sm space-y-2">
              <h2 className="font-semibold text-velkronRed">🚨 Detected Flags</h2>
              {flags.map((flag, idx) => {
                const severity = getSeverity(flag);
                const color = {
                  'Critical': 'bg-red-700 text-white',
                  'Warning': 'bg-yellow-600 text-black',
                  'Suspicious': 'bg-orange-500 text-white',
                  'Info': 'bg-gray-600 text-white'
                }[severity];

                return (
                  <div key={idx} className="flex justify-between items-center bg-zinc-800 p-2 rounded">
                    <span>{flag}</span>
                    <span className={`text-xs px-2 py-1 rounded ${color}`}>
                      {severity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 mt-4 flex-wrap">
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
        </>
      )}

      {explanation && (
        <div className="mt-6 p-4 bg-zinc-900 text-sm text-gray-100 rounded max-w-md w-full">
          <p className="mb-1 font-semibold text-velkronCyan">🧠 AI Explanation:</p>
          <p className="whitespace-pre-line mb-3">{explanation}</p>

          {riskScore !== null && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="text-sm font-medium">Risk Score: {riskScore}/100</div>

              <div className="relative w-full max-w-md h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                <div
                  className={`absolute left-0 top-0 h-full ${
                    riskScore >= 80 ? 'bg-red-600'
                    : riskScore >= 50 ? 'bg-yellow-400'
                    : 'bg-green-500'
                  }`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500 w-full max-w-md">
                <span>0 (Safe)</span>
                <span>50</span>
                <span>100 (Danger)</span>
              </div>

              <div
                className={`text-xs font-bold px-2 py-1 rounded mt-1 w-fit ${
                  getBadge(riskScore).color
                }`}
              >
                {getBadge(riskScore).text} — {riskScore}/100
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
