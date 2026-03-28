import { useEffect } from 'react';
import { ThemeProvider } from './providers/ThemeProvider';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { AppRouter } from './routes/AppRouter';
import { ToastController } from '@uikit/toast';
import './styles/globals.scss';

function App() {
  useEffect(() => {
    // Prevent browser from navigating to dropped files.
    // Only prevent if the event wasn't already handled by a child (e.g. editor panel).
    const prevent = (e: DragEvent) => {
      if (!e.defaultPrevented) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

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
