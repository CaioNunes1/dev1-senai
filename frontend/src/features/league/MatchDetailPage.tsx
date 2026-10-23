import { ArrowLeft, CircleDot, LoaderCircle, RefreshCw, SearchX, ServerOff } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ROUTES } from '../../app/layout/navigation';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { buttonClasses } from '../../shared/components/button-styles';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { useApiQuery } from '../../shared/hooks/use-api-query';
import { formatBrasiliaDateTime } from '../../shared/lib/format';
import { ClubMonogram } from '../clubs/ClubMonogram';
import { useClubList } from '../clubs/clubs-context';
import { getMatch, type Duel, type DuelPlayer, type Match, type MatchSide } from './api';
import { ATTRIBUTE_LABELS, RESULT_LABELS } from './match-labels';

/**
 * Partida com os 6 duelos (Figma L03, RN20/RN21): placar, formações e cada duelo como a API
 * gravou (atacante, defensor, atributos, valores já com a condição e gol). Nada é recalculado.
 */
export function MatchDetailPage() {
  const { matchId = '' } = useParams();
  const match = useApiQuery(`match:${matchId}`, (signal) => getMatch(Number(matchId) || 0, signal));

  if (match.error) {
    return (
      <Card>
        <EmptyState
          role="alert"
          icon={match.error.status === 404 ? SearchX : ServerOff}
          title={
            match.error.status === 404
              ? 'Partida não encontrada'
              : 'Não foi possível carregar a partida'
          }
          description={match.error.message}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {match.error.status !== 404 && (
                <Button variant="outline" onClick={match.retry}>
                  <RefreshCw aria-hidden="true" />
                  Tentar de novo
                </Button>
              )}
              <BackToMatches />
            </div>
          }
        />
      </Card>
    );
  }
  if (match.data === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Carregando partida…
      </p>
    );
  }
  return <MatchContent match={match.data} />;
}

function MatchContent({ match }: { match: Match }) {
  const clubs = useClubList();
  const acronymOf = (clubId: number) => clubs.data?.find((club) => club.id === clubId)?.acronym;
  const { date, time } = formatBrasiliaDateTime(match.played_at);
  const sides = [
    {
      side: match.home,
      role: 'mandante',
      duels: match.duels.filter((duel) => duel.attacking_club_id === match.home.club_id),
    },
    {
      side: match.away,
      role: 'visitante',
      duels: match.duels.filter((duel) => duel.attacking_club_id === match.away.club_id),
    },
  ];

  return (
    <>
      <div>
        <BackToMatches />
      </div>
      <h1 className="sr-only">
        {match.home.club_name} {match.home.goals} × {match.away.goals} {match.away.club_name}
      </h1>
      <Card className="flex flex-wrap items-center justify-center gap-4 p-5 sm:gap-8">
        <ScoreSide side={match.home} role="Mandante" acronym={acronymOf(match.home.club_id)} />
        <div className="flex flex-col items-center gap-1">
          <span aria-label="Placar" className="rounded-lg bg-muted px-4 py-1 text-heading-page">
            {match.home.goals} × {match.away.goals}
          </span>
          <time dateTime={match.played_at} className="text-xs text-muted-foreground">
            {date}, {time}
          </time>
          <Badge variant="outline">{RESULT_LABELS[match.result]}</Badge>
        </div>
        <ScoreSide
          side={match.away}
          role="Visitante"
          acronym={acronymOf(match.away.club_id)}
          reverse
        />
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <h2 className="text-heading-card">Duelos</h2>
          <p className="text-muted-foreground">
            Os 3 ataques do mandante e depois os 3 do visitante. Valores gravados pela API no
            momento da partida, já com o efeito da condição.
          </p>
        </div>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <caption className="sr-only">Duelos da partida</caption>
            <thead className="border-b border-border bg-muted-subtle">
              <tr>
                {['Duelo', 'Atacante', 'Ataque', 'Defensor', 'Defesa', 'Resultado'].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="h-10 px-2 text-left font-medium whitespace-nowrap text-muted-foreground first:pl-4 last:pr-4"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            {sides.map(({ side, role, duels }) => (
              <tbody key={side.club_id}>
                <tr className="border-b border-border bg-muted-subtle">
                  <th
                    scope="rowgroup"
                    colSpan={5}
                    className="px-4 py-2 text-left text-xs font-medium"
                  >
                    Ataques do {side.club_name} ({role})
                  </th>
                  <td className="px-2 pr-4 text-right text-xs text-muted-foreground">
                    {side.goals} {side.goals === 1 ? 'gol' : 'gols'}
                  </td>
                </tr>
                {duels.map((duel) => (
                  <DuelRow key={duel.order} duel={duel} />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
    </>
  );
}

function DuelRow({ duel }: { duel: Duel }) {
  return (
    <tr className="h-14 border-b border-border last:border-0">
      <td className="px-2 pl-4">
        <span className="rounded-sm bg-muted px-1.5 text-xs font-medium">{duel.order}</span>
      </td>
      <td className="px-2">
        <PlayerCell player={duel.attacker} />
      </td>
      <td className="px-2 whitespace-nowrap">
        <AttributeValue player={duel.attacker} />
      </td>
      <td className="px-2">
        <PlayerCell player={duel.defender} />
      </td>
      <td className="px-2 whitespace-nowrap">
        <AttributeValue player={duel.defender} />
      </td>
      <td className="px-2 pr-4">
        {duel.goal ? (
          <Badge variant="success">
            <CircleDot aria-hidden="true" className="size-3" />
            Gol
          </Badge>
        ) : (
          <Badge variant="outline">Sem gol</Badge>
        )}
      </td>
    </tr>
  );
}

function PlayerCell({ player }: { player: DuelPlayer }) {
  return (
    <span className="flex flex-col">
      <span className="font-medium">{player.player_name}</span>
      <span className="text-xs text-muted-foreground">
        {player.position}
        {player.condition === 'MAL_CONDICIONADO' && ' · mal condicionado'}
      </span>
    </span>
  );
}

function AttributeValue({ player }: { player: DuelPlayer }) {
  return (
    <span className="text-muted-foreground">
      {ATTRIBUTE_LABELS[player.attribute] ?? player.attribute}{' '}
      <span className="font-semibold text-foreground">{player.value}</span>
    </span>
  );
}

type ScoreSideProps = {
  side: MatchSide;
  role: string;
  acronym: string | undefined;
  reverse?: boolean;
};

function ScoreSide({ side, role, acronym, reverse = false }: ScoreSideProps) {
  return (
    <div
      className={reverse ? 'flex items-center gap-3' : 'flex flex-row-reverse items-center gap-3'}
    >
      {acronym && <ClubMonogram acronym={acronym} />}
      <div className={reverse ? 'flex flex-col' : 'flex flex-col items-end'}>
        <span className="text-heading-card">{side.club_name}</span>
        <span className="text-xs text-muted-foreground">
          {role} · {side.formation}
        </span>
      </div>
    </div>
  );
}

function BackToMatches() {
  return (
    <Link to={ROUTES.matches} className={buttonClasses({ variant: 'ghost' })}>
      <ArrowLeft aria-hidden="true" />
      Voltar para partidas
    </Link>
  );
}
