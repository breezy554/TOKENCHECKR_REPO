export function explainTokenFlags(flags) {
  const explanations = {
    'mint': 'This contract has a `mint()` function, allowing unlimited token creation. This can lead to inflation or scams.',
    'blacklist': 'Contains a `blacklist()` method — the owner can prevent specific users from trading.',
    'setFees': 'The dev can dynamically change trading fees, which may be used to block sells.',
    'tx.origin': 'Uses `tx.origin` for access control — this is insecure and prone to phishing.',
    'proxy': 'This contract is likely a proxy, meaning its logic can be swapped after deployment.',
    'approve': 'Unusual approval logic may allow malicious control over tokens.',
    'honeypot': 'High fee values suggest this token may trap sellers or buyers (honeypot behavior).'
  };

  const matchedExplanations = [];

  for (const key in explanations) {
    const match = flags.find(f => f.toLowerCase().includes(key));
    if (match) matchedExplanations.push(`- ${explanations[key]}`);
  }

  return matchedExplanations.length > 0
    ? matchedExplanations.join('\n')
    : '✅ No known critical risks found.';
}
