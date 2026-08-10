/**
 * Utility functions and mask for Portuguese BRL currency inputs.
 * Allows typing numbers naturally without manually pressing the comma.
 */

export function parseCurrencyInput(value: string | number): {
  numericValue: number;
  formatted: string;
  formattedWithPrefix: string;
} {
  if (value === '' || value === null || value === undefined) {
    return {
      numericValue: 0,
      formatted: '0,00',
      formattedWithPrefix: 'R$ 0,00',
    };
  }

  // If already a number, convert to cents
  let cents = 0;
  if (typeof value === 'number') {
    cents = Math.round(value * 100);
  } else {
    // Extract only numeric digits
    const digitsOnly = value.replace(/\D/g, '');
    cents = digitsOnly ? parseInt(digitsOnly, 10) : 0;
  }

  const numericValue = cents / 100;

  const formatted = numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    numericValue,
    formatted,
    formattedWithPrefix: `R$ ${formatted}`,
  };
}

export function formatNumberToBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
