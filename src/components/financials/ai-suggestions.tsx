'use client';

import { useState } from 'react';
import type { Transaction } from '@/lib/types';
import { suggestImprovements } from '@/ai/flows/suggest-improvements';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AiSuggestionsProps {
  transactions: Transaction[];
}

export function AiSuggestions({ transactions }: AiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    const income = transactions
      .filter((t) => t.type === 'income')
      .map(({ category, amount }) => ({ category, amount }));
    
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .map(({ category, amount }) => ({ category, amount }));
      
    try {
      if (income.length === 0 && expenses.length === 0) {
        setError("Adicione pelo menos uma transação para receber sugestões.");
        return;
      }
      const result = await suggestImprovements({ income, expenses });
      setSuggestions(result.suggestions);
    } catch (e) {
      setError('Ocorreu um erro ao buscar sugestões. Tente novamente mais tarde.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Análise Inteligente</CardTitle>
        <CardDescription>
          Use IA para receber dicas e melhorar sua saúde financeira.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSuggest} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Lightbulb className="mr-2 h-4 w-4" />
              Gerar Sugestões
            </>
          )}
        </Button>
        {error && (
            <Alert variant="destructive">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {suggestions.length > 0 && (
          <div className="space-y-3 pt-4">
            <h4 className="font-semibold">Aqui estão algumas sugestões:</h4>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-muted-foreground">{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
