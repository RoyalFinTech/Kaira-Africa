import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface KairaLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function KairaLogo({ className, width = 180, height }: KairaLogoProps) {
  return (
    <img
      src={BRAND.logoUrl}
      alt={BRAND.name}
      width={width}
      height={height}
      className={cn('object-contain', className)}
    />
  );
}
