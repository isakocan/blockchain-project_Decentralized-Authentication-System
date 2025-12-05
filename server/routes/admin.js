const router = require("express").Router();
const pool = require("../db");

// 1. TÜM KULLANICILARI GETİR
router.get("/users", async (req, res) => {
  try {
    const allUsers = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json(allUsers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Sunucu Hatası");
  }
});

// --- YENİ EKLENEN KISIM: KULLANICI SİL ---
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params; // URL'den silinecek ID'yi al (örn: /delete/5)
    
    // Veritabanından sil
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    
    res.json("Kullanıcı başarıyla silindi!");
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Sunucu Hatası");
  }
});
// -----------------------------------------

module.exports = router;