import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against browser iframe transient IndexedDB 'Database is closing/hidden' events
if (typeof window !== 'undefined') {
  const isTransientDbClosing = (err: any): boolean => {
    if (!err) return false;
    const msg = (typeof err === 'string' ? err : err.message || err.name || err.toString?.() || '').toLowerCase();
    const reason = (err.reason && (typeof err.reason === 'string' ? err.reason : err.reason?.message || err.reason?.name || err.reason?.toString?.() || ''))?.toLowerCase() || '';
    const stack = (err.stack || '')?.toLowerCase?.() || '';
    
    return (
      msg.includes('database is closing') ||
      msg.includes('database is hidden') ||
      msg.includes('closing/hidden') ||
      msg.includes('connection is closing') ||
      msg.includes('idbdatabase') ||
      msg.includes('indexeddb') ||
      msg.includes('the database connection is closing') ||
      reason.includes('database is closing') ||
      reason.includes('database is hidden') ||
      reason.includes('closing/hidden') ||
      reason.includes('connection is closing') ||
      reason.includes('idbdatabase') ||
      reason.includes('indexeddb') ||
      reason.includes('the database connection is closing') ||
      stack.includes('idbdatabase') ||
      stack.includes('indexeddb') ||
      stack.includes('firebaselocalstoragedb')
    );
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isTransientDbClosing(event.reason)) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      return true;
    }
    return false;
  };

  const handleError = (event: ErrorEvent) => {
    if (isTransientDbClosing(event.error) || isTransientDbClosing(event.message)) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      return true;
    }
    return false;
  };

  window.addEventListener('unhandledrejection', handleRejection, true);
  window.addEventListener('unhandledrejection', handleRejection, false);
  window.addEventListener('error', handleError, true);
  window.addEventListener('error', handleError, false);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

