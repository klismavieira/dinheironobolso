'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Transaction } from '@/lib/types';
import { useEffect, useState } from 'react';
import { addCategory, type Categories } from '@/lib/firestoreService';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';


const formSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(0.01, 'O valor deve ser maior que zero.'),
  description: z.string().min(2, 'A descrição é obrigatória.').max(100),
  category: z.string({ required_error: 'Selecione uma categoria.' }),
  date: z.preprocess((arg) => {
    if (typeof arg === 'string') {
      // Handles 'YYYY-MM-DD' from date input, parsing in local timezone.
      return new Date(`${arg}T00:00:00`);
    }
    return arg;
  }, z.date({ required_error: 'A data é obrigatória.' })),
  isFixed: z.boolean().default(false),
  installments: z.coerce.number().min(2, 'O número de parcelas deve ser 2 ou mais.').optional(),
  seriesId: z.string().optional(),
});


export type FormValues = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Partial<Transaction> | null;
  onSave: (values: FormValues) => void;
  categories: Categories;
}

const toYYYYMMDD = (date: Date) => {
  // Using local date components is safer against timezone issues.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function TransactionDialog({ open, onOpenChange, transaction, onSave, categories }: TransactionDialogProps) {
  const { toast } = useToast();
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isFixed: false,
    }
  });
  
  const transactionType = form.watch('type');
  const isFixed = form.watch('isFixed');
  const availableCategories = transactionType === 'income' ? categories.income : categories.expense;
  const isEditing = !!transaction?.id;
  const categoryValue = form.watch('category');

  useEffect(() => {
    if (open) {
      if (transaction?.id) { // isEditing
        form.reset({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date || new Date(),
          isFixed: !!transaction.seriesId,
          seriesId: transaction.seriesId,
        });
      } else { // isCreating
        form.reset({
          id: undefined,
          type: transaction?.type,
          amount: 0,
          description: '',
          category: undefined,
          date: new Date(),
          isFixed: false,
          installments: undefined,
          seriesId: undefined,
        });
      }
    }
  }, [open, transaction, form]);
  
  useEffect(() => {
    if (categoryValue === '_CREATE_NEW_') {
      form.setValue('category', undefined as any, { shouldValidate: true });
      setNewCategoryDialogOpen(true);
    }
  }, [categoryValue, form]);

  const onSubmit = (values: FormValues) => {
    onSave(values);
    onOpenChange(false);
  };
  
  const handleSaveNewCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || !transactionType) return;

    if (availableCategories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        title: "Categoria já existe",
        description: "Essa categoria já está na sua lista.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addCategory(transactionType, trimmedName);
      form.setValue('category', trimmedName, { shouldValidate: true });
      setNewCategoryName('');
      setNewCategoryDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao criar categoria",
        description: "Não foi possível salvar a nova categoria.",
        variant: "destructive",
      });
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Transação' : `Adicionar ${transaction?.type === 'income' ? 'Receita' : 'Despesa'}`}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize os detalhes da sua transação.' : `Adicione uma nova ${transaction?.type === 'income' ? 'receita' : 'despesa'} ao seu controle financeiro.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Salário mensal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? toYYYYMMDD(field.value) : ''}
                            onChange={e => {
                              // Manually construct date from string to avoid timezone issues.
                              // e.target.value is "YYYY-MM-DD", which we want to interpret as local time, not UTC.
                              // `new Date(`${e.target.value}T00:00:00`)` interprets it as local time.
                              if (e.target.value) {
                                field.onChange(new Date(`${e.target.value}T00:00:00`));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCategories?.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                        <Separator className="my-1" />
                        <SelectItem value="_CREATE_NEW_">
                          <span className="flex items-center">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar nova categoria
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                  <FormField
                  control={form.control}
                  name="isFixed"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                          <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isEditing}
                          />
                      </FormControl>
                      <FormLabel className="font-normal">
                          Transação Recorrente/Parcelada
                      </FormLabel>
                      </FormItem>
                  )}
                  />
                  {isFixed && !isEditing && (
                  <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <FormControl>
                          <Input
                              type="number"
                              placeholder="Padrão: 12"
                              min="2"
                              disabled={isEditing}
                              {...field}
                              value={field.value ?? ''}
                          />
                          </FormControl>
                          <FormDescription>
                            Deixe em branco para o padrão de 12 parcelas.
                          </FormDescription>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  )}
              </div>

              <DialogFooter>
                 <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{isEditing ? 'Salvar Alterações' : 'Adicionar'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar Nova Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o nome para a nova categoria de {transactionType === 'income' ? 'receita' : 'despesa'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Ex: Supermercado"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveNewCategory();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCategoryName('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveNewCategory}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
