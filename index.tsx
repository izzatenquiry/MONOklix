
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeAdminAccount } from './services/userService';

// Mulakan akaun admin sebelum memaparkan aplikasi
initializeAdminAccount().then(() => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
