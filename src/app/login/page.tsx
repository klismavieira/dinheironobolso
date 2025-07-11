
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { FirebaseError } from 'firebase/app';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Google</title>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.63 1.9-3.87 0-7-3.13-7-7s3.13-7 7-7c1.93 0 3.53.72 4.68 1.8l2.8-2.8C19.02 3.92 16.1.92 12.48.92c-6.48 0-11.52 5.23-11.52 11.52s5.04 11.52 11.52 11.52c6.2 0 11.04-4.18 11.04-11.22 0-.76-.08-1.48-.2-2.16H12.48z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithEmail, signInWithGoogleRedirect, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // On success, AuthProvider will handle navigation
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // This will redirect the user to Google's sign-in page.
      // After sign-in, the user will be redirected back, and the
      // onAuthStateChanged listener in AuthProvider will handle the user state.
      await signInWithGoogleRedirect();
    } catch (error) {
      console.error('Google Login Redirect Error:', error);
      const firebaseError = error as FirebaseError;
      toast({
        title: 'Falha no Login com Google',
        description: firebaseError.message || 'Não foi possível iniciar o login com o Google. Tente novamente.',
        variant: 'destructive',
      });
      setGoogleLoading(false); // Set loading to false only if an error occurs here
    }
  };
  
  const isAnyLoading = loading || googleLoading || authLoading;

  return (
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Acesse sua conta
          </CardTitle>
          <CardDescription>
            Entre com seus dados para continuar
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
              <Label htmlFor="password">Senha</Label>
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
          <div className="my-6 flex items-center">
            <Separator className="flex-1" />
            <span className="mx-4 text-sm text-muted-foreground">OU</span>
            <Separator className="flex-1" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isAnyLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Entrar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
