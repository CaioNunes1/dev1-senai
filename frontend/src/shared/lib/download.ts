/**
 * Entrega um arquivo recebido da API ao navegador, sem alterar o conteúdo: um link temporário
 * com `download` é clicado e removido, e a URL do `Blob` é liberada logo depois.
 */
export function saveFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
