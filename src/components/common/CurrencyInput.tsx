import React, { useState, useEffect } from 'react';
import { parseCurrencyInput, formatNumberToBRL } from '../../utils/currencyMask';

interface CurrencyInputProps {
  value: number;
  onChange: (numericValue: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  showPrefix?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  id,
  name,
  required = false,
  disabled = false,
  autoFocus = false,
  showPrefix = true,
}) => {
  // Local display text (e.g. "1.000,00")
  const [displayText, setDisplayText] = useState<string>(() => {
    return formatNumberToBRL(value);
  });

  // Keep local display text in sync when parent prop value changes externally
  useEffect(() => {
    const formatted = formatNumberToBRL(value);
    setDisplayText(formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const { numericValue, formatted } = parseCurrencyInput(rawVal);
    setDisplayText(formatted);
    onChange(numericValue);
  };

  return (
    <div className="relative flex items-center w-full">
      {showPrefix && (
        <span className="absolute left-3.5 text-xs font-bold text-slate-400 pointer-events-none select-none">
          R$
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        value={displayText}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-xs text-white placeholder-slate-500 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition ${
          showPrefix ? 'pl-10 pr-3' : 'px-3.5'
        } ${className}`}
      />
    </div>
  );
};
