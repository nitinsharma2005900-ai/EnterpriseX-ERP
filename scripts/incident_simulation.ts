const base = process.env.API_URL || 'http://localhost:5000';
async function call(path: string, token?: string, body?: unknown) {
  const response = await fetch(`${base}/api${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json() as any;
  if (!response.ok) throw new Error(`${response.status}: ${result.error?.message || 'Request failed'}`);
  return result.data;
}
async function main() {
  const session = await call('/auth/login', undefined, { email: 'admin@enterprisex.com', password: process.env.DEMO_PASSWORD || 'EnterpriseX2026!' });
  for (const type of ['LEDGER_IMBALANCE','DUPLICATE_INVOICE','NEGATIVE_STOCK','STOCK_VALUATION','PARTIAL_WORKFLOW','INCONSISTENT_DATA']) {
    const incident = await call('/system/incidents/simulate', session.accessToken, { type });
    console.log(type, incident.code, JSON.parse(incident.diagnosisDetails));
  }
  const diagnostic = await call('/system/diagnostics', session.accessToken);
  console.log('Post-exercise business integrity:', diagnostic.overallStatus);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
