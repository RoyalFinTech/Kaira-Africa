import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface KairaLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function KairaLogo({ className, width = 180, height }: KairaLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    const markSize = Math.min(width, 44);
    if (width <= 48) {
      return (
        <span
          role="img"
          aria-label={BRAND.name}
          className={cn('grid shrink-0 place-items-center rounded-lg border border-[#D8B45A]/40 bg-[#0D2818] font-bold text-[#D8B45A]', className)}
          style={{ width: markSize, height: markSize, fontSize: markSize * 0.55 }}
        >
          K
        </span>
      );
    }
    return (
      <span
        role="img"
        aria-label={BRAND.name}
        className={cn('inline-flex max-w-full items-center gap-2 text-left', className)}
        style={{ width }}
      >
        <span
          aria-hidden="true"
          className="grid shrink-0 place-items-center rounded-lg border border-[#D8B45A]/40 bg-[#0D2818] font-bold text-[#D8B45A]"
          style={{ width: markSize, height: markSize, fontSize: markSize * 0.55 }}
        >
          K
        </span>
        <span className="min-w-0 font-semibold leading-tight tracking-wide text-[#0D2818]">
          KAIRA <span className="block text-xs font-medium tracking-[0.18em]">AFRICA</span>
        </span>
      </span>
    );
  }

  return (
    <img
      src={BRAND.logoUrl}
      alt={BRAND.name}
      width={width}
      height={height}
      onError={() => setImageFailed(true)}
      className={cn('block max-w-full object-contain', className)}
    />
  );
}
