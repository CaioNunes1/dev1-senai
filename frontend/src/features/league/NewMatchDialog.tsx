import { Swords } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { FormField } from '../../shared/components/FormField';
import { Select } from '../../shared/components/Select';
import { useApiAction } from '../../shared/hooks/use-api-action';
import { useClubList } from '../clubs/clubs-context';
import { playMatch, type Match } from './api';

type NewMatchDialogProps = {
  onClose: () => void;
  onPlayed: (match: Match) => void;
};

type Errors = { home?: string; away?: string };

/**
 * Nova partida (Figma L02/L04; `POST /matches`): escolher mandante e visitante e jogar. A
 * tela só confere os campos (os dois escolhidos e diferentes); escalação incompleta é
 * recusada pela API (409) e o `message` aparece aqui. O placar e os duelos vêm da resposta.
 */
export function NewMatchDialog({ onClose, onPlayed }: NewMatchDialogProps) {
  const clubs = useClubList();
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const play = useApiAction(playMatch, { onSuccess: onPlayed });

  function submit() {
    const next: Errors = {
      home: home === '' ? 'Escolha o mandante.' : undefined,
      away:
        away === ''
          ? 'Escolha o visitante.'
          : away === home
            ? 'O visitante precisa ser diferente do mandante.'
            : undefined,
    };
    setErrors(next);
    if (next.home || next.away) {
      return;
    }
    void play.run({ home_club_id: Number(home), away_club_id: Number(away) });
  }

  const options = (clubs.data ?? []).map((club) => (
    <option key={club.id} value={club.id}>
      {club.name} ({club.acronym})
    </option>
  ));

  return (
    <Dialog
      size="sm"
      title="Nova partida"
      description="Os dois clubes jogam com os 5 titulares escalados. O placar sai de 6 duelos, sem sorteio, calculados pela API."
      onClose={onClose}
      closeDisabled={play.isPending}
      notice={
        play.error && (
          <Alert variant="destructive" title="Partida recusada">
            {play.error.message}
          </Alert>
        )
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={play.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={play.isPending} aria-busy={play.isPending}>
            <Swords aria-hidden="true" />
            {play.isPending ? 'Jogando…' : 'Jogar partida'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Mandante" error={errors.home}>
          {(field) => (
            <Select
              {...field}
              data-autofocus
              value={home}
              onChange={(event) => {
                setHome(event.target.value);
                play.clearError();
              }}
            >
              <option value="">Escolha o clube</option>
              {options}
            </Select>
          )}
        </FormField>
        <FormField label="Visitante" error={errors.away}>
          {(field) => (
            <Select
              {...field}
              value={away}
              onChange={(event) => {
                setAway(event.target.value);
                play.clearError();
              }}
            >
              <option value="">Escolha o clube</option>
              {options}
            </Select>
          )}
        </FormField>
      </div>
    </Dialog>
  );
}
