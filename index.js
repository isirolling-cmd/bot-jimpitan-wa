const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 3000;

// Inisialisasi WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

let qrCodeData = '';
let isConnected = false;

client.on('qr', (qr) => {
    qrCodeData = qr;
    console.log('QR Code Baru Dibuat!');
});

client.on('ready', () => {
    console.log('Bot WA Terhubung!');
    isConnected = true;
    qrCodeData = '';
});

client.initialize();

// Tampilan Web untuk Scan QR
app.get('/', async (req, res) => {
    if (isConnected) {
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:40px;">
                <h1 style="color:green;">✅ Bot WhatsApp Terhubung & Aktif!</h1>
                <p>Pengingat jimpitan akan dikirim otomatis setiap <b>Sabtu Jam 08:00 Pagi WIB</b>.</p>
            </div>
        `);
    } else if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:20px;">
                <h2>Scan QR Code Ini via WhatsApp HP</h2>
                <p>Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat</p>
                <img src="${qrImage}" style="border:2px solid #ccc; padding:10px; border-radius:10px; width:250px;">
                <p style="color:gray;">Halaman akan merefresh otomatis...</p>
                <script>setTimeout(() => location.reload(), 5000);</script>
            </div>
        `);
    } else {
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:40px;">
                <h2>Menyiapkan Mesin WhatsApp...</h2>
                <p>Tunggu beberapa saat lalu refresh halaman ini.</p>
                <script>setTimeout(() => location.reload(), 4000);</script>
            </div>
        `);
    }
});

// JADWAL OTOMATIS (Setiap Sabtu Jam 08:00 WIB)
cron.schedule('0 8 * * 6', async () => {
    if (!isConnected) return;

    // GANTI 'Grup RT Jimpitan' SAMA PERSIS DENGAN NAMA GRUP WA ANDA
    const groupName = 'Grup RT Jimpitan'; 
    const message = 'Assalamu’alaikum wr. wb. Pengingat untuk bapak-bapak warga RT, dimohon untuk mengisi cup jimpitannya ya, karena nanti malam minggu akan diambil oleh petugas. Terima kasih!';

    try {
        const chats = await client.getChats();
        const group = chats.find(chat => chat.isGroup && chat.name === groupName);

        if (group) {
            await client.sendMessage(group.id._serialized, message);
            console.log('Pesan jimpitan berhasil dikirim!');
        } else {
            console.log('Grup tidak ditemukan.');
        }
    } catch (err) {
        console.error('Gagal kirim pesan:', err);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta" // Memastikan tepat Jam 08:00 Waktu Indonesia Barat
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});
