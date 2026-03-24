'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { register, login, loginAsGuest } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

type Mode = 'login' | 'register' | 'guest';

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'register') {
        result = await register(form.username, form.password, form.displayName);
      } else if (mode === 'login') {
        result = await login(form.username, form.password);
      } else {
        result = await loginAsGuest(form.displayName || undefined);
      }

      setAuth(result.user, result.token);
      connectSocket(result.token);
      router.push('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🃏</div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Game 29</h1>
          <p className="text-green-200 mt-1">The Classic South Asian Card Game</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-2xl border border-white/20">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-6 bg-white/10">
            {(['login', 'register', 'guest'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                  mode === m ? 'bg-white text-green-900' : 'text-white hover:bg-white/10'
                }`}
              >
                {m === 'guest' ? 'Play as Guest' : m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'guest' && (
              <div>
                <label className="block text-green-100 text-sm mb-1">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  placeholder="e.g. cardmaster"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white
                    placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            )}

            {(mode === 'register' || mode === 'guest') && (
              <div>
                <label className="block text-green-100 text-sm mb-1">
                  Display Name {mode === 'guest' && <span className="text-white/50">(optional)</span>}
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder={mode === 'guest' ? 'Leave blank for random name' : 'Your nickname'}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white
                    placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            )}

            {mode !== 'guest' && (
              <div>
                <label className="block text-green-100 text-sm mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="••••••"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white
                    placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 rounded-lg px-4 py-2 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-green-900
                font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait…' :
                mode === 'login' ? 'Sign In' :
                mode === 'register' ? 'Create Account' :
                'Play as Guest'}
            </button>
          </form>

          {mode === 'guest' && (
            <p className="text-white/40 text-xs text-center mt-3">
              Guest accounts are temporary. Register to save your progress.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
