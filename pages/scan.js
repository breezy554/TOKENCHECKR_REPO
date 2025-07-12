import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function ScanPage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const scanToken = async (address) => {
    setStatus('');
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

        if (data.flags.some(f => f.toLowerCase().includes('proxy'))) {
          result += `\n\n⚠️ This contract may be upgradeable. Review with caution.`;
        }

        setStatus(result);
      }
    } catch (e) {
      setStatus('❌ Failed to scan contract.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (token && /^0x[a-fA-F0-9]{40}$/.test(token)) {
      scanToken(token);
    } else if (token) {
      setStatus('❌ Invalid token address.');
    }
  }, [token]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-black text-white">
      <h1 className="text-4xl font-techno text-velkronCyan mb-4">TokenCheckr</h1>
      <p className="text-center text-gray-400 max-w-md mb-8">
        Scanning token: <span className="text-white">{token || '...'}</span>
      </p>

      {loading ? (
        <p className="text-cyan-300">Scanning...</p>
      ) : (
        status && <pre className="text-sm text-green-400 whitespace-pre-wrap text-left max-w-md">{status}</pre>
      )}
    </main>
  );
}
