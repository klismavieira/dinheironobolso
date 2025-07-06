'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CardExpense } from '@/lib/types';
import { useEffect } from 'react';
import { type Categories } from '@/lib/firestoreService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const toYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(2, 'A descrição é obrigatória.').max(100),
  amount: z.coerce.number().min(0.01, 'O valor deve ser maior que zero.'),
  category: z.string({ required_error: 'Selecione uma categoria.' }),
  date: z.preprocess((arg) => {
    if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
  }, z.date({ required_error: 'A data é obrigatória.' })),
});

export type FormValues = z.infer<typeof formSchema>;

interface CardExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Partial<Omit<CardExpense, 'cardId' | 'isBilled' | 'billingCycle'>> | null;
  onSave: (values: FormValues) => void;
  categories: Categories;
}

export function CardExpenseDialog({ open, onOpenChange, expense, onSave, categories }: CardExpenseDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const isEditing = !!expense?.id;
  const availableCategories = categories.expense.filter(c => c !== 'Fatura do Cartão');

  useEffect(() => {
    if (open && expense) {
      form.reset({
        id: expense.id,
        description: expense.description || '',
        amount: expense.amount || 0,
        category: expense.category,
        date: expense.date || new Date(),
      });
    }
  }, [open, expense, form]);

  const onSubmit = (values: FormValues) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Despesa do Cartão' : 'Adicionar Despesa ao Cartão'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Input placeholder="Ex: Assinatura Netflix" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Compra</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value instanceof Date ? toYYYYMMDD(field.value) : ''}
                      onChange={e => e.target.value && field.onChange(new Date(e.target.value + 'T00:00:00'))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {availableCategories?.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{isEditing ? 'Salvar' : 'Adicionar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
