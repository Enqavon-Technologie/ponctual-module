import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './i18n/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InterviewRoom } from './components/InterviewRoom';

// Standalone video-interview room: /interview/:channel is opened by the family
// and the babysitter (no account needed), so it renders on its own — outside the
// main app shell, header and routing.
const interviewMatch = window.location.pathname.match(/^\/interview\/([^/]+)/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        {interviewMatch
          ? <InterviewRoom channel={decodeURIComponent(interviewMatch[1])} />
          : <App />}
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
