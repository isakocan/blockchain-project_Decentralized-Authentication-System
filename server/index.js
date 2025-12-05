const express = require("express");
const cors = require("cors");
const pool = require("./db"); // db.js dosyasını çağırdık

const app = express();

// --- Middleware (Ara Katmanlar) ---
app.use(cors()); // React'ten gelen isteklere izin ver
app.use(express.json()); // Gelen verileri JSON formatında oku
app.use("/auth", require("./routes/auth"));
app.use("/admin", require("./routes/admin"));
app.use("/user", require("./routes/user"));

// --- Test Rotası ---
// Tarayıcıdan localhost:5000'e girince çalışır
app.get("/", (req, res) => {
  res.send("Backend Sunucusu Çalışıyor!");
});

// --- Veritabanı Testi ---
// Veritabanına gerçekten bağlandık mı diye test etmek için
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()"); // Şu anki saati sor
    res.json({ message: "Veritabanı bağlantısı başarılı!", time: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Veritabanı hatası!");
  }
});

// --- Sunucuyu Başlat ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});