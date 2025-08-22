import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import 'antd/dist/reset.css';

// Production optimizations
if (import.meta.env.PROD) {
  // Disable React DevTools in production
  if (typeof window !== 'undefined') {
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: true,
      supportsFiber: true,
      inject: () => {},
      onScheduleFiberRoot: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);