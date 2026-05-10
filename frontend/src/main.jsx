import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { StaffAuthProvider } from './context/StaffAuthProvider';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <StaffAuthProvider>
        <App />
      </StaffAuthProvider>
    </Provider>
  </StrictMode>,
);
