import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against browser iframe transient IndexedDB 'Database is closing/hidden' events
// and Firebase Auth internal assertion bug 'INTERNAL ASSERTION FAILED: Pending promise was never set'
if (typeof window !== 'undefined') {
  const isIgnorableAuthOrDbError = (err: any): boolean => {
    if (!err) return false;
    const msg = (typeof err === 'string' ? err : err.message || err.name || err.toString?.() || '').toLowerCase();
    const reason = (err.reason && (typeof err.reason === 'string' ? err.reason : err.reason?.message || err.reason?.name || err.reason?.toString?.() || ''))?.toLowerCase() || '';
    const stack = (err.stack || '')?.toLowerCase?.() || '';
    
    return (
      msg.includes('pending promise was never set') ||
      reason.includes('pending promise was never set') ||
      stack.includes('pending promise was never set') ||
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
      stack.includes('firebaselocalstoragedb') ||
      msg.includes('unexpected eof') ||
      msg.includes('unexpected end of json') ||
      reason.includes('unexpected eof') ||
      reason.includes('unexpected end of json')
    );
  };

  // Filter out internal Firebase Auth assertion error and transient stream EOF from console.error
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const fullText = args.map(a => (typeof a === 'string' ? a : a?.message || a?.toString?.() || '')).join(' ');
    const lowerText = fullText.toLowerCase();
    if (fullText.includes('Pending promise was never set')) {
      console.warn('Suppressed Firebase Auth internal assertion warning:', fullText);
      return;
    }
    if (lowerText.includes('unexpected eof') || lowerText.includes('unexpected end of json input')) {
      console.warn('Suppressed transient JSON stream parse warning:', fullText);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isIgnorableAuthOrDbError(event.reason)) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      return true;
    }
    return false;
  };

  const handleError = (event: ErrorEvent) => {
    if (isIgnorableAuthOrDbError(event.error) || isIgnorableAuthOrDbError(event.message)) {
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

