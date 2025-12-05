const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");

// --- KAYIT OL (REGISTER) ---
// --- KAYIT OL (GÜVENLİ & İMZALI) ---
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, wallet_address, signature } = req.body;

    // 1. E-posta Kontrolü
    const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kullanımda." });
    }

    let passwordHash = null;
    let finalWalletAddress = null;

    // 2. SENARYO A: Şifreli Kayıt
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } 
    // 3. SENARYO B: Cüzdanlı Kayıt (İmza Zorunlu)
    else if (wallet_address && signature) {
      finalWalletAddress = wallet_address.toLowerCase();

      // A. Bu cüzdan daha önce kayıt olmuş mu?
      const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [finalWalletAddress]);
      if (walletCheck.rows.length > 0) {
        return res.status(409).json({ error: "Bu cüzdan adresi zaten sisteme kayıtlı." });
      }

      // B. İmza Doğrulama (Gerçekten bu cüzdanın sahibi mi?)
      // Kayıt sırasında sabit bir metin imzalatacağız: "InsideBox Kayıt Onayı"
      const recoveredAddress = ethers.verifyMessage("InsideBox Kayıt Onayı", signature);
      
      if (recoveredAddress.toLowerCase() !== finalWalletAddress) {
        return res.status(401).json({ error: "İmza geçersiz! Cüzdanın size ait olduğunu doğrulayamadık." });
      }
    } else {
      return res.status(400).json({ error: "Eksik bilgi: Şifre veya Cüzdan İmzası gerekli." });
    }

    // 4. Kayıt İşlemi
    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, wallet_address) VALUES ($1, $2, $3, $4) RETURNING *",
      [full_name, email, passwordHash, finalWalletAddress]
    );

    // 5. Token Ver
    const token = jwt.sign(
      { user_id: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, user: newUser.rows[0] });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});


// --- GİRİŞ YAP (EMAIL & ŞİFRE) ---
router.post("/login-email", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Kullanıcı veritabanında var mı?
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(401).json("E-posta veya şifre hatalı!");
    }

    // 2. Şifre kontrolü (Gönderilen şifre ile Hash eşleşiyor mu?)
    // Web3 kullanıcılarının şifresi NULL olduğu için hata vermesin diye kontrol ediyoruz
    if (!user.rows[0].password_hash) {
       return res.status(401).json("Bu hesap şifre ile giriş yapamaz (Cüzdan kullanın).");
    }

    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json("E-posta veya şifre hatalı!");
    }

    // 3. Her şey doğruysa Token ver
    const token = jwt.sign(
      { user_id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});


// --- ADIM 1: NONCE OLUŞTUR (Cüzdan Sahibine Soru Sor) ---
router.post("/nonce", async (req, res) => {
  try {
    const { wallet_address } = req.body;
    
    // 1. Rastgele bir sayı üret (Örn: 482391)
    const nonce = Math.floor(Math.random() * 1000000).toString();

    // 2. Bu cüzdan adresine sahip kullanıcıyı bul ve nonce'u kaydet
    // Not: Kullanıcı kayıtlı değilse nonce veremeyiz, önce kayıt olmalı.
    const updateQuery = await pool.query(
      "UPDATE users SET nonce = $1 WHERE wallet_address = $2 RETURNING *",
      [nonce, wallet_address.toLowerCase()] // Adresi hep küçük harfe çeviriyoruz
    );

    if (updateQuery.rows.length === 0) {
      return res.status(404).json("Bu cüzdan adresi kayıtlı değil. Lütfen önce kayıt olun.");
    }

    // 3. Frontend'e bu sayıyı gönder (Kullanıcı bunu imzalayacak)
    res.json({ nonce });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});


// --- ADIM 2: İMZAYI DOĞRULA (Login Wallet) ---
// --- ADIM 2: İMZAYI DOĞRULA (Login Wallet) ---
router.post("/login-wallet", async (req, res) => {
  try {
    const { wallet_address, signature } = req.body;
    const lowerAddr = wallet_address.toLowerCase();

    // 1. Kullanıcıyı bul
    const user = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [
      lowerAddr,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json("Kullanıcı bulunamadı.");
    }

    const dbNonce = user.rows[0].nonce;

    // --- GÜNCELLEME BURADA ---
    // Frontend'de yazdığımız mesajın AYNISINI burada da oluşturuyoruz.
    // Bir harf bile farklı olsa imza doğrulanmaz.
    const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${dbNonce}`;

    // 2. verifyMessage artık sadece nonce'u değil, tüm mesajı kullanarak adresi çözecek
    const recoveredAddress = ethers.verifyMessage(message, signature);
    // --------------------------

    // 3. Adres kontrolü
    if (recoveredAddress.toLowerCase() !== lowerAddr) {
      return res.status(401).json("İmza geçersiz! Bu işlemi siz yapmadınız.");
    }

    // 4. Nonce'u temizle
    await pool.query("UPDATE users SET nonce = NULL WHERE id = $1", [user.rows[0].id]);

    // 5. Token ver
    const token = jwt.sign(
      { user_id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, user: user.rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});


module.exports = router;