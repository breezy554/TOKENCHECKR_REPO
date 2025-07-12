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

    if (/function\s+mint/.test(source)) flags.push('⚠️ `mint()` — token supply is inflatable');
    if (/blacklist/.test(source)) flags.push('⚠️ `blacklist()` — dev can block users');
    if (/setFees/.test(source)) flags.push('⚠️ `setFees()` — adjustable fees');
    if (/tx\.origin/.test(source)) flags.push('⚠️ Uses `tx.origin` — risky for auth');
    if (/approve/.test(source) && /require\(msg\.sender !=/.test(source)) flags.push('🪤 Hidden approval checks');
    if (/sellFee\s*>\s*99/.test(source) || /buyFee\s*>\s*99/.test(source)) flags.push('🔥 High fee behavior — likely honeypot');

    const proxyPatterns = [
      /delegatecall/i,
      /implementation/i,
      /upgradeTo/i,
      /proxyAdmin/i,
      /function\s+upgrade/i
    ];
    const proxyDetected = proxyPatterns.some((pattern) => pattern.test(source));
    if (proxyDetected) flags.push('🚨 Possible proxy contract — upgradeable logic detected!');

    const baseScore = 100;
    const penaltyPerFlag = 15;
    const score = Math.max(baseScore - flags.length * penaltyPerFlag, 0);

    res.status(200).json({
      name: contract.ContractName,
      compiler: contract.CompilerVersion,
      isVerified,
      flags,
      score,
    });
  } catch (err) {
    res.status(500).json({ error: 'Scan failed. Check network or contract.' });
  }
}
