'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Transaction } from '@/lib/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';

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
  Form,
  FormControl,
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
import { useEffect } from 'react';

const formSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(0.01, 'O valor deve ser maior que zero.'),
  description: z.string().min(2, 'A descrição é obrigatória.').max(100),
  category: z.string({ required_error: 'Selecione uma categoria.' }),
  date: z.preprocess((arg) => {
    // The HTML date input returns a string 'YYYY-MM-DD'.
    // `new Date('YYYY-MM-DD')` is parsed as UTC midnight.
    // This can cause the date to be off by one day depending on the user's timezone.
    // By adding 'T00:00:00', we explicitly tell it to parse in the local timezone.
    if (typeof arg === 'string') {
      return new Date(`${arg}T00:00:00`);
    }
    // For initial values which are already Date objects, we pass them through.
    return arg;
  }, z.date({ required_error: 'A data é obrigatória.' })),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Partial<Transaction> | null;
  onSave: (values: Partial<Transaction>) => void;
}

const toYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function TransactionDialog({ open, onOpenChange, transaction, onSave }: TransactionDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const transactionType = form.watch('type');
  const categories = transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isEditing = !!transaction?.id;

  useEffect(() => {
    if (open) {
      if (isEditing && transaction) {
        // Editing an existing transaction
        form.reset({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date || new Date(), // Use existing date or today
        });
      } else {
        // Adding a new transaction, default to today
        form.reset({
          id: undefined,
          type: transaction?.type,
          amount: 0,
          description: '',
          category: undefined,
          date: new Date(),
        });
      }
    }
  }, [open, transaction, form, isEditing]);
  
  const onSubmit = (values: FormValues) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
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
                          value={field.value instanceof Date ? toYYYYMMDD(field.value) : field.value || ''}
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
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
