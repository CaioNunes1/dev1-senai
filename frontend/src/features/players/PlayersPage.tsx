import { Users } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { PageHeader } from '../../shared/components/PageHeader';

/** Tela de jogadores (Figma J01). Tabela, filtros e ações entram nas Etapas 5.2 e 5.3. */
export function PlayersPage() {
  return (
    <>
      <PageHeader
        icon={Users}
        title="Jogadores"
        description="Cadastre jogadores, acompanhe os indicadores e compre os que estão livres."
      />
      <Card className="p-6 text-muted-foreground">
        A lista de jogadores será implementada na Etapa 5.2.
      </Card>
    </>
  );
}
