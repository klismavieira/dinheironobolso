
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
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CategoryEditState = {
  type: 'income' | 'expense';
  oldName: string;
  newName: string;
};

export default function SettingsPage() {
  const { user, loading: authLoading, sendPasswordReset } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Categories | null>(null);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<CategoryEditState | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);


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
  
  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      toast({
        title: 'Erro',
        description: 'Usuário não encontrado ou sem e-mail cadastrado.',
        variant: 'destructive',
      });
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordReset(user.email);
      toast({
        title: 'E-mail de redefinição enviado!',
        description: 'Verifique sua caixa de entrada para o link de redefinição de senha.',
      });
    } catch (error) {
      console.error('Password Reset Error:', error);
      toast({
        title: 'Falha ao redefinir a senha',
        description: 'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
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
      <div className="space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const userIncomeCategories = categories?.income.filter(c => !INCOME_CATEGORIES.includes(c)) || [];
  const userExpenseCategories = categories?.expense.filter(c => !EXPENSE_CATEGORIES.includes(c)) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua conta e do aplicativo.</p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>
                Gerencie as configurações de segurança da sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handlePasswordReset} disabled={isResetting}>
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir Senha
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Um e-mail será enviado para <strong>{user?.email}</strong> com instruções para redefinir sua senha.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="categories">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderCategoryList('Categorias de Receita', 'income', INCOME_CATEGORIES, userIncomeCategories)}
                {renderCategoryList('Categorias de Despesa', 'expense', EXPENSE_CATEGORIES, userExpenseCategories)}
            </div>
        </TabsContent>
      </Tabs>


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
