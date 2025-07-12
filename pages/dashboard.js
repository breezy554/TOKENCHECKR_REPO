import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [scans, setScans] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('tokencheckr_scans')) || [];
    setScans(saved);
  }, []);

  return (
    <main className="min-h-screen px-4 py-10 bg-black text-white">
      <h1 className="text-3xl font-techno text-velkronCyan mb-6">Scan History</h1>
      {scans.length === 0 ? (
        <p className="text-gray-500">No previous scans found.</p>
      ) : (
        <div className="space-y-4">
          {scans.map((scan, i) => (
            <div key={i} className="bg-zinc-800 p-4 rounded shadow">
              <p className="text-sm text-gray-400">Token: <span className="text-white">{scan.address}</span></p>
              <p className="text-sm">Score: <span className="text-green-300">{scan.score}</span></p>
              <p className="text-xs text-red-400 whitespace-pre-line mt-1">
                {scan.flags.join('\n')}
              </p>
            </div>
          ))}
        </div>
      )}
      <Link href="/" className="inline-block mt-8 text-velkronCyan hover:underline">← Back to Scanner</Link>
    </main>
  );
}
