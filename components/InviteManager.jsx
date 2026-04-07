import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Check } from 'lucide-react';

export default function InviteManager({ onBack }) {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    const res = await fetch('/api/list-invites');
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites || []);
    }
  }

  async function createInvite(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      setResult({
        type: 'success',
        message: `Invite created! Link: ${appUrl}/signup?invite=${data.token}`,
        token: data.token,
      });
      setEmail('');
      fetchInvites();
    } else {
      setResult({ type: 'error', message: data.error });
    }
    setLoading(false);
  }

  function getInviteLink(token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${appUrl}/signup?invite=${token}`;
  }

  async function copyLink(inv) {
    const link = getInviteLink(inv.token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      prompt('Copy this link:', link);
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 max-w-md mx-auto pb-8">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500 px-5 pt-8 pb-6 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-6 -mb-6" />
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={onBack} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Manage Invites</h1>
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-4 relative z-10">
        {/* Create invite form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h2 className="font-semibold text-sm text-gray-700 mb-3">Send New Invite</h2>
          <form onSubmit={createInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="rounded-xl border-gray-200"
            />
            <Button className="bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 text-white rounded-xl px-5 font-semibold shadow-sm" disabled={loading}>
              {loading ? '...' : 'Invite'}
            </Button>
          </form>
          {result && (
            <div className={`mt-3 text-xs p-3 rounded-xl break-all ${
              result.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {result.message}
            </div>
          )}
        </div>

        {/* Existing invites */}
        <h2 className="font-semibold text-sm text-gray-700 px-1">Sent Invites</h2>
        {invites.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No invites yet</p>
        )}
        {invites.map(inv => (
          <div key={inv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm text-gray-800">{inv.email}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                inv.used ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {inv.used ? 'Claimed' : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Role: {inv.role} — Expires: {new Date(inv.expires_at).toLocaleDateString()}
            </p>
            {!inv.used && (
              <button
                onClick={() => copyLink(inv)}
                className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors"
              >
                {copiedId === inv.id ? (
                  <><Check size={13} /> Copied!</>
                ) : (
                  <><Copy size={13} /> Copy invite link</>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
