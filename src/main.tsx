import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/themeManager.ts';
import './lib/settingsSave.ts';

createRoot(document.getElementById('root')!).render(<App />);
