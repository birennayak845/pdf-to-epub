'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  useEffect(() => {
    // Restore session from localStorage
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setAuth(JSON.parse(savedUser), token);
        router.replace('/lobby');
      } catch {
        router.replace('/auth');
      }
    } else {
      router.replace('/auth');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-white text-xl animate-pulse">Loading…</div>
    </div>
  );
}
