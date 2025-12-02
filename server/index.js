// server/index.js

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers'); // Kriptografi işlemleri için kütüphane

const app = express();

app.use(cors()); // Frontend'in bize ulaşmasına izin ver
app.use(express.json()); // Gelen verileri JSON formatında oku

// --- GEÇİCİ HAFIZA (RAM) ---
// Gerçek projede burası bir veritabanı (SQL) olur.
// Şimdilik kullanıcıların "Rastgele Sayılarını" (Nonce) burada tutuyoruz.
const users = {};

/**
 * 1. ADIM: Nonce (Rastgele Sayı) Üretme
 * Amaç: Kullanıcıya imzalaması için rastgele bir sayı veriyoruz.
 * Neden? : Eğer sabit bir metin imzalatırsak, bir hacker o imzayı kopyalayıp
 * yarın tekrar kullanabilir (Replay Attack). Rastgele sayı bunu engeller.
 */
app.get('/nonce/:address', (req, res) => {
    const address = req.params.address;
    
    // 0 ile 1 milyon arası rastgele bir sayı üret
    const nonce = Math.floor(Math.random() * 1000000);
    
    // Bu sayıyı hafızaya kaydet ki doğrularken kontrol edebilelim
    users[address] = { nonce: nonce };
    
    console.log(`--> Yeni Nonce üretildi: ${address} için ${nonce}`);
    res.json({ nonce: nonce });
});

/**
 * 2. ADIM: İmzayı Kontrol Etme (Doğrulama)
 * Amaç: Gelen imzanın gerçekten o cüzdan sahibine ait olup olmadığını
 * matematiksel olarak kanıtlamak.
 */
app.post('/verify', (req, res) => {
    const { address, signature } = req.body;
    
    // Kullanıcı daha önce bizden sayı istemiş mi?
    if (!users[address]) {
        return res.status(400).json({ error: "Önce bir Nonce almalısınız!" });
    }

    const nonce = users[address].nonce;
    
    // Kullanıcının imzaladığı metnin aynısını burada da oluşturuyoruz
    const message = `Sisteme giris yapiyorum. Tek kullanimlik kodum: ${nonce}`;

    try {
        // --- KRİTİK NOKTA ---
        // ethers.verifyMessage fonksiyonu sihirli bir matematik kullanır.
        // Mesajı ve İmzayı veririz -> O bize "Bu imzayı atan adres şudur" der.
        const recoveredAddress = ethers.verifyMessage(message, signature);

        // İmzadan çıkan adres, kullanıcının iddia ettiği adresle aynı mı?
        if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
            
            // GÜVENLİK: Kullanılan sayıyı hemen değiştiriyoruz.
            // Böylece aynı imza ikinci kez kullanılamaz.
            users[address].nonce = Math.floor(Math.random() * 1000000);
            
            console.log(`✅ GİRİŞ BAŞARILI: ${address}`);
            res.json({ success: true, message: "Tebrikler, giriş başarılı!" });
        } else {
            console.log(`❌ HATA: İmza geçersiz!`);
            res.status(401).json({ error: "İmza doğrulanamadı, sahte olabilir!" });
        }
    } catch (err) {
        console.error("Sunucu Hatası:", err);
        res.status(500).json({ error: "Sunucu tarafında hata oluştu" });
    }
});

app.listen(3000, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 Sunucu çalışıyor: http://localhost:3000`);
    console.log(`--------------------------------------------------`);
});