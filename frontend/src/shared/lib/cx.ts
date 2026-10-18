/** Junta classes CSS, ignorando valores falsos (classes condicionais). */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
