import { Check, LoaderCircle, RefreshCw, ServerOff, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../shared/components/Alert';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import { Select } from '../../shared/components/Select';
import { useDataRefresh } from '../../shared/hooks/data-refresh';
import type { ApiQuery } from '../../shared/hooks/use-api-query';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { useToast } from '../../shared/hooks/toast';
import { cx } from '../../shared/lib/cx';
import type { ClubDetail, SquadPlayer } from '../clubs/api';
import { ConditionBadge } from '../players/ConditionBadge';
import type { Position } from '../players/api';
import { FORMATIONS, saveLineup, type Formation, type Lineup, type LineupBody } from './api';
import {
  candidatesFor,
  describeFormation,
  fillSlots,
  selectedIds,
  slotsFor,
  type Selection,
} from './lineup-slots';

/** Atributos que a partida usa, por posição (RN20 › 5); só exibidos, nunca recalculados. */
const USED_ATTRIBUTES: Record<Position, [string, keyof SquadPlayer][]> = {
  GOL: [['Defesa', 'defending']],
  ZAG: [
    ['Drible', 'dribbling'],
    ['Defesa', 'defending'],
  ],
  LAT: [
    ['Drible', 'dribbling'],
    ['Defesa', 'defending'],
  ],
  MEI: [['Passe', 'passing']],
  ATA: [['Finalização', 'shooting']],
};

type LineupPanelProps = { club: ClubDetail; lineup: ApiQuery<Lineup> };

/**
 * Aba Escalação (Figma C06–C11, RN19): formação, um titular por vaga entre os jogadores do
 * elenco (sem DOENTE e sem repetir) e salvar. O estado mostrado (completa, incompleta, sem
 * escalação) é o devolvido pela API.
 */
export function LineupPanel({ club, lineup }: LineupPanelProps) {
  if (lineup.error) {
    return (
      <Card>
        <EmptyState
          role="alert"
          icon={ServerOff}
          title="Não foi possível carregar a escalação"
          description={lineup.error.message}
          action={
            <Button variant="outline" onClick={lineup.retry}>
              <RefreshCw aria-hidden="true" />
              Tentar de novo
            </Button>
          }
        />
      </Card>
    );
  }
  if (lineup.data === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Carregando escalação…
      </p>
    );
  }
  const saved = lineup.data;
  const formKey = `${saved.formation}:${saved.players.map((player) => player.id).join(',')}`;
  return <LineupForm key={formKey} club={club} saved={saved} />;
}

