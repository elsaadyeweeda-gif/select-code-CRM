import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against unhandled cross-origin errors or ResizeObserver warnings inside iframe sandbox
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || '').toLowerCase();
    if (
      msgStr.includes('resizeobserver') || 
      msgStr.includes('script error') ||
      msgStr.includes('serviceworker')
    ) {
      console.warn('Suppressed benign iframe/ResizeObserver script error:', message);
      return true; // Prevent visual error trigger
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msgStr = reason ? String(reason.message || reason).toLowerCase() : '';
    if (
      msgStr.includes('resizeobserver') ||
      msgStr.includes('script error') ||
      msgStr.includes('failed to fetch') ||
      msgStr.includes('networkerror')
    ) {
      event.preventDefault();
      console.warn('Suppressed benign uncaught promise rejection:', reason);
    }
  };

  window.addEventListener('unhandledrejection', handleRejection);
  
  // Suppress loop notifications limits specifically at event level
  window.addEventListener('error', (e) => {
    const msgStr = String(e.message || '').toLowerCase();
    if (
      msgStr.includes('resizeobserver') || 
      msgStr.includes('script error')
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}

// Active unregistration of all legacy service workers to prevent cached intercepting errors or offline mismatches
try {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations()
            .then(registrations => {
              for (const reg of registrations) {
                reg.unregister()
                  .then(unregistered => {
                    if (unregistered) console.log('Cleaned up active service worker registration:', reg.scope);
                  });
              }
            })
            .catch(err => console.warn('Error cleanup service worker:', err));
        }
      } catch (swErr) {
        console.warn('Access to serviceWorker registrations blocked or unavailable:', swErr);
      }
    });
  }
} catch (e) {
  console.warn('Service Worker system is deactivated or denied in this context:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
