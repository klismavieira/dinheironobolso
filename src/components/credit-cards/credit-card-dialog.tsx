'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreditCard } from '@/lib/types';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'O nome é obrigatório.'),
  limit: z.coerce.number().min(0, 'O limite deve ser zero ou maior.'),
  closingDay: z.coerce.number().min(1, 'Dia inválido.').max(31, 'Dia inválido.'),
  dueDay: z.coerce.number().min(1, 'Dia inválido.').max(31, 'Dia inválido.'),
});

export type FormValues = z.infer<typeof formSchema>;

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Partial<CreditCard> | null;
  onSave: (values: FormValues) => void;
}

export function CreditCardDialog({ open, onOpenChange, card, onSave }: CreditCardDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const isEditing = !!card?.id;

  useEffect(() => {
    if (open && card) {
      form.reset({
        id: card.id,
        name: card.name || '',
        limit: card.limit || 0,
        closingDay: card.closingDay || 1,
        dueDay: card.dueDay || 10,
      });
    }
  }, [open, card, form]);

  const onSubmit = (values: FormValues) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cartão de Crédito' : 'Adicionar Cartão de Crédito'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os detalhes do seu cartão.' : 'Adicione um novo cartão para gerenciar faturas.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Cartão</FormLabel>
                <FormControl><Input placeholder="Ex: Cartão Nu" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="limit" render={({ field }) => (
              <FormItem>
                <FormLabel>Limite (R$)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="5000,00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="closingDay" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia do Fechamento</FormLabel>
                  <FormControl><Input type="number" min="1" max="31" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDay" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia do Vencimento</FormLabel>
                  <FormControl><Input type="number" min="1" max="31" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{isEditing ? 'Salvar Alterações' : 'Adicionar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
