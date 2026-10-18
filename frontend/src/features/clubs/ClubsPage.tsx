import { Shield } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { PageHeader } from '../../shared/components/PageHeader';

/** Tela de clubes (Figma C01). Tabela, ordenação e cadastro entram na Etapa 5.4. */
export function ClubsPage() {
  return (
    <>
      <PageHeader
        icon={Shield}
        title="Clubes"
        description="Cada clube começa com 300,00 em caixa e sem jogadores. A liga aceita no máximo 20 clubes."
      />
      <Card className="p-6 text-muted-foreground">
        A lista de clubes será implementada na Etapa 5.4.
      </Card>
    </>
  );
}
