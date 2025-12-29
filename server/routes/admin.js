const express = require("express");
const pool = require("../db");
const router = express.Router();

// Tüm Kullanıcıları Getir
router.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, full_name, email, role, wallet_address FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Veri çekilemedi" });
  }
});

// Kullanıcı Sil
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "Kullanıcı silindi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Silme başarısız" });
  }
});

// --- ROL SENKRONİZASYONU (KRİTİK DÜZELTME) ---
router.put("/sync-role", async (req, res) => {
  try {
    const { wallet_address, role } = req.body;

    if (!wallet_address || !role) {
      return res.status(400).json({ error: "Eksik parametre" });
    }

    console.log(`⚡ Rol Zorla Güncelleniyor: ${wallet_address} -> ${role}`);

    // DİKKAT: Zincire tekrar sormuyoruz. Frontend zaten onayı aldı.
    // Direkt veritabanını güncelliyoruz.
    // TRIM ve LOWER ile boşluk/büyük harf hatasını önlüyoruz.
    const updateQuery = `
      UPDATE users 
      SET role = $1 
      WHERE LOWER(TRIM(wallet_address)) = LOWER(TRIM($2)) 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [role, wallet_address]);

    if (result.rows.length === 0) {
      console.log("⚠️ Kullanıcı DB'de bulunamadı.");
      return res.status(404).json({ error: "Kullanıcı veritabanında bulunamadı." });
    }

    console.log("✅ DB Başarıyla Güncellendi:", result.rows[0].full_name);
    res.json({ message: "Rol güncellendi", user: result.rows[0] });

  } catch (error) {
    console.error("DB Hatası:", error);
    res.status(500).json({ error: "Veritabanı güncelleme hatası" });
  }
});

module.exports = router;