import { BrowserRouter as Router } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MeetingProvider } from './contexts/MeetingContext';

// Components
import ErrorBoundary from './components/common/ErrorBoundary';

// Routes
import AppRoutes from './routes';

// Constants
import { GOOGLE_CLIENT_ID } from './utils/constants';

// Styles
import './styles/globals.css';

function App() {
  console.log('[App] Google Client ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET');

  if (!GOOGLE_CLIENT_ID) {
    console.error('[App] GOOGLE_CLIENT_ID is not set! Check your .env file');
  }

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
          <HeroUIProvider>
            <AuthProvider>
              <MeetingProvider>
                <Router>
                  <AppRoutes />
                </Router>
              </MeetingProvider>
            </AuthProvider>
          </HeroUIProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;