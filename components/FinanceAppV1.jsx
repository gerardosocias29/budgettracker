// V1 — Dark Glassmorphism: dark background, frosted glass cards, neon accents
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ArrowDown, ArrowUp, LogOut, UserPlus, Paperclip, Image, Trash2, X } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
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

  // Build simple chart data from recent entries
  const last7 = [...entries].reverse().slice(-10).map((e, i) => ({
    name: e.date,
    income: e.type === 'income' ? e.amount : 0,
    expense: e.type === 'expense' ? e.amount : 0,
  }));

  if (showInvites && isSuperAdmin) return <InviteManager onBack={() => setShowInvites(false)} />;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-400 text-xs">{profile?.role === 'superadmin' ? 'Admin' : 'Member'}</p>
            <p className="text-sm text-gray-300">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <button onClick={() => setShowInvites(true)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                <UserPlus size={16} className="text-gray-400" />
              </button>
            )}
            <button onClick={signOut} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <LogOut size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-white/10 backdrop-blur-xl">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Balance</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">₱{balance.toLocaleString()}</p>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ArrowUp size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Income</p>
                <p className="text-sm font-semibold text-emerald-400">₱{income.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <ArrowDown size={14} className="text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Expenses</p>
                <p className="text-sm font-semibold text-rose-400">₱{expenses.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      {last7.length > 1 && (
        <div className="px-5 mb-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={last7}>
                <defs>
                  <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#incG)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="#f87171" fill="url(#expG)" strokeWidth={2} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#fff' }} formatter={(v) => `₱${v.toLocaleString()}`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {['all', 'income', 'expense'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                tab === t
                  ? 'bg-violet-500/30 text-violet-300 border border-violet-400/30'
                  : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'
              }`}
            >
              {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-5 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-10">No transactions yet</p>
        )}
        {filtered.map(e => (
          <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              e.type === 'income' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
            }`}>
              {e.type === 'income' ? <ArrowUp size={16} className="text-emerald-400" /> : <ArrowDown size={16} className="text-rose-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{e.desc}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span>{e.date}</span>
                {e.assignedTo && <span className="text-violet-400">• {e.assignedTo}</span>}
                {e.proofUrl && (
                  <button onClick={() => setProofPreview(e.proofUrl)} className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                    <Image size={10} /> proof
                  </button>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-2">
              <p className={`text-sm font-bold ${e.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {e.type === 'expense' ? '-' : '+'}₱{e.amount.toLocaleString()}
              </p>
              {isSuperAdmin && (
                <button onClick={() => setConfirmId(e.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-rose-400 transition">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {open && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50">
          <div className="bg-[#1a1a2e] w-full p-5 rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">New Entry</h2>
              <button onClick={() => { setOpen(false); setProofFile(null); }} className="p-1 rounded-lg hover:bg-white/10"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {['income', 'expense'].map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${form.type === t ? (t === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30') : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
            <Input placeholder="Description" className="mb-3 bg-white/5 border-white/10 text-white placeholder:text-gray-600" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
            <Input placeholder="Amount" type="number" className="mb-3 bg-white/5 border-white/10 text-white placeholder:text-gray-600" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <label className="text-xs text-gray-500 mb-1 block">Assign to</label>
            <select className="w-full mb-3 border border-white/10 p-3 rounded-xl bg-white/5 text-sm text-gray-300" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">— None —</option>
              {members.map(m => (<option key={m.id} value={m.id}>{m.metadata?.email || m.metadata?.name || m.id.slice(0, 8)} ({m.role})</option>))}
            </select>
            {form.type === 'expense' && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">Upload Proof</label>
                <label className="flex items-center gap-2 border border-white/10 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition">
                  <Paperclip size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-400 truncate">{proofFile ? proofFile.name : 'Choose file'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                </label>
                {proofFile && <button className="text-xs text-rose-400 mt-1 hover:underline" onClick={() => setProofFile(null)}>Remove</button>}
              </div>
            )}
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3" onClick={addEntry} disabled={saving}>
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {pendingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-5 mx-4 max-w-sm w-full">
            <h3 className="font-bold text-base mb-2 text-center">Delete Transaction?</h3>
            <p className="text-sm text-gray-400 text-center mb-1">{pendingEntry.desc}</p>
            <p className={`text-sm font-bold text-center mb-4 ${pendingEntry.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {pendingEntry.type === 'expense' ? '-' : '+'}₱{pendingEntry.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 text-center mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-white/10 text-gray-300 hover:bg-white/5" onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => { deleteEntry(pendingEntry.id); setConfirmId(null); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <ProofModal url={proofPreview} onClose={() => setProofPreview(null)} />

      {/* FAB */}
      {isSuperAdmin && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-4 w-14 h-14 rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center hover:bg-violet-700 active:scale-95 transition-transform">
          <Plus size={22} />
        </button>
      )}
    </div>
  );
}
