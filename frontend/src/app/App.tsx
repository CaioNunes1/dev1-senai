import { BrowserRouter } from 'react-router';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
