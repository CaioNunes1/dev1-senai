import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { cx } from '../../shared/lib/cx';
import { POSITIONS } from './api';
import { POSITION_LABELS } from './player-labels';

type PositionPickerProps = {
  registration: UseFormRegisterReturn<'position'>;
  error?: string;
  /** Jogador com clube não muda de posição (RN08): só a atual fica habilitada. */
  lockedTo?: string;
  note?: string;
};

/** Posição em cartões de escolha única (Figma J05/J09), com rádios nativos para o teclado. */
export function PositionPicker({ registration, error, lockedTo, note }: PositionPickerProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const noteId = `${id}-note`;
  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={[error ? errorId : '', note ? noteId : ''].join(' ').trim() || undefined}
    >
      <legend className="mb-1.5 text-sm font-medium">Posição</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {POSITIONS.map((position) => {
          const disabled = lockedTo !== undefined && position !== lockedTo;
          return (
            <label
              key={position}
              className={cx(
                'flex cursor-pointer flex-col items-center rounded-lg border border-border bg-background px-2 py-2 text-center shadow-xs',
                'has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary-soft-foreground',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                disabled && 'cursor-not-allowed opacity-50',
                error && 'border-destructive',
              )}
            >
              <input
                type="radio"
                value={position}
                disabled={disabled}
                className="sr-only"
                {...registration}
              />
              <span className="text-sm font-semibold">{position}</span>
              <span className="text-xs text-muted-foreground">{POSITION_LABELS[position]}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {note && (
        <p id={noteId} className="text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </fieldset>
  );
}
