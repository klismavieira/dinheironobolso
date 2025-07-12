
'use client';

import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Home, LineChart, LogOut, Settings, Notebook, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { signOutUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
      toast({
        title: 'Você saiu!',
        description: 'Até a próxima!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao sair',
        description: 'Não foi possível fazer o logout. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground font-sans">
              Dinheiro no Bolso
            </h1>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" asChild>
              <Link href="/">
                <Home className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Transações</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <LineChart className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/notes">
                <Notebook className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Notas</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Configurações</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Alterar tema</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Claro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Escuro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
