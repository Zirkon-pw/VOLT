import { ThemeProvider } from './providers/ThemeProvider';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { AppRouter } from './routes/AppRouter';
import { ToastController } from '@uikit/toast';
import './styles/globals.scss';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppRouter />
        <ToastController />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
