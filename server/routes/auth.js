const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const { checkAdminOnChain } = require("../blockchain");

// --- YARDIMCI: E-posta Doğrulama ---
const isValidEmail = (email) => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

// --- KAYIT OL ---
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, wallet_address, signature } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Geçersiz e-posta adresi." });
    }
    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({ error: "Ad Soyad en az 3 karakter olmalıdır." });
    }

    const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kullanımda." });
    }

    let passwordHash = null;
    let finalWalletAddress = null;

    if (password) {
      if (password.length < 6) return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } 
    else if (wallet_address && signature) {
      finalWalletAddress = wallet_address.toLowerCase();
      
      const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [finalWalletAddress]);
      if (walletCheck.rows.length > 0) return res.status(409).json({ error: "Bu cüzdan zaten kayıtlı." });

      try {
        const recoveredAddress = ethers.verifyMessage("InsideBox Kayıt Onayı", signature);
        if (recoveredAddress.toLowerCase() !== finalWalletAddress) {
          return res.status(401).json({ error: "İmza geçersiz!" });
        }
      } catch (e) {
        return res.status(400).json({ error: "İmza formatı bozuk." });
      }
    } else {
      return res.status(400).json({ error: "Eksik bilgi." });
    }

    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, wallet_address) VALUES ($1, $2, $3, $4) RETURNING *",
      [full_name, email, passwordHash, finalWalletAddress]
    );

    const token = jwt.sign({ user_id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: newUser.rows[0] });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// --- GİRİŞ YAP (EMAIL) ---
router.post("/login-email", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email)) return res.status(400).json("Geçersiz e-posta.");

    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) return res.status(401).json("E-posta veya şifre hatalı!");
    
    const user = userResult.rows[0];
    if (!user.password_hash) return res.status(401).json("Bu hesap şifre ile giriş yapamaz (Cüzdan kullanın).");

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json("E-posta veya şifre hatalı!");

    const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});

// --- NONCE ---
router.post("/nonce", async (req, res) => {
  try {
    const { wallet_address } = req.body;
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const updateQuery = await pool.query("UPDATE users SET nonce = $1 WHERE wallet_address = $2 RETURNING *", [nonce, wallet_address.toLowerCase()]);
    
    if (updateQuery.rows.length === 0) return res.status(404).json("Kayıtlı değil.");
    res.json({ nonce });
  } catch (err) {
    res.status(500).send("Sunucu Hatası");
  }
});

// --- GİRİŞ YAP (WALLET) ---
router.post("/login-wallet", async (req, res) => {
  try {
    const { wallet_address, signature } = req.body;

    if (!wallet_address || !signature) {
      return res.status(400).json({ error: "Cüzdan adresi ve imza gerekli." });
    }

    const lowerAddr = wallet_address.toLowerCase();

    // 1. ÖNCE VERİTABANINA BAK (DB First)
    const userResult = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [lowerAddr]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı. Önce kayıt olun." });
    }
    const user = userResult.rows[0];

    // 2. İMZAYI DOĞRULA
    // (Burası değişmedi, güvenlik için şart)
    try {
      // Eğer veritabanında nonce varsa onu kullan, yoksa standart mesajı
      const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${user.nonce || "Standart"}`;
      
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== lowerAddr) {
        return res.status(401).json({ error: "İmza geçersiz! Cüzdan size ait değil." });
      }
    } catch (e) {
      return res.status(400).json({ error: "İmza formatı bozuk." });
    }

    // 3. KRİTİK NOKTA: SADECE 'ADMIN' İSE ZİNCİRE BAK
    // Senin istediğin mantık tam olarak burası:
    
    if (user.role === 'admin') {
        console.log(`🕵️ Admin girişi tespit edildi (${user.full_name}). Zincirden teyit alınıyor...`);
        
        // Zincire sor: Gerçekten Admin mi?
        const isOnChainAdmin = await checkAdminOnChain(lowerAddr);

        if (!isOnChainAdmin) {
            console.log("⛔ DB'de Admin ama Zincirde DEĞİL! Yetkisi düşürülüyor.");
            
            // Güvenlik: Zincirde yetkisi yoksa DB'deki yetkisini al ve user yap.
            await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [user.id]);
            user.role = 'user'; // Giriş yaparken user olarak devam etsin
        } else {
            console.log("✅ Zincir onayı başarılı. Admin girişi yapılıyor.");
        }
    } else {
        // Rolü 'user' ise BURASI ÇALIŞIR.
        // Zincire hiç soru sorulmaz. 0 bekleme süresi.
        console.log(`👤 Normal kullanıcı girişi (${user.full_name}). Zincir kontrolü atlandı.`);
    }

    // 4. Token Oluştur ve Gönder
    // (Giriş başarılı, nonce'u yenile)
    const newNonce = Math.floor(Math.random() * 1000000).toString();
    await pool.query("UPDATE users SET nonce = $1 WHERE id = $2", [newNonce, user.id]);

    const token = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role }, // Güncel rolü koyduk
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role, // Güncel rol
        wallet_address: user.wallet_address
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;