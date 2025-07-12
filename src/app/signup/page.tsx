
'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { FirebaseError } from 'firebase/app';


export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: 'As senhas não conferem',
        description: 'Por favor, verifique a senha e a confirmação.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      // O redirecionamento será feito pelo AppLayout
    } catch (error) {
        const firebaseError = error as FirebaseError;
        console.error('Signup Error:', firebaseError);
        let description = 'Não foi possível criar a conta. Tente novamente mais tarde.';
        if (firebaseError.code === 'auth/email-already-in-use') {
            description = 'Este e-mail já está em uso. Tente fazer login ou use outro e-mail.';
        } else if (firebaseError.code === 'auth/weak-password') {
            description = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
        }
        toast({
            title: 'Falha no Cadastro',
            description,
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  const isAnyLoading = loading || authLoading;

  return (
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Crie sua conta
          </CardTitle>
          <CardDescription>
            É rápido e fácil. Vamos começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSignup}>
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha"
                disabled={isAnyLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirme a Senha</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua senha"
                disabled={isAnyLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isAnyLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
