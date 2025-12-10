import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/fonts.css';
import './index.css';
import '../features/puzzles/styles/PuzzleBase.css';
import App from './App.jsx';
import echolotWoff2 from '../assets/fonts/Echolot.woff2';
import echolotWoff from '../assets/fonts/Echolot.woff';

const preloadFont = (href, type) => {
  if (!href) return;
  const existing = document.head.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = type;
  link.href = href;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};

preloadFont(echolotWoff2, 'font/woff2');
preloadFont(echolotWoff, 'font/woff');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
