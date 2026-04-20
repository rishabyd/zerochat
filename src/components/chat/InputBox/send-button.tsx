import { Button } from '@/components/ui/button';
import React from 'react';

export default function SendButton({
  className,
  children,
  props,
}: {
  className?: string;
  children: React.ReactNode;
  props: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <Button variant={'outline'} {...props} className={`  ${className}`}>
      {children}
    </Button>
  );
}
