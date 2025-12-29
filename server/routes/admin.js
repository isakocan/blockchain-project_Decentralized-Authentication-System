const express = require("express");
const pool = require("../db");
const router = express.Router();

// --- FETCH ALL USERS ---
router.get("/users", async (req, res) => {
  try {
    // password_hash eklendi
    const result = await pool.query("SELECT id, full_name, email, role, wallet_address, password_hash FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ error: "Failed to retrieve users." });
  }
});

// --- DELETE USER ---
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Delete failed." });
  }
});

// --- ROLE SYNCHRONIZATION (DB <-> Blockchain) ---
router.put("/sync-role", async (req, res) => {
  try {
    const { wallet_address, role } = req.body;

    if (!wallet_address || !role) {
      return res.status(400).json({ error: "Missing parameters." });
    }

    console.log(`⚡ Syncing Role: ${wallet_address} -> ${role}`);

    // Robust Query: Handles casing and whitespace issues
    const updateQuery = `
      UPDATE users 
      SET role = $1 
      WHERE LOWER(TRIM(wallet_address)) = LOWER(TRIM($2)) 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [role, wallet_address]);

    if (result.rows.length === 0) {
      console.log("⚠️ User not found in DB during sync.");
      return res.status(404).json({ error: "User not found (Address mismatch)." });
    }

    console.log("✅ DB Sync Complete:", result.rows[0].full_name);
    res.json({ message: "Role updated.", user: result.rows[0] });

  } catch (error) {
    console.error("Sync Error:", error);
    res.status(500).json({ error: "Database update failed." });
  }
});

module.exports = router;