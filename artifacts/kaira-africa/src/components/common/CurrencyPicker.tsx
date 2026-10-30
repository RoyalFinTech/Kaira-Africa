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
  disabled?: boolean;
};

const FLAG_COUNTRY: Record<string, { label: string; code: string }> = {
  GMD: { label: "Flag of The Gambia", code: "gm" },
  NGN: { label: "Flag of Nigeria", code: "ng" },
  USD: { label: "Flag of the United States", code: "us" },
  EUR: { label: "Flag of the European Union", code: "eu" },
  GBP: { label: "Flag of the United Kingdom", code: "gb" },
};

/**
 * Draw flags as SVG instead of Unicode regional-indicator emoji.
 * Windows/Android fonts and some browser environments render flag emoji as
 * two country letters (for example "GM") when the flag glyph is unavailable.
 * These vector flags are deterministic, crisp at every size and need no CDN.
 */
function CurrencyFlag({ currency, className = "h-5 w-7" }: { currency: string; className?: string }) {
  const meta = FLAG_COUNTRY[currency];
  if (!meta) return null;

  const common = { role: "img" as const, "aria-label": meta.label, viewBox: "0 0 28 20", className, focusable: false as const };
  switch (currency) {
    case "GMD":
      return <svg {...common}><rect width="28" height="20" fill="#fff"/><rect width="28" height="6" y="0" fill="#CE1126"/><rect width="28" height="5" y="7.5" fill="#0C1C8C"/><rect width="28" height="6" y="14" fill="#3A7728"/><rect width="28" height="1.5" y="6" fill="#fff"/><rect width="28" height="1.5" y="12.5" fill="#fff"/></svg>;
    case "NGN":
      return <svg {...common}><rect width="28" height="20" fill="#fff"/><rect width="9.34" height="20" x="0" fill="#008751"/><rect width="9.33" height="20" x="18.67" fill="#008751"/></svg>;
    case "USD":
      return <svg {...common}><rect width="28" height="20" fill="#fff"/>{Array.from({length: 7}, (_, i) => <rect key={i} x="0" y={i * 20 / 7} width="28" height={20 / 13} fill="#B22234"/>)}<rect width="12" height="10.8" fill="#3C3B6E"/>{Array.from({length: 3}, (_, row) => Array.from({length: row % 2 ? 3 : 4}, (_, col) => <circle key={row + "-" + col} cx={1.4 + col * 3.1 + (row % 2 ? 1.5 : 0)} cy={1.5 + row * 3.3} r=".55" fill="#fff"/>))}</svg>;
    case "EUR":
      return <svg {...common}><rect width="28" height="20" fill="#003399"/>{Array.from({length: 12}, (_, i) => { const angle = (i * Math.PI) / 6 - Math.PI / 2; return <circle key={i} cx={14 + Math.cos(angle) * 6} cy={10 + Math.sin(angle) * 6} r="1" fill="#FFCC00"/>; })}</svg>;
    case "GBP":
      return <svg {...common}><rect width="28" height="20" fill="#012169"/><path d="M0 0 28 20 M28 0 0 20" stroke="#fff" strokeWidth="5"/><path d="M0 0 28 20 M28 0 0 20" stroke="#C8102E" strokeWidth="2"/><path d="M14 0 V20 M0 10 H28" stroke="#fff" strokeWidth="7"/><path d="M14 0 V20 M0 10 H28" stroke="#C8102E" strokeWidth="3.5"/></svg>;
    default:
      return null;
  }
}

export function CurrencyPicker({ value, onValueChange, options, ariaLabel, className, disabled = false }: CurrencyPickerProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-2 ${className ?? ""}`}>
      {selected && <CurrencyFlag currency={selected.value} className="h-5 w-7 shrink-0 rounded-[2px] shadow-sm" />}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger disabled={disabled} aria-label={ariaLabel} className="min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus:ring-0">
          <SelectValue>{selected?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="inline-flex items-center gap-2">
                <CurrencyFlag currency={option.value} className="h-5 w-7 shrink-0 rounded-[2px] shadow-sm" />
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
