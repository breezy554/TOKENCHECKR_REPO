export default async function handler(req, res) {
  const { address } = req.query;
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  try {
    // 🔍 1. Fetch source code
    const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`);
    const data = await response.json();

    if (data.status !== "1") {
      return res.status(404).json({ error: 'Contract not found or not verified.' });
    }

    const contract = data.result[0];
    const source = contract.SourceCode || '';
    const isVerified = source.length > 0;
    const flags = [];

    // 🧪 2. Static Source-Based Red Flags
    if (/function\s+mint/.test(source)) flags.push('⚠️ mint() — token supply is inflatable');
    if (/blacklist/.test(source)) flags.push('⚠️ blacklist() — dev can block users');
    if (/setFees/.test(source)) flags.push('⚠️ setFees() — adjustable fees');
    if (/tx\.origin/.test(source)) flags.push('⚠️ Uses tx.origin — risky for authentication');
    if (/approve/.test(source) && /require\(msg\.sender !=/.test(source)) flags.push('🪤 Hidden approval restrictions');
    if (/sellFee\s*>\s*99/.test(source) || /buyFee\s*>\s*99/.test(source)) flags.push('🔥 High fee — likely honeypot');

    // 🔁 Proxy pattern detection
    const proxyPatterns = [/delegatecall/i, /implementation/i, /upgradeTo/i, /proxyAdmin/i, /function\s+upgrade/i];
    if (proxyPatterns.some(p => p.test(source))) {
      flags.push('🚨 Possible proxy contract — upgradeable logic detected!');
    }

    // 🔒 Ownership patterns
    if (/onlyOwner/.test(source)) flags.push('🔒 Uses `onlyOwner` — centralized control');
    if (/renounceOwnership/.test(source)) flags.push('👋 Has `renounceOwnership()` — owner can give up control');
    if (/transferOwnership/.test(source)) flags.push('🔄 Has `transferOwnership()` — ownership can be reassigned');

    // 🔐 3. Bytecode analysis
    const bytecodeRes = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${address}&apikey=${ETHERSCAN_API_KEY}`);
    const bytecodeData = await bytecodeRes.json();
    const bytecode = bytecodeData?.result || '';

    if (!isVerified && bytecode.length > 10000 && /^0x6080/.test(bytecode)) {
      flags.push('🕵️ Unverified and large bytecode — may be obfuscated');
    }

    // 🎯 Calculate base score
    const baseScore = 100;
    const penaltyPerFlag = 15;
    const score = Math.max(baseScore - flags.length * penaltyPerFlag, 0);

    return res.status(200).json({
      name: contract.ContractName,
      compiler: contract.CompilerVersion,
      isVerified,
      flags,
      score
    });
  } catch (err) {
    console.error('❌ Scan error:', err);
    return res.status(500).json({ error: 'Scan failed. Check network or contract.' });
  }
}
