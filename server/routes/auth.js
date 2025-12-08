const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
// YENİ: Blockchain kontrolcüsünü çağırıyoruz
const { checkAdminOnChain } = require("../blockchain");

// --- YARDIMCI FONKSİYON: E-posta Doğrulama ---
const isValidEmail = (email) => {
  // Regex: İçinde @ ve . var mı, başında sonunda boşluk yok mu kontrol eder
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

// --- KAYIT OL (REGISTER) ---
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, wallet_address, signature } = req.body;

    // 1. VALIDATION (Doğrulama) KONTROLLERİ
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Lütfen geçerli bir e-posta adresi girin (örn: isim@site.com)." });
    }

    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({ error: "Ad Soyad en az 3 karakter olmalıdır." });
    }

    // 2. E-posta veritabanında var mı?
    const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kullanımda." });
    }

    let passwordHash = null;
    let finalWalletAddress = null;

    // 3. Şifre veya Cüzdan Kontrolü
    if (password) {
      // Şifre Validasyonu
      if (password.length < 6) {
        return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } 
    else if (wallet_address && signature) {
      finalWalletAddress = wallet_address.toLowerCase();

      // Cüzdan Duplicate Kontrolü
      const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [finalWalletAddress]);
      if (walletCheck.rows.length > 0) {
        return res.status(409).json({ error: "Bu cüzdan adresi zaten sisteme kayıtlı." });
      }

      // İmza Doğrulama
      try {
        const recoveredAddress = ethers.verifyMessage("InsideBox Kayıt Onayı", signature);
        if (recoveredAddress.toLowerCase() !== finalWalletAddress) {
          return res.status(401).json({ error: "İmza geçersiz! Cüzdanın size ait olduğunu doğrulayamadık." });
        }
      } catch (e) {
        return res.status(400).json({ error: "İmza formatı bozuk." });
      }
    } else {
      return res.status(400).json({ error: "Eksik bilgi: Şifre veya Cüzdan İmzası gerekli." });
    }

    // 4. Kayıt İşlemi
    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, wallet_address) VALUES ($1, $2, $3, $4) RETURNING *",
      [full_name, email, passwordHash, finalWalletAddress]
    );

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

    // Validation
    if (!isValidEmail(email)) {
      return res.status(400).json("Geçersiz e-posta formatı.");
    }

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      return res.status(401).json("E-posta veya şifre hatalı!");
    }

    if (!user.rows[0].password_hash) {
       return res.status(401).json("Bu hesap şifre ile giriş yapamaz (Cüzdan kullanın).");
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json("E-posta veya şifre hatalı!");
    }

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

// --- NONCE OLUŞTUR ---
router.post("/nonce", async (req, res) => {
  try {
    const { wallet_address } = req.body;
    const nonce = Math.floor(Math.random() * 1000000).toString();

    const updateQuery = await pool.query(
      "UPDATE users SET nonce = $1 WHERE wallet_address = $2 RETURNING *",
      [nonce, wallet_address.toLowerCase()]
    );

    if (updateQuery.rows.length === 0) {
      return res.status(404).json("Bu cüzdan adresi kayıtlı değil. Lütfen önce kayıt olun.");
    }

    res.json({ nonce });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});

// --- GİRİŞ YAP (LOGIN WALLET) ---
// --- GİRİŞ YAP (LOGIN WALLET - DEBUG) ---
router.post("/login-wallet", async (req, res) => {
  try {
    const { wallet_address, signature } = req.body;
    const lowerAddr = wallet_address.toLowerCase();

    console.log(`📥 GİRİŞ İSTEĞİ: ${lowerAddr}`);

    const userResult = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [lowerAddr]);
    if (userResult.rows.length === 0) return res.status(404).json("Kullanıcı bulunamadı.");
    
    const user = userResult.rows[0];

    // İmza Doğrulama (Burası zaten çalışıyor varsayıyoruz)
    const dbNonce = user.nonce;
    const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${dbNonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== lowerAddr) {
      return res.status(401).json("İmza geçersiz!");
    }

    // --- ZİNCİR KONTROLÜ ---
    console.log("🔍 Zincire soruluyor...");
    const isOnChainAdmin = await checkAdminOnChain(lowerAddr);
    
    let currentRole = user.role;
    
    if (isOnChainAdmin) {
        console.log("✅ Zincir ONAYLADI! Rol 'admin' yapılıyor.");
        await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
        currentRole = 'admin';
    } else {
        console.log("❌ Zincir REDDETTİ! Rol 'user' olarak kalıyor.");
        // Eğer veritabanında adminse ama zincirde değilse, yetkisini al!
        if (user.role === 'admin') {
            await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [user.id]);
            currentRole = 'user';
        }
    }

    await pool.query("UPDATE users SET nonce = NULL WHERE id = $1", [user.id]);

    const token = jwt.sign({ user_id: user.id, role: currentRole }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { ...user, role: currentRole } });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});

module.exports = router;