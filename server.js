import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve Supabase UMD client bundle
app.get('/js/supabase.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'));
});

// Serve static assets with html extension support
app.use(express.static(__dirname, {
  extensions: ['html']
}));

// Route root to index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for any unmatched route to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Healthmate server listening on port ${PORT}`);
});
