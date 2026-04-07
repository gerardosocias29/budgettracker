import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function InviteManager({ onBack }) {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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

  return (
    <div className="pb-24 max-w-md mx-auto bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold">Manage Invites</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Create invite form */}
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm mb-3">Send New Invite</h2>
            <form onSubmit={createInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button disabled={loading}>
                {loading ? '...' : 'Invite'}
              </Button>
            </form>
            {result && (
              <div className={`mt-3 text-xs p-2 rounded-lg break-all ${
                result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {result.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing invites */}
        <h2 className="font-semibold text-sm px-1">Sent Invites</h2>
        {invites.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No invites yet</p>
        )}
        {invites.map(inv => (
          <Card key={inv.id} className="rounded-2xl shadow">
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{inv.email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  inv.used ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {inv.used ? 'Claimed' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Role: {inv.role} — Expires: {new Date(inv.expires_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
