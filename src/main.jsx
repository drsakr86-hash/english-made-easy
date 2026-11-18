import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import App from './app/App.jsx';
import * as content from './data/legacy-content/index.js';
import { runMigration } from './storage/migration.js';

// الترحيل آمن ومتكرر (idempotent): يعمل مرة واحدة فعلياً ثم يُتخطى.
const migration = runMigration(window.localStorage, content);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App backend={window.localStorage} migration={migration} />
  </StrictMode>,
);

// دعم العمل دون إنترنت: يُسجَّل في نسخة الإنتاج فقط ولا يؤثر على التشغيل إن فشل.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
  });
}
