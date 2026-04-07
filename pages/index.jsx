import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useAuth } from '../context/AuthContext';

const FinanceApp = dynamic(() => import('../components/FinanceAppV3'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>BudgetTracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <FinanceApp />
    </>
  );
}
