import { afterEach, describe, expect, it } from 'vitest';
import { mockDownloads } from '../../test/download-mock';
import { saveFile } from './download';

let downloads: ReturnType<typeof mockDownloads>;

afterEach(() => {
  downloads.restore();
});

describe('saveFile', () => {
  it('baixa o próprio Blob com o nome dado, remove o link e libera a URL', async () => {
    downloads = mockDownloads();
    const file = new Blob(['data_hora;tipo\n'], { type: 'text/csv' });

    saveFile(file, 'historico-clube-1.csv');

    expect(downloads.saved).toEqual([{ name: 'historico-clube-1.csv', file }]);
    expect(document.querySelector('a[download]')).toBeNull();
    await expect.poll(() => downloads.revoked).toEqual(['blob:teste/1']);
  });
});
