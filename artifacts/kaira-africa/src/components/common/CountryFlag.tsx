import { GambiaFlag } from '@/components/common/GambiaFlag';

export type KairaCountry =
  | 'The Gambia'
  | 'Senegal'
  | 'Sierra Leone'
  | 'Ghana'
  | 'Nigeria'
  | 'Kenya'
  | 'South Africa'
  | 'Egypt';

interface CountryFlagProps {
  country: string;
  className?: string;
  width?: number;
  height?: number;
}

/** Compact, locally-rendered country flags for onboarding selectors. */
export function CountryFlag({ country, className, width = 24, height = 16 }: CountryFlagProps) {
  if (country === 'The Gambia') {
    return <GambiaFlag className={className} width={width} height={height} />;
  }

  const common = {
    viewBox: '0 0 30 20',
    width,
    height,
    className: `inline-block shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-sm ${className ?? ''}`,
    role: 'img' as const,
    'aria-label': `Flag of ${country}`,
    xmlns: 'http://www.w3.org/2000/svg',
  };

  switch (country) {
    case 'Senegal':
      return <svg {...common}><rect width="10" height="20" fill="#00853F"/><rect x="10" width="10" height="20" fill="#FDEF42"/><rect x="20" width="10" height="20" fill="#E31B23"/><path d="m15 6 1.1 2.5 2.7.2-2.1 1.7.7 2.6-2.4-1.5-2.4 1.5.7-2.6-2.1-1.7 2.7-.2Z" fill="#00853F"/></svg>;
    case 'Sierra Leone':
      return <svg {...common}><rect width="30" height="6.67" fill="#1EB53A"/><rect y="6.67" width="30" height="6.66" fill="#FFF"/><rect y="13.33" width="30" height="6.67" fill="#0072C6"/></svg>;
    case 'Ghana':
      return <svg {...common}><rect width="30" height="6.67" fill="#CE1126"/><rect y="6.67" width="30" height="6.66" fill="#FCD116"/><rect y="13.33" width="30" height="6.67" fill="#006B3F"/><path d="m15 7 1.2 3.1h3.3l-2.7 1.9 1 3.1-2.8-1.9-2.8 1.9 1-3.1-2.7-1.9h3.3Z" fill="#111"/></svg>;
    case 'Nigeria':
      return <svg {...common}><rect width="10" height="20" fill="#008751"/><rect x="10" width="10" height="20" fill="#FFF"/><rect x="20" width="10" height="20" fill="#008751"/></svg>;
    case 'Kenya':
      return <svg {...common}><rect width="30" height="6" fill="#111"/><rect y="6" width="30" height="1.3" fill="#FFF"/><rect y="7.3" width="30" height="5.4" fill="#BB0000"/><rect y="12.7" width="30" height="1.3" fill="#FFF"/><rect y="14" width="30" height="6" fill="#006600"/><path d="M15 7.2c-4 2-4 4.6 0 6.1 4-1.5 4-4.1 0-6.1Z" fill="#FFF" stroke="#FFF" strokeWidth="2"/><path d="M15 7.6v5.3" stroke="#111" strokeWidth="1.5"/></svg>;
    case 'South Africa':
      return <svg {...common}><rect width="30" height="10" fill="#DE3831"/><rect y="10" width="30" height="10" fill="#002395"/><path d="M0 0 14 10 0 20Z" fill="#000"/><path d="M0 2.3 11.5 10 0 17.7" fill="none" stroke="#FFB612" strokeWidth="4.5"/><path d="M0 4.2 9 10 0 15.8Z" fill="#007A4D"/><path d="M8.5 8.2H30v3.6H8.5L3.2 10Z" fill="#FFF"/><path d="M8.5 9H30v2H8.5L5.5 10Z" fill="#007A4D"/></svg>;
    case 'Egypt':
      return <svg {...common}><rect width="30" height="6.67" fill="#CE1126"/><rect y="6.67" width="30" height="6.66" fill="#FFF"/><rect y="13.33" width="30" height="6.67" fill="#000"/><path d="M13 8h4v4h-4z" fill="#C09300"/></svg>;
    default:
      return null;
  }
}
