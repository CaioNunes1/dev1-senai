import type { ComponentProps } from 'react';
import { cx } from '../lib/cx';
import { buttonClasses, type ButtonStyle } from './button-styles';

type ButtonProps = ComponentProps<'button'> & ButtonStyle;

export function Button({ variant, size, type = 'button', className, ...props }: ButtonProps) {
  return (
    <button type={type} className={cx(buttonClasses({ variant, size }), className)} {...props} />
  );
}
