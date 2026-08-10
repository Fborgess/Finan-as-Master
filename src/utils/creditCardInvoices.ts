import { CreditCard, Transaction, CreditCardInvoicePayment, InvoiceStatus } from '../types';

export interface CreditCardInvoiceSummary {
  cardId: string;
  yearMonth: string; // YYYY-MM
  label: string; // ex: "Agosto / 2026"
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  closingDate: string; // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  status: InvoiceStatus;
  transactions: Transaction[];
  payments: CreditCardInvoicePayment[];
}

/**
 * Retorna o mês/ano da fatura (YYYY-MM) ao qual pertence uma compra em determinado cartão.
 * Se o dia da compra for <= ao dia de fechamento, entra no mês da compra.
 * Se o dia da compra for > ao dia de fechamento, entra na fatura do mês SEGUINTE.
 */
export function getInvoiceYearMonthForDate(closingDay: number, dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const parts = dateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const cDay = Math.min(Math.max(closingDay, 1), 28);

  if (day > cDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Adiciona N meses a uma string YYYY-MM
 */
export function addMonthsToYearMonth(yearMonth: string, count: number): string {
  const parts = yearMonth.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);

  month += count;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Retorna as datas exatas de período, fechamento e vencimento para um cartão e um YYYY-MM específico
 */
export function getInvoiceDates(closingDay: number, dueDay: number, yearMonth: string) {
  const parts = yearMonth.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  const safeClosingDay = Math.min(Math.max(closingDay, 1), 28);
  const safeDueDay = Math.min(Math.max(dueDay, 1), 28);

  // Data de Fechamento: YYYY-MM-closingDay
  const closingDate = `${year}-${String(month).padStart(2, '0')}-${String(safeClosingDay).padStart(2, '0')}`;

  // Período de Início: (Mês Anterior)-(safeClosingDay + 1)
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  const periodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(safeClosingDay + 1).padStart(2, '0')}`;
  const periodEnd = closingDate;

  // Data de Vencimento:
  // Se dia do vencimento < dia do fechamento (ex: fecha dia 25, vence dia 5), o vencimento é no mês SEGUINTE ao fechamento.
  // Se dia do vencimento >= dia do fechamento (ex: fecha dia 20, vence dia 28), o vencimento é no MESMO mês do fechamento.
  let dueYear = year;
  let dueMonth = month;

  if (safeDueDay < safeClosingDay) {
    dueMonth += 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
  }

  const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(safeDueDay).padStart(2, '0')}`;

  return { closingDate, dueDate, periodStart, periodEnd };
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthNum = parseInt(monthStr, 10) - 1;
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[monthNum] || monthStr} / ${yearStr}`;
}

export function getInvoiceStatus(
  totalAmount: number,
  amountPaid: number,
  closingDate: string,
  dueDate: string,
  todayStr: string = new Date().toISOString().split('T')[0]
): InvoiceStatus {
  const remaining = Math.max(0, totalAmount - amountPaid);

  if (totalAmount <= 0) return 'ABERTA';
  if (remaining <= 0.01) return 'PAGA';
  if (amountPaid > 0) return 'PARCIAL';
  if (todayStr > dueDate) return 'VENCIDA';
  if (todayStr > closingDate) return 'FECHADA';

  return 'ABERTA';
}

/**
 * Calcula o resumo completo da fatura de um cartão para determinado mês (YYYY-MM)
 */
export function calculateCreditCardInvoice(
  card: CreditCard,
  yearMonth: string,
  allTransactions: Transaction[],
  allPayments: CreditCardInvoicePayment[]
): CreditCardInvoiceSummary {
  const { closingDate, dueDate, periodStart, periodEnd } = getInvoiceDates(card.closingDay, card.dueDay, yearMonth);

  // Filtrar lançamentos pertencentes a este cartão
  const cardTxs = allTransactions.filter(
    (t) => t.creditCardId === card.id && t.type === 'expense' && t.status !== 'cancelled'
  );

  // Identificar transações pertencentes a este YYYY-MM
  const invoiceTransactions = cardTxs.filter((t) => {
    // Se for parcela de um lançamento parcelado
    if (t.isInstallment && t.installmentNumber && t.totalInstallments) {
      // O primeiro lançamento parcelado define o YYYY-MM inicial da primeira parcela
      const baseYearMonth = getInvoiceYearMonthForDate(card.closingDay, t.date);
      // Para a parcela atual t.installmentNumber, adiciona (t.installmentNumber - 1) meses
      const targetYM = addMonthsToYearMonth(baseYearMonth, t.installmentNumber - 1);
      return targetYM === yearMonth;
    }

    // Lançamento normal à vista ou fixo
    const ym = getInvoiceYearMonthForDate(card.closingDay, t.date);
    return ym === yearMonth;
  });

  const totalAmount = invoiceTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Pagamentos registrados para esta fatura
  const invoicePayments = allPayments.filter(
    (p) => p.cardId === card.id && p.yearMonth === yearMonth
  );

  const amountPaid = invoicePayments.reduce((acc, p) => acc + p.amountPaid, 0);
  const remainingBalance = Math.max(0, totalAmount - amountPaid);
  const status = getInvoiceStatus(totalAmount, amountPaid, closingDate, dueDate);

  return {
    cardId: card.id,
    yearMonth,
    label: formatYearMonthLabel(yearMonth),
    periodStart,
    periodEnd,
    closingDate,
    dueDate,
    totalAmount,
    amountPaid,
    remainingBalance,
    status,
    transactions: invoiceTransactions,
    payments: invoicePayments,
  };
}
