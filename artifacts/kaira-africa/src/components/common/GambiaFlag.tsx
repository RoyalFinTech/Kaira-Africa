import { cn } from '@/lib/utils';

interface GambiaFlagProps {
  className?: string;
  width?: number;
  height?: number;
}

/** Crisp vector flag for The Gambia. Avoids platform-dependent "GM" emoji fallback. */
export function GambiaFlag({ className, width = 28, height = 20 }: GambiaFlagProps) {
  return (
    <svg
      role="img"
      aria-label="Flag of The Gambia"
      viewBox="0 0 30 20"
      width={width}
      height={height}
      className={cn('inline-block shrink-0 overflow-hidden rounded-[2px] border border-black/10 shadow-sm', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="30" height="6" fill="#CE1126" />
      <rect y="6" width="30" height="1.6" fill="#FFFFFF" />
      <rect y="7.6" width="30" height="4.8" fill="#0C1C8C" />
      <rect y="12.4" width="30" height="1.6" fill="#FFFFFF" />
      <rect y="14" width="30" height="6" fill="#3A7728" />
    </svg>
  );
}
