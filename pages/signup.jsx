import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill invite token from URL query
  useEffect(() => {
    if (router.query.invite) {
      setInviteToken(router.query.invite);
    }
  }, [router.query.invite]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!inviteToken) {
      setError('An invite token is required to sign up.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/signup-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, inviteToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed.');
        setLoading(false);
        return;
      }

      setSuccess('Account created! You can now log in.');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Sign Up - BudgetTracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-indigo-600">BudgetTracker</h1>
            <p className="text-gray-500 text-sm mt-1">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">{success}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invite Token</label>
              <Input
                placeholder="Paste your invite token"
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Required — provided by the admin</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button className="w-full" disabled={loading || !!success}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
