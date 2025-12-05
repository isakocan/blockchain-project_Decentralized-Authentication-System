const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

// --- 1. PROFİL BİLGİLERİNİ GÜNCELLE (İsim & Email) ---
router.put("/update-info", async (req, res) => {
  try {
    const { id, full_name, email } = req.body;

    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND id != $2",
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Bu e-posta adresi başkası tarafından kullanılıyor." });
    }

    const updatedUser = await pool.query(
      "UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING *",
      [full_name, email, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// --- 2. SADECE ŞİFRE DEĞİŞTİR (Web2 Kullanıcısı İçin) ---
router.post("/change-password", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (password.length < 6) {
      return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const updatedUser = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *",
      [passwordHash, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// --- 3. SADECE CÜZDAN DEĞİŞTİR (Web3 Kullanıcısı İçin) ---
router.post("/change-wallet", async (req, res) => {
  try {
    const { id, wallet_address, signature } = req.body;
    const finalAddress = wallet_address.toLowerCase();

    // Bu cüzdan başkasında var mı?
    const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1 AND id != $2", [finalAddress, id]);
    if (walletCheck.rows.length > 0) {
      return res.status(409).json({ error: "Bu cüzdan adresi zaten kullanımda." });
    }

    // İmza Doğrulama
    try {
      const recoveredAddress = ethers.verifyMessage("InsideBox Cüzdan Güncelleme", signature);
      if (recoveredAddress.toLowerCase() !== finalAddress) {
        return res.status(401).json({ error: "İmza geçersiz!" });
      }
    } catch (e) {
      return res.status(400).json({ error: "İmza formatı bozuk." });
    }

    const updatedUser = await pool.query(
      "UPDATE users SET wallet_address = $1 WHERE id = $2 RETURNING *",
      [finalAddress, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// --- 4. CÜZDANA GEÇİŞ YAP (Switch to Wallet) ---
router.post("/switch-to-wallet", async (req, res) => {
  try {
    const { id, wallet_address, signature } = req.body;
    const finalAddress = wallet_address.toLowerCase();

    const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [finalAddress]);
    if (walletCheck.rows.length > 0) {
      return res.status(409).json({ error: "Bu cüzdan adresi zaten kullanımda." });
    }

    try {
      const recoveredAddress = ethers.verifyMessage("InsideBox Kimlik Değişimi", signature);
      if (recoveredAddress.toLowerCase() !== finalAddress) {
        return res.status(401).json({ error: "İmza geçersiz!" });
      }
    } catch (e) {
      return res.status(400).json({ error: "İmza formatı bozuk." });
    }

    const updatedUser = await pool.query(
      "UPDATE users SET password_hash = NULL, wallet_address = $1 WHERE id = $2 RETURNING *",
      [finalAddress, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// --- 5. ŞİFREYE GEÇİŞ YAP (Switch to Password) ---
router.post("/switch-to-password", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (password.length < 6) {
      return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const updatedUser = await pool.query(
      "UPDATE users SET wallet_address = NULL, nonce = NULL, password_hash = $1 WHERE id = $2 RETURNING *",
      [passwordHash, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;