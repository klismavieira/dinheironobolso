import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';
import { Home, LineChart } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-sans">
              Dinheiro no Bolso
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Transações
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <LineChart className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
