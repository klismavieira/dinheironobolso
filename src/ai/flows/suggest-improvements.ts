'use server';

/**
 * @fileOverview An AI agent that suggests improvements to income and expenses.
 *
 * - suggestImprovements - A function that suggests improvements to financial data.
 * - SuggestImprovementsInput - The input type for the suggestImprovements function.
 * - SuggestImprovementsOutput - The return type for the suggestImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestImprovementsInputSchema = z.object({
  income: z
    .array(
      z.object({
        category: z.string(),
        amount: z.number(),
      })
    )
    .describe('Array of income entries with category and amount.'),
  expenses: z
    .array(
      z.object({
        category: z.string(),
        amount: z.number(),
      })
    )
    .describe('Array of expense entries with category and amount.'),
});
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('Array of suggestions to improve financial situation.'),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput> {
  return suggestImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: {schema: SuggestImprovementsInputSchema},
  output: {schema: SuggestImprovementsOutputSchema},
  prompt: `You are a financial advisor providing advice to improve income and expense management.

  Analyze the following income and expense data and provide suggestions to improve the user's financial situation.
  The goal is to make income greater than expenses.

  Income:
  {{#each income}}
  - Category: {{this.category}}, Amount: {{this.amount}}
  {{/each}}

  Expenses:
  {{#each expenses}}
  - Category: {{this.category}}, Amount: {{this.amount}}
  {{/each}}

  Suggestions should include specific actions to either reduce spending in certain categories or increase income.
  Do not suggest actions unrelated to the income and expenses provided.

  Respond with an array of strings, with each string containing one suggestion.
  `,
});

const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestImprovementsInputSchema,
    outputSchema: SuggestImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
