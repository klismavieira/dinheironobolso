
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/header';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const publicRoutes = ['/login', '/signup'];
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOutUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  const isPublicRoute = publicRoutes.includes(pathname);

  const handleLogout = useCallback(async () => {
    try {
      await signOutUser();
      router.push('/login');
      toast({
        title: 'Sessão encerrada',
        description: 'Você foi desconectado por inatividade.',
      });
    } catch (error) {
      console.error("Error during inactivity logout:", error);
    }
  }, [signOutUser, router, toast]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    if (loading) return; 

    if (!user && !isPublicRoute) {
      router.push('/login');
    }

    if (user && isPublicRoute) {
      router.push('/');
    }
  }, [user, loading, isPublicRoute, router, pathname]);

  useEffect(() => {
    if (user && !isPublicRoute) {
      const activityEvents = [
        'mousemove',
        'mousedown',
        'keydown',
        'touchstart',
        'scroll',
      ];
      
      const resetListener = () => resetInactivityTimer();

      activityEvents.forEach(event => {
        window.addEventListener(event, resetListener);
      });

      resetInactivityTimer(); // Start the timer on initial load

      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, resetListener);
        });
        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
        }
      };
    }
  }, [user, isPublicRoute, resetInactivityTimer]);


  if (loading || (!user && !isPublicRoute) || (user && isPublicRoute)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
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
