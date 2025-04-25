import React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  children?: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, children, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';