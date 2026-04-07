// V2 — Clean Minimal: lots of whitespace, thin lines, soft typography, no heavy shadows
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, TrendingUp, TrendingDown, LogOut, UserPlus, Paperclip, Image, Trash2, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Tooltip, XAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import InviteManager from './InviteManager';
import ProofModal from './ProofModal';

export default function FinanceApp() {
  const { user, profile, isSuperAdmin, signOut } = useAuth();
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [form, setForm] = useState({ type: 'expense', desc: '', amount: '', assignedTo: '' });
  const [proofFile, setProofFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState('all');
  const [confirmId, setConfirmId] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, role, metadata');
    if (data) setMembers(data);
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, assigned_profile:profiles!transactions_assigned_to_fkey(id, metadata)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setEntries(data.map(t => ({
        id: t.id,
        type: t.amount >= 0 ? 'income' : 'expense',
        desc: t.description,
        amount: Math.abs(t.amount),
        user: t.created_by === user?.id ? 'You' : 'Admin',
        assignedTo: t.assigned_profile?.metadata?.email || t.assigned_profile?.metadata?.name || null,
        proofUrl: t.proof_url,
        date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        raw: t,
      })));
    }
  }, [user]);

  useEffect(() => { fetchTransactions(); fetchMembers(); }, [fetchTransactions, fetchMembers]);

  async function addEntry() {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    const amount = form.type === 'expense' ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount));
    let proofUrl = null;
    if (form.type === 'expense' && proofFile) {
      const ext = proofFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('proof').upload(filePath, proofFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('proof').getPublicUrl(filePath);
        proofUrl = urlData?.publicUrl || null;
      }
    }
    const row = { description: form.desc, amount, created_by: user.id };
    if (form.assignedTo) row.assigned_to = form.assignedTo;
    if (proofUrl) row.proof_url = proofUrl;
    const { error } = await supabase.from('transactions').insert(row);
    if (!error) { setForm({ type: 'expense', desc: '', amount: '', assignedTo: '' }); setProofFile(null); setOpen(false); await fetchTransactions(); }
    setSaving(false);
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) fetchTransactions();
  }

  const income = entries.filter(e => e.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expenses = entries.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const balance = income - expenses;

  const filtered = tab === 'all' ? entries : entries.filter(e => e.type === tab);
  const pendingEntry = confirmId ? entries.find(e => e.id === confirmId) : null;

  // Group recent for bar chart
  const barData = [
    { name: 'Income', value: income, fill: '#10b981' },
    { name: 'Expenses', value: expenses, fill: '#ef4444' },
  ];

  if (showInvites && isSuperAdmin) return <InviteManager onBack={() => setShowInvites(false)} />;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto pb-8">
      {/* Top bar */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Budget</h1>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <div className="flex gap-1.5">
            {isSuperAdmin && (
              <button onClick={() => setShowInvites(true)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <UserPlus size={18} className="text-gray-400" />
              </button>
            )}
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-gray-100 transition">
              <LogOut size={18} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Balance section */}
      <div className="bg-white px-5 py-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Balance</p>
        <p className="text-4xl font-extralight text-gray-900 tracking-tight">
          ₱{balance.toLocaleString()}
        </p>

        <div className="flex gap-8 mt-5">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <div>
              <p className="text-[11px] text-gray-400">Income</p>
              <p className="text-sm font-medium text-gray-700">₱{income.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div>
              <p className="text-[11px] text-gray-400">Expenses</p>
              <p className="text-sm font-medium text-gray-700">₱{expenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {(income > 0 || expenses > 0) && (
        <div className="bg-white mx-4 mt-4 p-4 rounded-xl border border-gray-100">
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={barData} layout="vertical" barCategoryGap={8}>
              <XAxis type="number" hide />
              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20} />
              <Tooltip formatter={(v) => `₱${v.toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-5 mt-5 mb-3">
        {['all', 'income', 'expense'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-1 rounded-lg text-xs font-medium transition ${
              tab === t ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
          </button>
        ))}
        <div className="flex-1"></div>
        <span className="text-xs text-gray-300 self-center">{filtered.length} entries</span>
      </div>

      {/* List */}
      <div className="px-4 space-y-1">
        {filtered.length === 0 && (
          <p className="text-center text-gray-300 text-sm py-12">No transactions</p>
        )}
        {filtered.map(e => (
          <div key={e.id} className="flex items-center gap-3 px-3 py-3 bg-white rounded-xl border border-gray-100 group">
            <div className={`w-1 h-8 rounded-full shrink-0 ${e.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{e.desc}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>{e.date}</span>
                {e.assignedTo && <><span>·</span><span className="text-gray-500">{e.assignedTo}</span></>}
                {e.proofUrl && (
                  <button onClick={() => setProofPreview(e.proofUrl)} className="text-blue-500 hover:underline inline-flex items-center gap-0.5 ml-1">
                    <Image size={10} /> proof
                  </button>
                )}
              </div>
            </div>
            <p className={`text-sm font-semibold tabular-nums ${e.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
              {e.type === 'expense' ? '-' : '+'}₱{e.amount.toLocaleString()}
            </p>
            {isSuperAdmin && (
              <button onClick={() => setConfirmId(e.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {open && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50">
          <div className="bg-white w-full p-6 rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-base text-gray-900">New Entry</h2>
              <button onClick={() => { setOpen(false); setProofFile(null); }}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {['income', 'expense'].map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.type === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-400'}`}>
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
            <Input placeholder="Description" className="mb-3 border-gray-200" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
            <Input placeholder="Amount" type="number" className="mb-3 border-gray-200" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-1 block">Assign to</label>
            <select className="w-full mb-3 border border-gray-200 p-2.5 rounded-lg text-sm text-gray-600" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">— None —</option>
              {members.map(m => (<option key={m.id} value={m.id}>{m.metadata?.email || m.metadata?.name || m.id.slice(0, 8)} ({m.role})</option>))}
            </select>
            {form.type === 'expense' && (
              <div className="mb-4">
                <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-1 block">Proof</label>
                <label className="flex items-center gap-2 border border-gray-200 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <Paperclip size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-500 truncate">{proofFile ? proofFile.name : 'Attach file'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                </label>
                {proofFile && <button className="text-xs text-red-400 mt-1 hover:underline" onClick={() => setProofFile(null)}>Remove</button>}
              </div>
            )}
            <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg py-2.5" onClick={addEntry} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {pendingEntry && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 mx-4 max-w-sm w-full border border-gray-100">
            <h3 className="font-semibold text-base mb-2 text-center text-gray-900">Delete Transaction?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">{pendingEntry.desc}</p>
            <p className={`text-sm font-bold text-center mb-3 ${pendingEntry.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
              {pendingEntry.type === 'expense' ? '-' : '+'}₱{pendingEntry.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 text-center mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => { deleteEntry(pendingEntry.id); setConfirmId(null); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <ProofModal url={proofPreview} onClose={() => setProofPreview(null)} />

      {/* FAB */}
      {isSuperAdmin && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-4 w-12 h-12 rounded-full bg-gray-900 text-white shadow-md flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-transform">
          <Plus size={20} />
        </button>
      )}
    </div>
  );
}
