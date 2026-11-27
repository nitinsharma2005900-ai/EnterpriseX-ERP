'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Kind = 'vendors' | 'customers' | 'products' | 'accounts';
const config = {
  vendors: { title: 'Vendors', path: '/vendors', role: 'PROCUREMENT_OFFICER', fields: ['code','name','email','phone','address'] },
  customers: { title: 'Customers', path: '/customers', role: 'SALES_USER', fields: ['code','name','email','phone','address','creditLimit'] },
  products: { title: 'Products', path: '/inventory/products', role: 'PROCUREMENT_OFFICER', fields: ['sku','name','description','unitPrice','standardCost','reorderPoint'] },
  accounts: { title: 'Chart of Accounts', path: '/finance/accounts', role: 'FINANCE_OFFICER', fields: ['code','name','category','subcategory'] },
};
const numberFields = ['creditLimit','unitPrice','standardCost','reorderPoint'];
export function MasterData({ kind, embedded = false }: { kind: Kind; embedded?: boolean }) {
  const settings = config[kind];
  const Heading = embedded ? 'h2' : 'h1';
  const { user } = useAuth();
  const canEdit = user?.role === 'ERP_ADMINISTRATOR' || user?.role === settings.role || kind === 'products' && user?.role === 'WAREHOUSE_OPERATOR';
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const load = useCallback(() => { void fetchApi(settings.path).then(r => setRows(r.data)).catch(e => setError(e.message)); }, [settings.path]);
  useEffect(load, [load]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setError('');
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Array.from(new FormData(event.currentTarget).entries())) { if (value !== '' || !['phone','address','description','subcategory','reorderPoint'].includes(key)) payload[key] = numberFields.includes(key) ? Number(value) : value; }
    try { await fetchApi(`${settings.path}${editing.id ? `/${editing.id}` : ''}`, { method: editing.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); setEditing(null); load(); }
    catch (e: any) { setError(e.message); } finally { setPending(false); }
  };
  const remove = async () => {
    setPending(true); setError('');
    try { await fetchApi(`${settings.path}/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); load(); }
    catch (e: any) { setError(e.message); } finally { setPending(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><Heading className="text-2xl font-black">{settings.title}</Heading>{canEdit && <button className="flex gap-2 items-center px-4 py-2 rounded-xl bg-emerald text-ivory text-sm" onClick={() => { setError(''); setEditing({}); }}><Plus size={16}/>Add {kind.slice(0, -1)}</button>}</div>
    <label className="block text-sm">Search {kind}<input aria-label={`Search ${kind}`} className="block w-full mt-1 p-3 rounded-xl bg-ivory dark:bg-charcoal border border-sage/40" value={query} onChange={e => setQuery(e.target.value)}/></label>
    {error && <p role="alert" className="p-3 rounded-xl text-amber bg-amber/10">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-sage/30"><table className="w-full text-sm text-left"><thead><tr>{['Code','Name',kind === 'products' ? 'Price' : kind === 'accounts' ? 'Category' : 'Email','Status','Actions'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.filter(r => `${r.code || r.sku} ${r.name} ${r.email || ''}`.toLowerCase().includes(query.toLowerCase())).map(row => <tr key={row.id} className="border-t border-sage/20"><td className="p-3">{row.code || row.sku}</td><td className="p-3">{row.name}</td><td className="p-3">{kind === 'products' ? row.unitPrice : row.email || row.category}</td><td className="p-3">{row.status || (row.active ? 'ACTIVE' : 'INACTIVE')}</td><td className="p-3">{canEdit && <div className="flex gap-3"><button aria-label={`Edit ${row.name}`} onClick={() => { setError(''); setEditing(row); }}><Pencil size={16}/></button><button aria-label={`Delete ${row.name}`} className="text-amber" onClick={() => { setError(''); setDeleting(row); }}><Trash2 size={16}/></button></div>}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-4 text-sm">No {kind} yet.</p>}</div>
    {editing && <div role="dialog" aria-modal="true" aria-label={`${editing.id ? 'Edit' : 'Add'} ${kind}`} className="fixed inset-0 z-50 p-4 bg-charcoal/60 flex items-center justify-center"><form onSubmit={save} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-ivory dark:bg-charcoal p-6 rounded-3xl space-y-3 border border-sage/30"><h2 className="font-bold">{editing.id ? 'Edit' : 'Add'} {kind.slice(0,-1)}</h2>{error && <p role="alert" className="text-amber">{error}</p>}{settings.fields.filter(f => !editing.id || !['code','sku','category','standardCost'].includes(f)).map(field => <label key={field} className="block text-xs font-semibold capitalize">{field.replace(/([A-Z])/g,' $1')}{field === 'category' ? <select name={field} defaultValue={editing[field] || 'ASSET'} className="block w-full p-2 mt-1 rounded-lg border border-sage/30 bg-ivory dark:bg-charcoal">{['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(c => <option key={c}>{c}</option>)}</select> : <input name={field} type={field === 'email' ? 'email' : numberFields.includes(field) ? 'number' : 'text'} min={numberFields.includes(field) ? 0 : undefined} step={numberFields.includes(field) ? '0.01' : undefined} required={!['phone','address','description','subcategory','reorderPoint'].includes(field)} maxLength={500} defaultValue={editing[field] ?? (numberFields.includes(field) ? 0 : '')} className="block w-full p-2 mt-1 rounded-lg border border-sage/30 bg-ivory dark:bg-charcoal"/>}</label>)}<div className="flex justify-end gap-3 pt-3"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button disabled={pending} className="px-4 py-2 rounded-xl bg-emerald text-ivory">{pending ? 'Saving...' : 'Save'}</button></div></form></div>}
    {deleting && <div role="dialog" aria-modal="true" aria-label="Delete record" className="fixed inset-0 z-50 p-4 bg-charcoal/60 flex items-center justify-center"><div className="p-6 rounded-3xl bg-ivory dark:bg-charcoal max-w-md space-y-4"><p>Delete {deleting.name}? Records with transaction history must be retained.</p>{error && <p role="alert" className="text-amber">{error}</p>}<div className="flex gap-4 justify-end"><button onClick={() => setDeleting(null)}>Cancel</button><button disabled={pending} className="text-amber" onClick={() => { void remove(); }}>Delete</button></div></div></div>}
  </section>;
}
