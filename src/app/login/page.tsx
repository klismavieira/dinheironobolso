
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { FirebaseError } from 'firebase/app';
import Link from 'next/link';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, sendPasswordReset, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);


  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
      setIsStandalone(true);
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // O redirecionamento será feito pelo AppLayout
    } catch (error) {
      console.error('Login Error:', error);
      toast({
        title: 'Falha no Login',
        description: 'Verifique seu e-mail e senha e tente novamente.',
        variant: 'destructive',
      });
    } finally {
        setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: 'E-mail necessário',
        description: 'Por favor, insira seu e-mail para redefinir a senha.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast({
        title: 'E-mail enviado!',
        description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
      });
    } catch (error) {
      console.error('Password Reset Error:', error);
      toast({
        title: 'Falha ao redefinir a senha',
        description: 'Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  const isAnyLoading = loading || authLoading;

  return (
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Acesse sua conta
          </CardTitle>
          <CardDescription>
            {authLoading 
              ? 'Finalizando autenticação...' 
              : 'Entre com seus dados para continuar'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isAnyLoading}
              />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="text-sm font-medium text-primary hover:underline"
                        disabled={isAnyLoading}
                    >
                        Esqueceu a senha?
                    </button>
                </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                disabled={isAnyLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isAnyLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Não tem uma conta?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
                Cadastre-se
            </Link>
          </div>
        </CardContent>
        {installPrompt && !isStandalone && (
          <CardFooter className="flex-col gap-2 pt-6">
            <Separator />
            <Button variant="secondary" className="w-full mt-4" onClick={handleInstallClick}>
              <Download className="mr-2 h-4 w-4" />
              Instalar App
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Instale o app no seu dispositivo para acesso rápido.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
