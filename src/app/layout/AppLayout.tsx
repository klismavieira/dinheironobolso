
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/header';
import { Loader2 } from 'lucide-react';

const publicRoutes = ['/login'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    if (!user && !isPublicRoute) {
      router.push('/login');
    }

    if (user && isPublicRoute) {
      router.push('/');
    }
  }, [user, loading, isPublicRoute, router, pathname]);

  if (loading || (!user && !isPublicRoute) || (user && isPublicRoute)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Show header only for authenticated users (not on public pages)
  const showHeader = !isPublicRoute;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {showHeader && <Header />}
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        Desenvolvido por Klisma Vieira
      </footer>
    </div>
  );
}
