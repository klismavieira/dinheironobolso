
'use client';

import type { Transaction } from '@/lib/types';
import React from 'react';

interface FinancialSummaryProps {
  transactions: Transaction[];
  previousBalance: number;
}

export function FinancialSummary({ transactions, previousBalance }: FinancialSummaryProps) {
  // All cards have been removed as per user request.
  // This component now renders nothing, effectively hiding the summary sections.
  return null;
}