function LineupForm({ club, saved }: { club: ClubDetail; saved: Lineup }) {
  const { refreshAll } = useDataRefresh();
  const showToast = useToast();
  const [formation, setFormation] = useState<Formation | undefined>(saved.formation ?? undefined);
  const [selection, setSelection] = useState<Selection>(() =>
    saved.formation ? fillSlots(saved.formation, saved.players).selection : {},
  );
  const [leftOut, setLeftOut] = useState<string[]>([]);
  const [incompleteForm, setIncompleteForm] = useState(false);
  const [lastSaved, setLastSaved] = useState(() =>
    saved.complete && saved.formation
      ? lineupKey(
          saved.formation,
          saved.players.map((player) => player.id),
        )
      : undefined,
  );
  const squadById = new Map(club.players.map((player) => [player.id, player]));

  const save = useApiAction((body: LineupBody) => saveLineup(club.id, body), {
    onSuccess: (result) => {
      if (result.formation) {
        setLastSaved(
          lineupKey(
            result.formation,
            result.players.map((player) => player.id),
          ),
        );
      }
      showToast({
        variant: 'success',
        title: 'Escalação salva',
        description: `${club.name} no ${result.formation}${result.complete ? ', pronto para jogar.' : '.'}`,
      });
      refreshAll();
    },
  });

  function changeFormation(next: Formation) {
    const current = formation
      ? slotsFor(formation)
          .map((slot) => squadById.get(selection[slot.key] ?? -1))
          .filter((player) => player !== undefined)
      : [];
    const filled = fillSlots(next, current);
    setFormation(next);
    setSelection(filled.selection);
    setLeftOut(filled.left.map((id) => squadById.get(id)?.name ?? `id ${id}`));
    setIncompleteForm(false);
    save.clearError();
  }

  function submit() {
    const ids = formation && selectedIds(formation, selection);
    if (!formation || !ids) {
      setIncompleteForm(true);
      return;
    }
    setIncompleteForm(false);
    void save.run({ formation, player_ids: ids });
  }

  const slots = formation ? slotsFor(formation) : [];
  const starters = slots
    .map((slot) => squadById.get(selection[slot.key] ?? -1))
    .filter((player) => player !== undefined);
  const currentIds = formation && selectedIds(formation, selection);
  const unchanged =
    formation !== undefined &&
    currentIds !== undefined &&
    lineupKey(formation, currentIds) === lastSaved;
  const unwell = starters.filter((player) => player.condition === 'MAL_CONDICIONADO');

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-heading-card">Titulares</h2>
          <p className="text-muted-foreground">
            1 goleiro e 4 jogadores de linha, na formação escolhida. Salvar troca os 5 de uma vez.
          </p>
        </div>
        <LineupStatus saved={saved} />
      </div>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <SavedLineupNotice club={club} saved={saved} />
        <fieldset className="flex flex-col gap-2">
          <legend className="font-medium">Formação</legend>
          <p className="text-xs text-muted-foreground">
            Os números contam os jogadores de linha de trás para frente. O goleiro fica fora da
            conta.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {FORMATIONS.map((option) => (
              <label
                key={option}
                className={cx(
                  'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm',
                  'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  option === formation
                    ? 'border-primary bg-primary-soft'
                    : 'border-border bg-background',
                )}
              >
                <input
                  type="radio"
                  name={`formation-${club.id}`}
                  value={option}
                  checked={option === formation}
                  onChange={() => changeFormation(option)}
                  className="mt-0.5 size-4 accent-primary outline-none"
                />
                <span className="flex flex-col">
                  <span className="font-semibold">{option}</span>
                  <span className="text-xs text-muted-foreground">{describeFormation(option)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {leftOut.length > 0 && (
          <Alert variant="info" title="Revise as vagas">
            {leftOut.join(', ')} não cabe na formação {formation} e saiu das vagas.
          </Alert>
        )}
      </div>
      {formation && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <caption className="sr-only">Vagas da formação {formation}</caption>
            <thead className="border-b border-border bg-muted-subtle">
              <tr>
                {['Vaga', 'Titular', 'Condição', 'Overall', 'Atributos usados'].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={cx(
                      'h-10 px-2 font-medium whitespace-nowrap text-muted-foreground first:pl-4 last:pr-4',
                      header === 'Overall' ? 'text-right' : 'text-left',
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const player = squadById.get(selection[slot.key] ?? -1);
                const options = candidatesFor(slot, club.players, selection);
                return (
                  <tr key={slot.key} className="h-14 border-b border-border last:border-0">
                    <th scope="row" className="px-2 pl-4 text-left font-normal">
                      <span className="flex flex-col">
                        <span className="font-medium">{slot.label}</span>
                        <span className="text-xs text-muted-foreground">{slot.hint}</span>
                      </span>
                    </th>
                    <td className="w-64 px-2">
                      <Select
                        aria-label={`Titular: ${slot.label} (${slot.hint})`}
                        value={player?.id ?? ''}
                        disabled={options.length === 0}
                        onChange={(event) => {
                          const id =
                            event.target.value === '' ? undefined : Number(event.target.value);
                          setSelection((current) => ({ ...current, [slot.key]: id }));
                          setIncompleteForm(false);
                          save.clearError();
                        }}
                      >
                        <option value="">
                          {options.length === 0
                            ? `Sem ${slot.hint} disponível`
                            : 'Escolha o titular'}
                        </option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} ({option.position})
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2">
                      {player && <ConditionBadge condition={player.condition} />}
                    </td>
                    <td className="px-2 text-right font-semibold">{player?.overall}</td>
                    <td className="px-2 pr-4 whitespace-nowrap text-muted-foreground">
                      {player &&
                        USED_ATTRIBUTES[player.position].map(([label, key]) => (
                          <span key={label} className="mr-3">
                            {label}{' '}
                            <span className="font-medium text-foreground">
                              {player[key] as number}
                            </span>
                          </span>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        {unwell.length > 0 && (
          <Alert
            variant="warning"
            title={`${unwell.map((player) => player.name).join(' e ')} ${unwell.length > 1 ? 'estão mal condicionados' : 'está mal condicionado'}`}
          >
            Pode jogar, mas cada atributo vale 15% a menos durante a partida (calculado pela API).
          </Alert>
        )}
        {incompleteForm && (
          <Alert variant="destructive" title="Escalação incompleta">
            {formation
              ? 'Escolha um titular para cada vaga antes de salvar.'
              : 'Escolha a formação e um titular para cada vaga antes de salvar.'}
          </Alert>
        )}
        {save.error && (
          <Alert variant="destructive" title="Escalação recusada">
            {save.error.message}
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs text-muted-foreground">
            A escalação vale até ser trocada. Titular vendido ou que fica doente sai dela, e o clube
            só volta a jogar depois de escalar de novo.
          </p>
          <Button
            onClick={submit}
            disabled={save.isPending || unchanged}
            title={unchanged ? 'Nada mudou desde a última escalação salva.' : undefined}
            aria-busy={save.isPending}
          >
            {save.isPending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {save.isPending ? 'Salvando…' : 'Salvar escalação'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Formação + ids (em qualquer ordem): para saber se há algo novo a salvar. */
function lineupKey(formation: Formation, ids: readonly number[]): string {
  return `${formation}:${[...ids].sort((a, b) => a - b).join(',')}`;
}

function LineupStatus({ saved }: { saved: Lineup }) {
  if (saved.complete) {
    return (
      <Badge variant="success">
        <Check aria-hidden="true" className="size-3" />
        Completa
      </Badge>
    );
  }
  return (
    <Badge variant={saved.formation === null ? 'secondary' : 'warning'}>
      {saved.formation !== null && <TriangleAlert aria-hidden="true" className="size-3" />}
      {saved.formation === null ? 'Sem escalação' : 'Incompleta'}
    </Badge>
  );
}

/** Situação gravada na API: sem escalação ou incompleta → o clube não pode jogar (RN19, RN20). */
function SavedLineupNotice({ club, saved }: { club: ClubDetail; saved: Lineup }) {
  if (saved.complete) {
    return undefined;
  }
  if (saved.formation === null) {
    return (
      <Alert variant="info" title={`O ${club.name} ainda não tem escalação`}>
        Sem escalação, o clube não pode jogar partidas. Escolha a formação e os 5 titulares.
      </Alert>
    );
  }
  const names = saved.players.map((player) => player.name).join(', ');
  return (
    <Alert variant="warning" title={`Escalação incompleta: o ${club.name} não pode jogar partidas`}>
      A formação {saved.formation} continua salva, com {saved.players.length}{' '}
      {saved.players.length === 1 ? 'titular' : 'titulares'}
      {names ? ` (${names})` : ''}. Um titular foi vendido ou ficou doente; escale de novo antes de
      jogar.
    </Alert>
  );
}
