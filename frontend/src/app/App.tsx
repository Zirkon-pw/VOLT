import { ThemeProvider } from './providers/ThemeProvider';
import { AppRouter } from './routes/AppRouter';
import './styles/globals.scss';

function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
