'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Transaction } from '@/lib/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { useEffect } from 'react';

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
import { Switch } from '@/components/ui/switch';


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
  installments: z.coerce.number().int().positive().optional(),
}).refine(data => {
  if (data.isFixed) {
    return data.installments !== undefined && data.installments > 1;
  }
  return true;
}, {
  message: "O número de parcelas deve ser 2 ou mais.",
  path: ["installments"],
});

export type FormValues = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Partial<Transaction> | null;
  onSave: (values: FormValues) => void;
}

const toYYYYMMDD = (date: Date) => {
  const d = new Date(date);
  // Adjust for timezone offset to get the correct local date
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export function TransactionDialog({ open, onOpenChange, transaction, onSave }: TransactionDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isFixed: false,
    }
  });
  
  const transactionType = form.watch('type');
  const isFixed = form.watch('isFixed');
  const categories = transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isEditing = !!transaction?.id;

  useEffect(() => {
    if (open) {
      if (isEditing && transaction) {
        form.reset({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date || new Date(),
          isFixed: false,
          installments: undefined,
        });
      } else {
        form.reset({
          id: undefined,
          type: transaction?.type,
          amount: 0,
          description: '',
          category: undefined,
          date: new Date(),
          isFixed: false,
          installments: undefined,
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
                          value={field.value instanceof Date ? toYYYYMMDD(field.value) : ''}
                          onChange={e => field.onChange(e.target.valueAsDate)}
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

            {!isEditing && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isFixed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Transação Fixa/Parcelada</FormLabel>
                        <FormDescription>
                          Marque para repetir esta transação nos próximos meses.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {isFixed && (
                  <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Parcelas</FormLabel>
                        <FormControl>
                          <Input type="number" min="2" placeholder="Ex: 12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

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
