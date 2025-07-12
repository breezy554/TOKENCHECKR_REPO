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

    // 🔎 Red flag checks
    if (/function\s+mint/.test(source)) flags.push('⚠️ `mint()` — token supply is inflatable');
    if (/blacklist/.test(source)) flags.push('⚠️ `blacklist()` — dev can block users');
    if (/setFees/.test(source)) flags.push('⚠️ `setFees()` — adjustable fees');
    if (/tx\.origin/.test(source)) flags.push('⚠️ Uses `tx.origin` — risky for auth');
    if (/approve/.test(source) && /require\(msg\.sender !=/.test(source)) flags.push('🪤 Hidden approval checks');
    if (/sellFee\s*>\s*99/.test(source) || /buyFee\s*>\s*99/.test(source)) flags.push('🔥 High fee behavior — likely honeypot');

    // 🧬 Proxy pattern detection
    const proxyPatterns = [
      /delegatecall/i,
      /implementation/i,
      /upgradeTo/i,
      /proxyAdmin/i,
      /function\s+upgrade/i
    ];
    if (proxyPatterns.some(p => p.test(source))) {
      flags.push('🚨 Possible proxy contract — upgradeable logic detected!');
    }

    // 🔐 Ownership checks
    if (/onlyOwner/.test(source)) flags.push('🔒 Uses `onlyOwner` — centralized control');
    if (/renounceOwnership/.test(source)) flags.push('👋 Has `renounceOwnership()` — owner can give up control');
    if (/transferOwnership/.test(source)) flags.push('🔄 Has `transferOwnership()` — ownership can be reassigned');
    if (/owner\s*=\s*address\(0\)/.test(source)) flags.push('✅ Ownership set to 0x0 — contract may be renounced');

    // 🔎 Bytecode analysis
    const byteRes = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`);
    const byteData = await byteRes.json();
    const bytecode = byteData.result || '';

    const permissionPatterns = [
      { pattern: /selfdestruct|suicide/i, label: '💣 Self-destruct capability detected' },
      { pattern: /delegatecall/i, label: '🔗 Uses `delegatecall` — unsafe upgrade pattern' },
      { pattern: /tx\.origin/i, label: '📛 Uses `tx.origin` — risky authentication' },
      { pattern: /mint/i, label: '⚠️ Can mint new tokens (bytecode)' },
      { pattern: /burn/i, label: '🔥 Can burn tokens (bytecode)' },
      { pattern: /call\(/i, label: '⚠️ Uses raw `call()` — may be arbitrary' },
      { pattern: /transferOwnership/i, label: '🔄 Transfer ownership function exists' }
    ];

    permissionPatterns.forEach(({ pattern, label }) => {
      if (pattern.test(bytecode)) flags.push(label);
    });


    // 🧠 Risk score calculation
    const baseScore = 100;
    const penaltyPerFlag = 15;
    const score = Math.max(baseScore - flags.length * penaltyPerFlag, 0);

    // ✅ Final response
    res.status(200).json({
  name: contract.ContractName,
  compiler: contract.CompilerVersion,
  isVerified,
  flags,
  score
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Scan failed. Check network or contract.' });
  }
}
