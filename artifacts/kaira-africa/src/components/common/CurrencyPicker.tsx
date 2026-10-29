import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CurrencyPickerOption = {
  value: string;
  flag: string;
  label: string;
};

type CurrencyPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: CurrencyPickerOption[];
  ariaLabel: string;
  className?: string;
};

/**
 * Currency selector with a persistent flag beside the selected code.
 * The flag is outside the native option rendering area, so it remains visible
 * on platforms whose dropdown menus do not render emoji flags reliably.
 */
export function CurrencyPicker({ value, onValueChange, options, ariaLabel, className }: CurrencyPickerProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-2 ${className ?? ""}`}>
      {selected && (
        <span aria-hidden="true" className="shrink-0 text-xl leading-none">
          {selected.flag}
        </span>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={ariaLabel} className="min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="text-base">{option.flag}</span>
                <span>{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const COMMON_CURRENCIES: CurrencyPickerOption[] = [
  { value: "GMD", flag: "🇬🇲", label: "GMD — Gambian dalasi (D)" },
  { value: "NGN", flag: "🇳🇬", label: "NGN — Nigerian naira (₦)" },
  { value: "USD", flag: "🇺🇸", label: "USD — US dollar ($)" },
];

export const TRANSACTION_CURRENCIES: CurrencyPickerOption[] = [
  ...COMMON_CURRENCIES,
  { value: "EUR", flag: "🇪🇺", label: "EUR — Euro (€)" },
  { value: "GBP", flag: "🇬🇧", label: "GBP — British pound (£)" },
];
