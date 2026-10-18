import { Swords } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { PageHeader } from '../../shared/components/PageHeader';

/** Tela de partidas (Figma L01–L04). Depende dos endpoints da liga, ainda não implementados. */
export function MatchesPage() {
  return (
    <>
      <PageHeader
        icon={Swords}
        title="Partidas"
        description="Jogue partidas entre clubes com os 5 titulares escalados e acompanhe o histórico."
      />
      <Card className="p-6 text-muted-foreground">
        As partidas serão implementadas depois dos endpoints da liga.
      </Card>
    </>
  );
}
