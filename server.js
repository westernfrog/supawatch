const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/api/playlists', (req, res) => {
    const publicDir = path.join(__dirname, 'public');
    const files = fs.readdirSync(publicDir)
        .filter(file => file.endsWith('.m3u') || file.endsWith('.m3u8'))
        .map(file => ({
            filename: file,
            name: file.replace(/\.(m3u8?)/i, '').replace(/[_-]/g, ' ')
        }));
    res.json(files);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`IPTV Server running at http://localhost:${PORT}`);
});
