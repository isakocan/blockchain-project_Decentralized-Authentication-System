const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

// --- 1. UPDATE PROFILE INFO (Name & Email) ---
router.put("/update-info", async (req, res) => {
  try {
    const { id, full_name, email } = req.body;

    // Check if email is taken by another user
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND id != $2",
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email is already in use." });
    }

    const updatedUser = await pool.query(
      "UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING *",
      [full_name, email, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// --- 2. CHANGE PASSWORD (Web2 Only) ---
router.post("/change-password", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
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
    res.status(500).json({ error: "Server error." });
  }
});

// --- 3. CHANGE WALLET (Web3 Only) ---
router.post("/change-wallet", async (req, res) => {
  try {
    const { id, wallet_address, signature } = req.body;
    const finalAddress = wallet_address.toLowerCase();

    // Check uniqueness
    const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1 AND id != $2", [finalAddress, id]);
    if (walletCheck.rows.length > 0) {
      return res.status(409).json({ error: "Wallet address already in use." });
    }

    // Verify Signature
    try {
      const recoveredAddress = ethers.verifyMessage("InsideBox Cüzdan Güncelleme", signature);
      if (recoveredAddress.toLowerCase() !== finalAddress) {
        return res.status(401).json({ error: "Invalid signature." });
      }
    } catch (e) {
      return res.status(400).json({ error: "Malformed signature." });
    }

    const updatedUser = await pool.query(
      "UPDATE users SET wallet_address = $1 WHERE id = $2 RETURNING *",
      [finalAddress, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// --- 4. SWITCH TO WALLET LOGIN ---
router.post("/switch-to-wallet", async (req, res) => {
  try {
    const { id, wallet_address, signature } = req.body;
    const finalAddress = wallet_address.toLowerCase();

    const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [finalAddress]);
    if (walletCheck.rows.length > 0) {
      return res.status(409).json({ error: "Wallet address already in use." });
    }

    try {
      const recoveredAddress = ethers.verifyMessage("InsideBox Kimlik Değişimi", signature);
      if (recoveredAddress.toLowerCase() !== finalAddress) {
        return res.status(401).json({ error: "Invalid signature." });
      }
    } catch (e) {
      return res.status(400).json({ error: "Malformed signature." });
    }

    // Remove password, set wallet
    const updatedUser = await pool.query(
      "UPDATE users SET password_hash = NULL, wallet_address = $1 WHERE id = $2 RETURNING *",
      [finalAddress, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// --- 5. SWITCH TO PASSWORD LOGIN ---
router.post("/switch-to-password", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Remove wallet info, set password
    const updatedUser = await pool.query(
      "UPDATE users SET wallet_address = NULL, nonce = NULL, password_hash = $1 WHERE id = $2 RETURNING *",
      [passwordHash, id]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;