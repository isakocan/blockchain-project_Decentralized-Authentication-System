const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const { checkAdminOnChain } = require("../blockchain");

// --- Helper: Validate Email Format ---
const isValidEmail = (email) => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

// --- REGISTER (Web2 & Web3) ---
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, wallet_address, signature } = req.body;

    // 1. Input Validation
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }
    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({ error: "Name must be at least 3 characters." });
    }

    // 2. Check Existing Email
    const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use." });
    }

    let passwordHash = null;
    let finalWalletAddress = null;

    // 3. Handle Registration Method
    if (password) {
      // Scenario A: Password Registration
      if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } 
    else if (wallet_address && signature) {
      // Scenario B: Wallet Registration
      finalWalletAddress = wallet_address.toLowerCase();
      
      const walletCheck = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [finalWalletAddress]);
      if (walletCheck.rows.length > 0) return res.status(409).json({ error: "Wallet already registered." });

      // Verify Signature
      try {
        const recoveredAddress = ethers.verifyMessage("InsideBox Registration Verification", signature); // Frontend mesajı ile aynı olmalı
        if (recoveredAddress.toLowerCase() !== finalWalletAddress) {
          return res.status(401).json({ error: "Invalid signature." });
        }
      } catch (e) {
        return res.status(400).json({ error: "Malformed signature." });
      }
    } else {
      return res.status(400).json({ error: "Missing credentials." });
    }

    // 4. Create User in DB
    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, wallet_address) VALUES ($1, $2, $3, $4) RETURNING *",
      [full_name, email, passwordHash, finalWalletAddress]
    );

    // 5. Generate Token
    const token = jwt.sign({ user_id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: newUser.rows[0] });
    
  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// --- LOGIN (Email & Password) ---
router.post("/login-email", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email format." });

    // 1. Check User
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: "Invalid credentials." });
    
    const user = userResult.rows[0];
    
    // 2. Check Method Compatibility
    if (!user.password_hash) return res.status(401).json({ error: "Please login with your wallet." });

    // 3. Verify Password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials." });

    // 4. Issue Token
    const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user });

  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// --- GENERATE NONCE (For Wallet Login) ---
router.post("/nonce", async (req, res) => {
  try {
    const { wallet_address } = req.body;
    const nonce = Math.floor(Math.random() * 1000000).toString();
    
    const updateQuery = await pool.query("UPDATE users SET nonce = $1 WHERE wallet_address = $2 RETURNING *", [nonce, wallet_address.toLowerCase()]);
    
    if (updateQuery.rows.length === 0) return res.status(404).json({ error: "Wallet not registered." });
    res.json({ nonce });

  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// --- LOGIN (Wallet) - Hybrid Architecture ---
router.post("/login-wallet", async (req, res) => {
  try {
    const { wallet_address, signature } = req.body;
    const lowerAddr = wallet_address.toLowerCase();

    // 1. Fetch User
    const userResult = await pool.query("SELECT * FROM users WHERE wallet_address = $1", [lowerAddr]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found." });
    const user = userResult.rows[0];

    // 2. Verify Signature
    const message = `EtherGuard Secure Authentication System\n\nThis signature request is to verify your identity.\nNonce: ${user.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== lowerAddr) {
      return res.status(401).json({ error: "Invalid signature." });
    }

    // 3. HYBRID SECURITY CHECK (Admin Only)
    let currentRole = user.role;
    
    if (user.role === 'admin') {
        console.log(`🕵️ Admin Login Detected (${user.full_name}). Verifying on-chain...`);
        const isOnChainAdmin = await checkAdminOnChain(lowerAddr);
        
        if (!isOnChainAdmin) {
            console.log("⛔ DB says Admin, Chain says User. Downgrading role...");
            await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [user.id]);
            currentRole = 'user';
        } else {
            console.log("✅ Chain confirmed Admin status.");
        }
    }

    // 4. Cleanup & Issue Token
    await pool.query("UPDATE users SET nonce = NULL WHERE id = $1", [user.id]);

    const token = jwt.sign({ user_id: user.id, role: currentRole }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    res.json({ token, user: { ...user, role: currentRole } });

  } catch (err) {
    console.error("Wallet Login Error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;