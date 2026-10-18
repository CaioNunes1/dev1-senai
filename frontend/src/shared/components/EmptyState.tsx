import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  role?: 'alert';
};

/** Bloco centralizado para lista vazia, sem resultados e erro (Figma E02, E03 e E04). */
export function EmptyState({ icon: Icon, title, description, action, role }: EmptyStateProps) {
  return (
    <div role={role} className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div aria-hidden="true" className="rounded-xl bg-muted p-3 text-foreground">
        <Icon className="size-6" />
      </div>
      <p className="text-heading-card text-foreground">{title}</p>
      <p className="max-w-md text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
