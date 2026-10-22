import { vi } from 'vitest';

type SavedFile = { name: string; file: Blob };

/**
 * Downloads falsos: o jsdom não tem `URL.createObjectURL` nem baixa arquivos. Cada clique num
 * link com `download` é registrado com o nome e o próprio `Blob`; `restore` desfaz tudo.
 */
export function mockDownloads() {
  const saved: SavedFile[] = [];
  const revoked: string[] = [];
  const blobs = new Map<string, Blob>();
  let next = 0;

  Object.assign(URL, {
    createObjectURL: (file: Blob) => {
      next += 1;
      const url = `blob:teste/${next}`;
      blobs.set(url, file);
      return url;
    },
    revokeObjectURL: (url: string) => {
      revoked.push(url);
    },
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const file = blobs.get(this.href);
    if (this.download !== '' && file) {
      saved.push({ name: this.download, file });
    }
  });

  return {
    saved,
    revoked,
    restore() {
      click.mockRestore();
      Reflect.deleteProperty(URL, 'createObjectURL');
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    },
  };
}
