'use client';

import React from 'react';
import clsx from 'clsx';
import { getInitials } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const dotSizeStyles: Record<AvatarSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

export default function Avatar({
  src,
  name,
  size = 'md',
  online,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const safeName = typeof name === 'string' && name.trim().length > 0 ? name : 'User';

  const showFallback = !src || imgError;

  return (
    <div className={clsx('relative inline-flex shrink-0', className)}>
      {showFallback ? (
        <div
          className={clsx(
            'inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium',
            sizeStyles[size]
          )}
        >
          {getInitials(safeName)}
        </div>
      ) : (
        <img
          src={src}
          alt={safeName}
          onError={() => setImgError(true)}
          className={clsx(
            'rounded-full object-cover',
            sizeStyles[size]
          )}
        />
      )}

      {online !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            online ? 'bg-emerald-500' : 'bg-slate-300',
            dotSizeStyles[size]
          )}
        />
      )}
    </div>
  );
}
