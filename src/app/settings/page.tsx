
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  onCategoriesUpdate,
  updateCategory,
  deleteCategory,
  type Categories,
} from '@/lib/firestoreService';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type CategoryEditState = {
  type: 'income' | 'expense';
  oldName: string;
  newName: string;
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Categories | null>(null);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<CategoryEditState | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const unsubscribe = onCategoriesUpdate(
      (updatedCategories) => {
        setCategories(updatedCategories);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Erro ao buscar categorias',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleOpenEditDialog = (type: 'income' | 'expense', oldName: string) => {
    setEditState({ type, oldName, newName: oldName });
    setEditDialogOpen(true);
  };

  const handleEditCategory = async () => {
    if (!editState) return;
    const { type, oldName, newName } = editState;
    if (!newName.trim() || newName.trim() === oldName) {
      setEditDialogOpen(false);
      return;
    }

    try {
      await updateCategory(type, oldName, newName.trim());
      toast({
        title: 'Categoria atualizada',
        description: `A categoria "${oldName}" foi renomeada para "${newName.trim()}".`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Não foi possível renomear a categoria.',
        variant: 'destructive',
      });
    } finally {
      setEditDialogOpen(false);
      setEditState(null);
    }
  };

  const handleDeleteCategory = async (type: 'income' | 'expense', name: string) => {
    try {
      await deleteCategory(type, name);
      toast({
        title: 'Categoria excluída',
        description: `A categoria "${name}" foi removida.`,
        variant: 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: error instanceof Error ? error.message : 'Não foi possível remover a categoria.',
        variant: 'destructive',
      });
    }
  };

  const renderCategoryList = (
    title: string,
    type: 'income' | 'expense',
    systemCategories: string[],
    userCategories: string[] = []
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Gerencie suas categorias de {type === 'income' ? 'receita' : 'despesa'}. As categorias padrão não podem ser alteradas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Padrão</h3>
          <ul className="space-y-2">
            {systemCategories.map((cat) => (
              <li key={cat} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-sm">{cat}</span>
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Personalizadas</h3>
          {userCategories.length > 0 ? (
            <ul className="space-y-2">
              {userCategories.map((cat) => (
                <li key={cat} className="flex items-center justify-between p-2 rounded-md border">
                  <span className="text-sm">{cat}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(type, cat)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Categoria?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a categoria "{cat}"? Essa ação não pode ser desfeita. As transações existentes com esta categoria não serão alteradas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCategory(type, cat)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria personalizada.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || loading) {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const userIncomeCategories = categories?.income.filter(c => !INCOME_CATEGORIES.includes(c)) || [];
  const userExpenseCategories = categories?.expense.filter(c => !EXPENSE_CATEGORIES.includes(c)) || [];

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do seu aplicativo.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {renderCategoryList('Categorias de Receita', 'income', INCOME_CATEGORIES, userIncomeCategories)}
        {renderCategoryList('Categorias de Despesa', 'expense', EXPENSE_CATEGORIES, userExpenseCategories)}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editState?.newName || ''}
              onChange={(e) => setEditState(prev => prev ? { ...prev, newName: e.target.value } : null)}
              placeholder="Novo nome da categoria"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
