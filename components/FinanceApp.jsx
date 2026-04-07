import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, ArrowDownCircle, ArrowUpCircle, LogOut, UserPlus, Paperclip, Image } from 'lucide-react';
import { ResponsiveContainer, RadialBarChart, RadialBar, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import InviteManager from './InviteManager';

export default function FinanceApp() {
  const { user, profile, isSuperAdmin, signOut } = useAuth();
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [form, setForm] = useState({ type: 'expense', desc: '', amount: '', assignedTo: '' });
  const [proofFile, setProofFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);

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
        raw: t,
      })));
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
    fetchMembers();
  }, [fetchTransactions, fetchMembers]);

  async function addEntry() {
    if (!form.desc || !form.amount) return;
    setSaving(true);

    const amount = form.type === 'expense'
      ? -Math.abs(Number(form.amount))
      : Math.abs(Number(form.amount));

    let proofUrl = null;

    // Upload proof file for expenses
    if (form.type === 'expense' && proofFile) {
      const ext = proofFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('proof')
        .upload(filePath, proofFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('proof').getPublicUrl(filePath);
        proofUrl = urlData?.publicUrl || null;
      }
    }

    const row = {
      description: form.desc,
      amount,
      created_by: user.id,
    };
    if (form.assignedTo) row.assigned_to = form.assignedTo;
    if (proofUrl) row.proof_url = proofUrl;

    const { error } = await supabase.from('transactions').insert(row);

    if (!error) {
      setForm({ type: 'expense', desc: '', amount: '', assignedTo: '' });
      setProofFile(null);
      setOpen(false);
      await fetchTransactions();
    }
    setSaving(false);
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) fetchTransactions();
  }

  const income = entries.filter(e => e.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expenses = entries.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const balance = income - expenses;

  const chartData = [
    { name: 'Income', value: income, fill: '#34D399' },
    { name: 'Expenses', value: expenses, fill: '#F87171' },
  ];

  if (showInvites && isSuperAdmin) {
    return <InviteManager onBack={() => setShowInvites(false)} />;
  }

  return (
    <div className="pb-24 max-w-md mx-auto bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-semibold">My Wallet</h1>
            <p className="text-2xl font-bold mt-1">₱{balance.toLocaleString()}</p>
            <p className="text-xs opacity-80">Current Balance</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <button onClick={() => setShowInvites(true)} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
                <UserPlus size={18} />
              </button>
            )}
            <button onClick={signOut} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <p className="text-xs opacity-60 mt-2">
          {profile?.role === 'superadmin' ? 'Admin' : 'Member'} — {user?.email}
        </p>
      </div>

      {/* Chart */}
      <div className="flex justify-center mt-6 mb-6">
        <Card className="rounded-3xl shadow-lg border border-gray-100 w-full relative">
          <ResponsiveContainer width="100%" height={200} className="p-0">
            <RadialBarChart innerRadius="50%" outerRadius="90%" data={chartData} startAngle={180} endAngle={0} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={20} />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute bottom-3 w-full flex justify-center gap-4">
            {chartData.map(item => (
              <div key={item.name} className="flex items-center gap-1 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-3 px-3 mb-4">
        <MiniCard label="Income" value={income} icon={<ArrowUpCircle className="text-green-500" />} color="green" />
        <MiniCard label="Expenses" value={expenses} icon={<ArrowDownCircle className="text-red-500" />} color="red" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid grid-cols-3 mx-3 mb-3 bg-white shadow-md rounded-xl p-1">
          <TabsTrigger value="all" className="rounded-xl">All</TabsTrigger>
          <TabsTrigger value="income" className="rounded-xl">Income</TabsTrigger>
          <TabsTrigger value="expense" className="rounded-xl">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <List entries={entries} isSuperAdmin={isSuperAdmin} onDelete={deleteEntry} />
        </TabsContent>
        <TabsContent value="income">
          <List entries={entries.filter(e => e.type === 'income')} isSuperAdmin={isSuperAdmin} onDelete={deleteEntry} />
        </TabsContent>
        <TabsContent value="expense">
          <List entries={entries.filter(e => e.type === 'expense')} isSuperAdmin={isSuperAdmin} onDelete={deleteEntry} />
        </TabsContent>
      </Tabs>

      {/* Add Modal — superadmin only */}
      {open && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white w-full p-5 rounded-t-3xl shadow-xl max-h-[85vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-3 text-center">New Entry</h2>
            <select
              className="w-full mb-3 border p-3 rounded-lg bg-gray-50"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <Input
              placeholder="Description"
              className="mb-3 p-3 rounded-lg bg-gray-50"
              value={form.desc}
              onChange={e => setForm({ ...form, desc: e.target.value })}
            />
            <Input
              placeholder="Amount"
              type="number"
              className="mb-3 p-3 rounded-lg bg-gray-50"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />

            {/* Assign to user */}
            <label className="text-xs text-gray-500 mb-1 block">Assign to</label>
            <select
              className="w-full mb-3 border p-3 rounded-lg bg-gray-50"
              value={form.assignedTo}
              onChange={e => setForm({ ...form, assignedTo: e.target.value })}
            >
              <option value="">— None —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.metadata?.email || m.metadata?.name || m.id.slice(0, 8)} ({m.role})
                </option>
              ))}
            </select>

            {/* Proof upload — expenses only */}
            {form.type === 'expense' && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">Upload Proof</label>
                <label className="flex items-center gap-2 border p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <Paperclip size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600 truncate">
                    {proofFile ? proofFile.name : 'Choose file (image/pdf)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => setProofFile(e.target.files?.[0] || null)}
                  />
                </label>
                {proofFile && (
                  <button
                    className="text-xs text-red-400 mt-1 hover:underline"
                    onClick={() => setProofFile(null)}
                  >
                    Remove file
                  </button>
                )}
              </div>
            )}

            <Button className="w-full mb-2" onClick={addEntry} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setOpen(false); setProofFile(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Floating Button — superadmin only */}
      {isSuperAdmin && (
        <Button
          className="fixed bottom-20 right-4 rounded-full h-16 w-16 shadow-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-transform active:scale-95"
          onClick={() => setOpen(true)}
        >
          <Plus />
        </Button>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around text-xs shadow-md">
        <span>Home</span>
        <span>Income</span>
        <span>Expenses</span>
        <span>Profile</span>
      </div>
    </div>
  );
}

function MiniCard({ label, value, icon, color }) {
  return (
    <Card className={`flex-1 rounded-2xl shadow-lg border-l-4 border-${color}-500 bg-white`}>
      <CardContent className="p-3 text-xs flex items-center gap-3">
        {icon}
        <div>
          <p className="text-gray-500 font-medium">{label}</p>
          <p className="font-bold text-sm">₱{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function List({ entries, isSuperAdmin, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);

  if (entries.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">No transactions yet</p>;
  }

  const pendingEntry = confirmId ? entries.find(e => e.id === confirmId) : null;

  return (
    <div className="flex flex-col gap-3 px-3">
      {entries.map(e => (
        <Card key={e.id} className="rounded-2xl shadow hover:scale-105 transition-transform">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-700">{e.desc}</p>
              <p className="text-xs text-gray-400">{e.user}</p>
              {e.assignedTo && (
                <p className="text-xs text-indigo-500 mt-0.5">Assigned: {e.assignedTo}</p>
              )}
              {e.proofUrl && (
                <a
                  href={e.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5"
                >
                  <Image size={12} /> View proof
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className={`text-sm font-bold ${e.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                {e.type === 'expense' ? '-' : '+'}₱{e.amount.toLocaleString()}
              </p>
              {isSuperAdmin && (
                <button onClick={() => setConfirmId(e.id)} className="text-gray-300 hover:text-red-400 text-xs ml-1">
                  ×
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete confirmation modal */}
      {pendingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-sm w-full">
            <h3 className="font-bold text-base mb-2 text-center">Delete Transaction?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              {pendingEntry.desc}
            </p>
            <p className={`text-sm font-bold text-center mb-4 ${pendingEntry.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
              {pendingEntry.type === 'expense' ? '-' : '+'}₱{pendingEntry.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 text-center mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => { onDelete(pendingEntry.id); setConfirmId(null); }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
