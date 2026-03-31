'use client';

import React from 'react';
import clsx from 'clsx';

type SkeletonVariant = 'text' | 'circle' | 'rect';

interface SkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  circle: 'h-10 w-10 rounded-full',
  rect: 'h-24 w-full rounded-lg',
};

export default function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'skeleton bg-slate-200',
        variantStyles[variant],
        className
      )}
    />
  );
}
