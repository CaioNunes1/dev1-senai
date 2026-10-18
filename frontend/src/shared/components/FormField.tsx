import { CircleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/** Atributos que o campo precisa receber para ficar ligado ao rótulo, à dica e ao erro. */
type FieldControlProps = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
};

type FormFieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Campo de formulário (F2 › Formulários): rótulo visível, controle, dica e mensagem de erro
 * junto ao campo, ligados por `id`, `aria-describedby` e `aria-invalid`.
 */
export function FormField({ label, hint, error, required = false, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': describedBy || undefined,
        'aria-required': required || undefined,
      })}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-xs text-destructive">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
