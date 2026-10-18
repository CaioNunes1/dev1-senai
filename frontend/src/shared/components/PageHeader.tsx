import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
};

/** Cabeçalho das telas de lista (frame PageHeader de J01, C01, L01 e L05). */
export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-4">
      <div
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary-soft text-primary"
      >
        <Icon className="size-5.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-heading-page text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
