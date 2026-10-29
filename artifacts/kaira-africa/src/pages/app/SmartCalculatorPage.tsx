import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Copy, Delete, History, RotateCcw, Sparkles, Percent, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type HistoryItem = { expression: string; result: number };

function evaluateExpression(source: string): number {
  const tokens = source.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').match(/\d*\.?\d+(?:e[+-]?\d+)?|[()+\-*/%^]/gi);
  if (!tokens || tokens.join('') !== source.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')) {
    throw new Error('Check the expression');
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const primary = (): number => {
    const token = take();
    if (token === undefined) throw new Error('Incomplete expression');
    if (token === '+') return primary();
    if (token === '-') return -primary();
    if (token === '(') {
      const value = addSub();
      if (take() !== ')') throw new Error('Missing closing bracket');
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error('Invalid number');
    return value;
  };
  const power = (): number => {
    const base = primary();
    return peek() === '^' ? (take(), Math.pow(base, unaryPower())) : base;
  };
  const unaryPower = (): number => {
    if (peek() === '+') { take(); return unaryPower(); }
    if (peek() === '-') { take(); return -unaryPower(); }
    return power();
  };
  const multiplyDivide = (): number => {
    let value = unaryPower();
    while (peek() === '*' || peek() === '/' || peek() === '%' ) {
      const op = take();
      const right = unaryPower();
      if ((op === '/' || op === '%') && right === 0) throw new Error('Cannot divide by zero');
      value = op === '*' ? value * right : op === '/' ? value / right : value % right;
    }
    return value;
  };
  const addSub = (): number => {
    let value = multiplyDivide();
    while (peek() === '+' || peek() === '-') {
      const op = take();
      const right = multiplyDivide();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };
  const result = addSub();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid calculation');
  return result;
}

const keys = [
  { label: 'AC', kind: 'utility' }, { label: '( )', kind: 'utility' }, { label: '%', kind: 'utility' }, { label: '÷', kind: 'operator' },
  { label: '7', kind: 'number' }, { label: '8', kind: 'number' }, { label: '9', kind: 'number' }, { label: '×', kind: 'operator' },
  { label: '4', kind: 'number' }, { label: '5', kind: 'number' }, { label: '6', kind: 'number' }, { label: '−', kind: 'operator' },
  { label: '1', kind: 'number' }, { label: '2', kind: 'number' }, { label: '3', kind: 'number' }, { label: '+', kind: 'operator' },
  { label: '±', kind: 'utility' }, { label: '0', kind: 'number' }, { label: '.', kind: 'number' }, { label: '=', kind: 'equals' },
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 10 }).format(Number(value.toPrecision(11)));
}

export default function SmartCalculatorPage() {
  const { toast } = useToast();
  const [expression, setExpression] = useState('0');
  const [justCalculated, setJustCalculated] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [calcError, setCalcError] = useState('');
  const [mode, setMode] = useState<'standard' | 'business'>('standard');
  const [cost, setCost] = useState('100');
  const [selling, setSelling] = useState('150');
  const [discountPrice, setDiscountPrice] = useState('1000');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [taxPrice, setTaxPrice] = useState('1000');
  const [taxPercent, setTaxPercent] = useState('15');

  const result = useMemo(() => {
    try { return expression.trim() ? evaluateExpression(expression) : 0; }
    catch { return null; }
  }, [expression]);

  const append = useCallback((value: string) => {
    setCalcError('');
    setExpression(current => {
      if (value === 'AC') return '0';
      if (value === 'BACK') return current.length <= 1 ? '0' : current.slice(0, -1);
      if (value === '±') return current.startsWith('-') ? current.slice(1) : current === '0' ? '-0' : '-' + current;
      if (current === '0' && value === '(') return '(';
      if (value === '( )') {
        const opens = (current.match(/\(/g) || []).length;
        const closes = (current.match(/\)/g) || []).length;
        return current === '0' ? '(' : (opens > closes ? current + ')' : current + '(');
      }
      const token = value === '×' ? '*' : value === '÷' ? '/' : value === '−' ? '-' : value;
      if (justCalculated && /[0-9.(]/.test(token)) {
        setJustCalculated(false);
        return token;
      }
      setJustCalculated(false);
      return current === '0' && /[0-9.]/.test(token) ? token : current + token;
    });
  }, [justCalculated]);

  const calculate = useCallback(() => {
    try {
      const value = evaluateExpression(expression);
      setHistory(items => [{ expression, result: value }, ...items].slice(0, 12));
      setExpression(String(Number(value.toPrecision(11))));
      setJustCalculated(true);
      setCalcError('');
    } catch (error) {
      setCalcError(error instanceof Error ? error.message : 'Unable to calculate');
    }
  }, [expression]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) return;
      if (/^[0-9.]$/.test(event.key)) { event.preventDefault(); append(event.key); }
      else if (event.key === '%') { event.preventDefault(); if (result !== null) { setExpression(String(Number((result / 100).toPrecision(11)))); setJustCalculated(true); } else append('%'); }
      else if (['+', '-', '*', '/', '^', '(', ')'].includes(event.key)) { event.preventDefault(); append(event.key); }
      else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); calculate(); }
      else if (event.key === 'Backspace') { event.preventDefault(); append('BACK'); }
      else if (event.key === 'Escape') { event.preventDefault(); append('AC'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [append, calculate, result]);

  const addResultToHistory = (label: string, value: number) => {
    if (!Number.isFinite(value)) return;
    setHistory(items => [{ expression: label, result: value }, ...items].slice(0, 12));
  };
  const copyResult = async () => {
    if (result === null) return;
    try {
      await navigator.clipboard.writeText(String(result));
      toast({ title: 'Copied result', description: 'The calculator result is on your clipboard.' });
    } catch {
      toast({ title: 'Copy unavailable', description: 'Please select and copy the result manually.', variant: 'destructive' });
    }
  };

  const costValue = Number(cost), sellingValue = Number(selling);
  const profit = sellingValue - costValue;
  const margin = sellingValue > 0 ? (profit / sellingValue) * 100 : 0;
  const markup = costValue > 0 ? (profit / costValue) * 100 : 0;
  const discountBase = Math.max(0, Number(discountPrice) || 0);
  const discountRate = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const taxBase = Math.max(0, Number(taxPrice) || 0);
  const taxRate = Math.max(0, Number(taxPercent) || 0);
  const discounted = discountBase * (1 - discountRate / 100);
  const withTax = taxBase * (1 + taxRate / 100);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Calculator className="h-3.5 w-3.5" /> KAIRA AFRICA TOOLS</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Smart Calculator</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">Quick everyday maths and practical business calculations in one place.</p>
        </div>
        <div className="flex rounded-xl border bg-card p-1">
          <Button variant={mode === 'standard' ? 'default' : 'ghost'} onClick={() => setMode('standard')} className="flex-1 sm:flex-none"><Calculator className="mr-2 h-4 w-4" /> Standard</Button>
          <Button variant={mode === 'business' ? 'default' : 'ghost'} onClick={() => setMode('business')} className="flex-1 sm:flex-none"><ArrowLeftRight className="mr-2 h-4 w-4" /> Business</Button>
        </div>
      </div>

      {mode === 'standard' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-6">
              <div className="rounded-2xl bg-[#0D3B2A] p-4 text-right text-white sm:p-6">
                <div className="mb-2 flex items-center justify-between text-xs text-emerald-100/75"><span>REAL-TIME CALCULATION</span><span>Keyboard supported</span></div>
                <div className="min-h-7 overflow-x-auto whitespace-nowrap text-sm text-emerald-100/80">{expression || '0'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div aria-live="polite" className="min-h-12 min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-3xl font-semibold tracking-tight sm:text-5xl">{result === null ? '—' : formatNumber(result)}</div>
                  <Button variant="ghost" size="icon" aria-label="Copy calculator result" title="Copy result" disabled={result === null} onClick={copyResult} className="shrink-0 text-emerald-50 hover:bg-white/10 hover:text-white"><Copy className="h-4 w-4" /></Button>
                </div>
                {calcError && <p role="alert" className="mt-2 text-sm text-amber-200">{calcError}</p>}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
                {keys.map(key => (
                  <Button key={key.label} type="button" variant={key.kind === 'equals' ? 'default' : key.kind === 'operator' ? 'secondary' : 'outline'} onClick={() => key.label === '=' ? calculate() : key.label === '%' && result !== null ? (setExpression(String(Number((result / 100).toPrecision(11)))), setJustCalculated(true), setCalcError('')) : append(key.label)} className={`h-14 rounded-xl text-lg font-semibold sm:h-16 ${key.kind === 'equals' ? 'bg-[#E7B32B] text-[#10281D] hover:bg-[#F0C64D]' : key.kind === 'operator' ? 'border-primary/20' : ''}`}>
                    {key.label}
                  </Button>
                ))}
                <Button variant="outline" onClick={() => append('BACK')} className="col-span-2 h-12 rounded-xl"><Delete className="mr-2 h-4 w-4" /> Delete</Button>
                <Button variant="outline" onClick={() => append('AC')} className="col-span-2 h-12 rounded-xl"><RotateCcw className="mr-2 h-4 w-4" /> Clear</Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">Tip: use your keyboard. Enter calculates, Backspace deletes, and Esc clears.</p>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Recent calculations</CardTitle><CardDescription>Saved for this page session only.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Your recent calculations will appear here.</p> : history.map((item, index) => (
                <button key={`${item.expression}-${index}`} onClick={() => { setExpression(String(item.result)); setJustCalculated(true); }} className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent">
                  <div className="truncate text-xs text-muted-foreground">{item.expression}</div><div className="mt-1 font-semibold">{formatNumber(item.result)}</div>
                </button>
              ))}
              {history.length > 0 && <Button variant="ghost" size="sm" className="w-full" onClick={() => setHistory([])}>Clear history</Button>}
              <div className="rounded-xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground"><Sparkles className="mb-1 h-4 w-4 text-primary" /> Calculation history stays in this page session and is not saved to your business records.</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-primary" /> Profit & margin</CardTitle><CardDescription>Estimate gross profit, profit margin and markup from cost and selling price.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="calc-cost">Cost price</Label><Input id="calc-cost" type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="calc-selling">Selling price</Label><Input id="calc-selling" type="number" min="0" value={selling} onChange={e => setSelling(e.target.value)} /></div></div>
              <div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Profit</p><p className={`mt-1 break-words text-lg font-bold ${profit < 0 ? 'text-destructive' : 'text-primary'}`}>{formatNumber(profit)}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Margin</p><p className="mt-1 text-lg font-bold">{formatNumber(margin)}%</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Markup</p><p className="mt-1 text-lg font-bold">{formatNumber(markup)}%</p></div></div>
              <Button variant="outline" className="w-full" onClick={() => { setExpression(String(Number(profit.toPrecision(11)))); setMode('standard'); addResultToHistory('Profit: selling price − cost price', profit); }}>Use profit in calculator</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" /> Discount & tax</CardTitle><CardDescription>Calculate a discounted price or add a percentage-based tax/charge.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Discount</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="calc-discount-price">Original price</Label><Input id="calc-discount-price" type="number" min="0" value={discountPrice} onChange={e => setDiscountPrice(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="calc-discount-percent">Discount %</Label><Input id="calc-discount-percent" type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} /></div></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">You save {formatNumber(discountBase - discounted)}</span><strong className="text-lg">{formatNumber(discounted)}</strong></div><Button variant="outline" className="w-full" onClick={() => { setExpression(String(Number(discounted.toPrecision(11)))); setMode('standard'); addResultToHistory('Price after discount', discounted); }}>Use discounted price</Button></div>
              <div className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Add tax / charge</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="calc-tax-price">Base amount</Label><Input id="calc-tax-price" type="number" min="0" value={taxPrice} onChange={e => setTaxPrice(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="calc-tax-percent">Tax / charge %</Label><Input id="calc-tax-percent" type="number" min="0" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} /></div></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Added amount {formatNumber(withTax - taxBase)}</span><strong className="text-lg">{formatNumber(withTax)}</strong></div><Button variant="outline" className="w-full" onClick={() => { setExpression(String(Number(withTax.toPrecision(11)))); setMode('standard'); addResultToHistory('Amount including tax/charge', withTax); }}>Use total in calculator</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
