import { ArrowLeft, LoaderCircle, RefreshCw, SearchX, ServerOff, Shirt } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ROUTES } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { buttonClasses } from '../../shared/components/button-styles';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { ClubMonogram } from './ClubMonogram';
import { ClubSummaryCards } from './ClubSummaryCards';
import { MAX_SQUAD_SIZE } from './club-labels';
import { SquadTable } from './SquadTable';
import { useClub } from './use-clubs';

/**
 * Página do clube (Figma C04/C05 e E04): `GET /clubs/{id}` com o resumo financeiro e o
 * elenco, tudo como a API devolve. Funciona por clique na lista, no menu ou pela URL direta.
 */
export function ClubDetailPage() {
  const { clubId = '' } = useParams();
  const club = useClub(clubId);
  const { data, error } = club;

  if (error?.status === 404) {
    return (
      <Card>
        <EmptyState
          role="alert"
          icon={SearchX}
          title="Clube não encontrado"
          description={`${error.message} O endereço pode estar errado ou o clube não existe.`}
          action={<BackToClubs />}
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <EmptyState
          role="alert"
          icon={ServerOff}
          title="Não foi possível carregar o clube"
          description={error.message}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={club.retry}>
                <RefreshCw aria-hidden="true" />
                Tentar de novo
              </Button>
              <BackToClubs />
            </div>
          }
        />
      </Card>
    );
  }

  if (data === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Carregando clube…
      </p>
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <ClubMonogram acronym={data.acronym} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-heading-page wrap-break-word text-foreground">{data.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Sigla {data.acronym}</Badge>
            <Badge variant="outline">
              <Shirt aria-hidden="true" className="size-3" />
              {data.players.length} de {MAX_SQUAD_SIZE} jogadores
            </Badge>
          </div>
        </div>
      </header>
      <ClubSummaryCards club={data} />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-heading-card">
            Elenco
            <Badge variant="secondary">{data.players.length}</Badge>
          </h2>
          <p className="text-muted-foreground">
            Ordem por posição (GOL, ZAG, LAT, MEI, ATA), depois pelo nome, como a API devolve.
          </p>
        </div>
        <SquadTable club={club} />
      </Card>
      <p className="text-xs text-muted-foreground">
        Valores em moedas. Valor de mercado, dias restantes e % de multa são calculados pela API no
        momento da consulta; datas no horário de Brasília.
      </p>
    </>
  );
}

function BackToClubs() {
  return (
    <Link to={ROUTES.clubs} className={buttonClasses({ variant: 'outline' })}>
      <ArrowLeft aria-hidden="true" />
      Voltar para clubes
    </Link>
  );
}
