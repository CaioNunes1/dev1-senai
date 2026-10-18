import { BrowserRouter } from 'react-router';
import { DataRefreshProvider } from '../shared/hooks/DataRefreshProvider';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <DataRefreshProvider>
        <AppRoutes />
      </DataRefreshProvider>
    </BrowserRouter>
  );
}
