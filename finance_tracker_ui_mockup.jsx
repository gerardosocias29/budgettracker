import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from "recharts";
import { createClient } from '@supabase/supabase-js';

const supabase = typeof window !== 'undefined' && createClient(process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

export default function FinanceAppMockup() {
  // attempt to claim invite if token present in URL
  useEffect(() => {
    tryClaimInviteFromUrl();
  }, []);
  const [entries, setEntries] = useState([
    { id: 1, type: "income", desc: "Salary", amount: 5000, user: "You" },
    { id: 2, type: "expense", desc: "Groceries", amount: 1200, user: "You" }
  ]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "expense", desc: "", amount: "" });

  const addEntry = () => {
    if (!form.desc || !form.amount) return;
    setEntries([
      ...entries,
      {
        id: Date.now(),
        type: form.type,
        desc: form.desc,
        amount: Number(form.amount),
        user: "You"
      }
    ]);
    setForm({ type: "expense", desc: "", amount: "" });
    setOpen(false);
  };

  const income = entries.filter(e => e.type === "income").reduce((a, b) => a + b.amount, 0);
  const expenses = entries.filter(e => e.type === "expense").reduce((a, b) => a + b.amount, 0);
  const balance = income - expenses;

  const chartData = [
    { name: "Income", value: income, fill: "#34D399" },
    { name: "Expenses", value: expenses, fill: "#F87171" }
  ];

  return (
    <div className="pb-24 max-w-md mx-auto bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <InviteClaim />
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 rounded-b-3xl -z-10 animate-pulse-slow"></div>
        <h1 className="text-lg font-semibold">My Wallet</h1>
        <p className="text-2xl font-bold mt-1">₱{balance}</p>
        <p className="text-xs opacity-80">Current Balance</p>
      </div>

      {/* Radial Bar Chart with legend inside card */}
      <div className="flex justify-center mt-6 mb-6">
        <Card className="rounded-3xl shadow-lg border border-gray-100 w-full relative">
          <ResponsiveContainer width="100%" height={200} className="p-0">
            <RadialBarChart innerRadius="50%" outerRadius="90%" data={chartData} startAngle={180} endAngle={0} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={20} />
              <Tooltip formatter={(value) => `₱${value}`} />
            </RadialBarChart>
          </ResponsiveContainer>
          {/* Legend positioned inside card */}
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
          <List entries={entries} />
        </TabsContent>
        <TabsContent value="income">
          <List entries={entries.filter(e => e.type === "income")} />
        </TabsContent>
        <TabsContent value="expense">
          <List entries={entries.filter(e => e.type === "expense")} />
        </TabsContent>
      </Tabs>

      {/* Add Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end transition-opacity">
          <div className="bg-white w-full p-5 rounded-t-3xl shadow-xl animate-slide-up">
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
              className="mb-4 p-3 rounded-lg bg-gray-50"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
            <Button className="w-full mb-2" onClick={addEntry}>Save</Button>
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <Button
        className="fixed bottom-20 right-4 rounded-full h-16 w-16 shadow-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-transform active:scale-95"
        onClick={() => setOpen(true)}
      >
        <Plus />
      </Button>

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

function InviteClaim() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('invite');
    if (t) setToken(t);
  }, []);

  async function claim() {
    if (!token || !supabase) return setStatus('missing token or supabase not configured');
    setStatus('claiming...');
    const { error } = await supabase.rpc('claim_invite', { inv_token: token });
    if (error) setStatus('error: ' + error.message);
    else setStatus('invite claimed — refresh to see role');
  }

  return (
    <div className="p-3 text-center">
      <div className="text-sm">Have an invite? Enter token or visit signup link</div>
      <div className="flex gap-2 mt-2">
        <Input placeholder="invite token" value={token} onChange={e => setToken(e.target.value)} />
        <Button onClick={claim}>Claim</Button>
      </div>
      {status && <p className="text-xs mt-2">{status}</p>}
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
          <p className="font-bold text-sm">₱{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function List({ entries }) {
  return (
    <div className="flex flex-col gap-3 px-3">
      {entries.map(e => (
        <Card key={e.id} className={`rounded-2xl shadow hover:scale-105 transition-transform`}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-700">{e.desc}</p>
              <p className="text-xs text-gray-400">{e.user}</p>
            </div>
            <p className={`text-sm font-bold ${e.type === "expense" ? "text-red-500" : "text-green-600"}`}>
              ₱{e.amount}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
