/** Ids da aba e do painel, para o painel apontar para a aba (`aria-labelledby`). */
export function tabIds(prefix: string, key: string) {
  return { tab: `${prefix}-tab-${key}`, panel: `${prefix}-panel-${key}` };
}
