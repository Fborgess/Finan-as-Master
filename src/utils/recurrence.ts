import { RecurrenceFrequency, Transaction } from '../types';

export const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string; description: string }[] = [
  { value: 'weekly', label: 'Semanal', description: 'A cada 7 dias' },
  { value: 'biweekly', label: 'Quinzenal', description: 'A cada 15 dias' },
  { value: 'monthly', label: 'Mensal', description: 'A cada mês (mesmo dia)' },
  { value: 'bimonthly', label: 'Bimestral', description: 'A cada 2 meses' },
  { value: 'quarterly', label: 'Trimestral', description: 'A cada 3 meses' },
  { value: 'semiannually', label: 'Semestral', description: 'A cada 6 meses' },
  { value: 'yearly', label: 'Anual', description: 'A cada 1 ano' },
];

export const addMonthsToDateString = (dateStr: string, monthsToAdd: number): string => {
  if (!dateStr) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const targetDate = new Date(year, month - 1 + monthsToAdd, day);
  const expectedMonth = (month - 1 + monthsToAdd) % 12;
  const normalizedExpectedMonth = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;
  if (targetDate.getMonth() !== normalizedExpectedMonth) {
    targetDate.setDate(0);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addFrequencyToDateString = (
  dateStr: string,
  stepIndex: number,
  frequency: RecurrenceFrequency
): string => {
  if (!dateStr || stepIndex === 0) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (frequency === 'weekly') {
    const d = new Date(year, month - 1, day + stepIndex * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  } else if (frequency === 'biweekly') {
    const d = new Date(year, month - 1, day + stepIndex * 15);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  } else if (frequency === 'monthly') {
    return addMonthsToDateString(dateStr, stepIndex);
  } else if (frequency === 'bimonthly') {
    return addMonthsToDateString(dateStr, stepIndex * 2);
  } else if (frequency === 'quarterly') {
    return addMonthsToDateString(dateStr, stepIndex * 3);
  } else if (frequency === 'semiannually') {
    return addMonthsToDateString(dateStr, stepIndex * 6);
  } else if (frequency === 'yearly') {
    return addMonthsToDateString(dateStr, stepIndex * 12);
  }

  return addMonthsToDateString(dateStr, stepIndex);
};

export const formatFrequencyLabel = (freq?: RecurrenceFrequency): string => {
  switch (freq) {
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quinzenal';
    case 'monthly':
      return 'Mensal';
    case 'bimonthly':
      return 'Bimestral';
    case 'quarterly':
      return 'Trimestral';
    case 'semiannually':
      return 'Semestral';
    case 'yearly':
      return 'Anual';
    default:
      return 'Mensal';
  }
};

export const formatModalityBadge = (tx: Transaction): { text: string; subtext?: string; type: 'single' | 'installment' | 'recurring' } => {
  if (tx.isInstallment || tx.paymentModality === 'installment') {
    const current = tx.installmentNumber || 1;
    const total = tx.totalInstallments || 1;
    const freq = formatFrequencyLabel(tx.installmentFrequency || 'monthly');
    return {
      text: `${current}/${total}`,
      subtext: `Parcelado • ${freq}`,
      type: 'installment',
    };
  }

  if (tx.isRecurring || tx.paymentModality === 'recurring') {
    const freq = formatFrequencyLabel(tx.recurrenceFrequency || 'monthly');
    if (tx.recurrenceCount) {
      const idx = tx.recurrenceIndex || 1;
      return {
        text: `Fixo ${idx}/${tx.recurrenceCount}`,
        subtext: `Recorrente • ${freq}`,
        type: 'recurring',
      };
    }
    return {
      text: `Fixo`,
      subtext: `Recorrente • ${freq}`,
      type: 'recurring',
    };
  }

  return {
    text: 'À vista',
    type: 'single',
  };
};
