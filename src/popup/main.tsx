import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme } from '../ui/appearance';
import { isPreview } from '../lib/environment';
import '../ui/theme.css';
import './popup.css';

applyTheme();
document.body.classList.toggle('web-popup', isPreview());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
