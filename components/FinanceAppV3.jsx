// V3 — Bold Warm Gradients: warm tones, large balance hero, colorful category pills, rounded everything
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ArrowDownRight, ArrowUpRight, LogOut, UserPlus, Paperclip, Image, Trash2, X, Wallet } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

  const pieData = [
    { name: 'Income', value: income || 1 },
    { name: 'Expenses', value: expenses || 1 },
  ];
  const COLORS = ['#34d399', '#fb7185'];

  if (showInvites && isSuperAdmin) return <InviteManager onBack={() => setShowInvites(false)} />;

  return (
    <div className="min-h-screen bg-orange-50/50 max-w-md mx-auto pb-8">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500 px-5 pt-6 pb-8 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-6 -mb-6" />

        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium">{profile?.role === 'superadmin' ? 'Admin' : 'Member'}</p>
              <p className="text-white text-sm font-semibold truncate max-w-[180px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {isSuperAdmin && (
              <button onClick={() => setShowInvites(true)} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition">
                <UserPlus size={16} className="text-white" />
              </button>
            )}
            <button onClick={signOut} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition">
              <LogOut size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="text-center mt-6 relative z-10">
          <p className="text-white/70 text-xs uppercase tracking-widest">Balance</p>
          <p className="text-4xl font-extrabold text-white mt-1 drop-shadow">₱{balance.toLocaleString()}</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 px-4 -mt-5 relative z-10">
        <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ArrowUpRight size={14} className="text-emerald-600" />
            </div>
            <span className="text-[11px] text-gray-400 uppercase">Income</span>
          </div>
          <p className="text-lg font-bold text-gray-800">₱{income.toLocaleString()}</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <ArrowDownRight size={14} className="text-rose-600" />
            </div>
            <span className="text-[11px] text-gray-400 uppercase">Expenses</span>
          </div>
          <p className="text-lg font-bold text-gray-800">₱{expenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Donut chart */}
      {(income > 0 || expenses > 0) && (
        <div className="flex justify-center mt-4">
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={pieData} innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab pills */}
      <div className="flex gap-2 px-5 mt-5 mb-3">
        {['all', 'income', 'expense'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === t
                ? (t === 'income' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' : t === 'expense' ? 'bg-rose-500 text-white shadow-sm shadow-rose-200' : 'bg-orange-500 text-white shadow-sm shadow-orange-200')
                : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
            }`}>
            {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-300 text-sm py-10">No transactions yet</p>
        )}
        {filtered.map(e => (
          <div key={e.id} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center gap-3 group hover:shadow-md transition">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              e.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'
            }`}>
              {e.type === 'income'
                ? <ArrowUpRight size={18} className="text-emerald-500" />
                : <ArrowDownRight size={18} className="text-rose-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{e.desc}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400">
                <span>{e.date}</span>
                {e.assignedTo && <span className="text-orange-500">{e.assignedTo}</span>}
                {e.proofUrl && (
                  <button onClick={() => setProofPreview(e.proofUrl)} className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                    <Image size={10} /> proof
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <p className={`text-sm font-bold ${e.type === 'expense' ? 'text-rose-500' : 'text-emerald-600'}`}>
                {e.type === 'expense' ? '-' : '+'}₱{e.amount.toLocaleString()}
              </p>
              {isSuperAdmin && (
                <button onClick={() => setConfirmId(e.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-400 transition">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {open && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full p-5 rounded-t-[1.5rem] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg text-gray-900">New Entry</h2>
              <button onClick={() => { setOpen(false); setProofFile(null); }} className="p-1"><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {['income', 'expense'].map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    form.type === t
                      ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              ))}
            </div>
            <Input placeholder="Description" className="mb-3 rounded-xl border-gray-200" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
            <Input placeholder="Amount" type="number" className="mb-3 rounded-xl border-gray-200" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <label className="text-xs text-gray-400 mb-1 block">Assign to</label>
            <select className="w-full mb-3 border border-gray-200 p-2.5 rounded-xl text-sm text-gray-600" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">— None —</option>
              {members.map(m => (<option key={m.id} value={m.id}>{m.metadata?.email || m.metadata?.name || m.id.slice(0, 8)} ({m.role})</option>))}
            </select>
            {form.type === 'expense' && (
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1 block">Upload Proof</label>
                <label className="flex items-center gap-2 border border-gray-200 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <Paperclip size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-500 truncate">{proofFile ? proofFile.name : 'Choose file'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                </label>
                {proofFile && <button className="text-xs text-rose-400 mt-1 hover:underline" onClick={() => setProofFile(null)}>Remove</button>}
              </div>
            )}
            <Button className="w-full bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white rounded-xl py-3 font-semibold shadow-sm" onClick={addEntry} disabled={saving}>
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {pendingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-base mb-2 text-center text-gray-900">Delete Transaction?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">{pendingEntry.desc}</p>
            <p className={`text-sm font-bold text-center mb-3 ${pendingEntry.type === 'expense' ? 'text-rose-500' : 'text-emerald-600'}`}>
              {pendingEntry.type === 'expense' ? '-' : '+'}₱{pendingEntry.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 text-center mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl" onClick={() => { deleteEntry(pendingEntry.id); setConfirmId(null); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <ProofModal url={proofPreview} onClose={() => setProofPreview(null)} />

      {/* FAB */}
      {isSuperAdmin && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg shadow-orange-300/40 flex items-center justify-center hover:shadow-xl active:scale-95 transition-all">
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
