import { cx } from '../../shared/lib/cx';

/** Cores decorativas dos avatares do Figma; a escolha pelo id só mantém a cor estável por jogador. */
const AVATAR_CLASSES = [
  'bg-avatar-zinc text-avatar-zinc-foreground',
  'bg-avatar-pink text-avatar-pink-foreground',
  'bg-avatar-cyan text-avatar-cyan-foreground',
  'bg-avatar-teal text-avatar-teal-foreground',
  'bg-avatar-violet text-avatar-violet-foreground',
];

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase('pt-BR');
}

/** Avatar com as iniciais do jogador (Figma: Avatar, nó 6:907). Decorativo. */
export function PlayerAvatar({ id, name }: { id: number; name: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
        AVATAR_CLASSES[id % AVATAR_CLASSES.length],
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
