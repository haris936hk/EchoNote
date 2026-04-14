import { BrowserRouter as Router } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import PropTypes from 'prop-types';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MeetingProvider } from './contexts/MeetingContext';

import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastContainer, useToast } from './components/common/Toast';
import NotificationPromptBanner from './components/common/NotificationPromptBanner';

import AppRoutes from './routes';

import { GOOGLE_CLIENT_ID } from './utils/constants';

import './styles/globals.css';

const ToastWrapper = ({ children }) => {
  const { toasts, removeToast } = useToast();
  return (
    <>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

ToastWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
          <HeroUIProvider>
            <AuthProvider>
              <MeetingProvider>
                <Router>
                  <ToastWrapper>
                    <NotificationPromptBanner />
                    <AppRoutes />
                  </ToastWrapper>
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
