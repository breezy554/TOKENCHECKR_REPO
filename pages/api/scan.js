export default async function handler(req, res) {
  const { address } = req.query;
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  try {
    const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`);
    const data = await response.json();

    if (data.status !== "1") {
      return res.status(404).json({ error: 'Contract not found or not verified.' });
    }

    const contract = data.result[0];
    const source = contract.SourceCode || '';
    const isVerified = source.length > 0;

    const flags = [];

    // Flag logic with severity
    if (/function\s+mint/.test(source)) flags.push({ text: '⚠️ `mint()` — token supply is inflatable', severity: 'HIGH' });
    if (/blacklist/.test(source)) flags.push({ text: '⚠️ `blacklist()` — dev can block users', severity: 'HIGH' });
    if (/setFees/.test(source)) flags.push({ text: '⚠️ `setFees()` — adjustable fees', severity: 'MEDIUM' });
    if (/tx\.origin/.test(source)) flags.push({ text: '⚠️ Uses `tx.origin` — risky for auth', severity: 'HIGH' });
    if (/approve/.test(source) && /require\(msg\.sender !=/.test(source)) flags.push({ text: '🪤 Hidden approval checks', severity: 'HIGH' });
    if (/sellFee\s*>\s*99/.test(source) || /buyFee\s*>\s*99/.test(source)) flags.push({ text: '🔥 High fee behavior — likely honeypot', severity: 'HIGH' });

    const proxyPatterns = [/delegatecall/i, /implementation/i, /upgradeTo/i, /proxyAdmin/i, /function\s+upgrade/i];
    if (proxyPatterns.some(p => p.test(source))) flags.push({ text: '🚨 Possible proxy contract — upgradeable logic detected!', severity: 'MEDIUM' });

    if (/onlyOwner/.test(source)) flags.push({ text: '🔒 Uses `onlyOwner` — centralized control', severity: 'MEDIUM' });
    if (/renounceOwnership/.test(source)) flags.push({ text: '👋 Has `renounceOwnership()` — owner can give up control', severity: 'LOW' });
    if (/transferOwnership/.test(source)) flags.push({ text: '🔄 Has `transferOwnership()` — ownership can be reassigned', severity: 'LOW' });
    if (/owner\s*=\s*address\(0\)/.test(source)) flags.push({ text: '✅ Ownership set to 0x0 — contract may be renounced', severity: 'LOW' });

    const baseScore = 100;
    const score = Math.max(
      baseScore - flags.reduce((penalty, flag) => {
        if (flag.severity === 'HIGH') return penalty + 15;
        if (flag.severity === 'MEDIUM') return penalty + 10;
        if (flag.severity === 'LOW') return penalty + 5;
        return penalty;
      }, 0),
      0
    );

    res.status(200).json({
      name: contract.ContractName,
      compiler: contract.CompilerVersion,
      isVerified,
      flags,
      score,
    });
  } catch (err) {
    console.error('Scan failed:', err);
    res.status(500).json({ error: 'Scan failed. Check network or contract.' });
  }
}
