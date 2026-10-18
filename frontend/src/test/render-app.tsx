import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '../app/AppProviders';
import { AppRoutes } from '../app/AppRoutes';

/** Renderiza a aplicação inteira numa rota, com os mesmos providers do `App`. */
export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}
