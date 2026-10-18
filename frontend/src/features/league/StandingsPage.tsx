import { ListOrdered } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { PageHeader } from '../../shared/components/PageHeader';

/** Tela de classificação (Figma L05). Depende dos endpoints da liga, ainda não implementados. */
export function StandingsPage() {
  return (
    <>
      <PageHeader
        icon={ListOrdered}
        title="Classificação"
        description="Todos os clubes, com 3 pontos por vitória e 1 por empate."
      />
      <Card className="p-6 text-muted-foreground">
        A classificação será implementada depois dos endpoints da liga.
      </Card>
    </>
  );
}
