import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import "./Login.css"; // Ortak stilleri kullanıyoruz

function Register() {
  const navigate = useNavigate();

  // Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Wallet States
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState(""); 
  
  // UI States
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // --- Connect Wallet ---
  const connectWallet = async () => {
    if (!window.ethereum) return toast.warning("Metamask not found!");
    
    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      toast.info("Please sign the message to verify ownership...");
      const sig = await signer.signMessage("InsideBox Registration Verification");

      setWalletAddress(address);
      setSignature(sig);
      toast.success("Wallet connected successfully!");

    } catch (err) {
      console.error(err);
      toast.error("Connection failed or rejected.");
    } finally {
      setIsConnecting(false);
    }
  };

  const resetWallet = () => {
    setWalletAddress("");
    setSignature("");
  };

  // --- Handle Register ---
  const handleRegister = async () => {
    // Validation
    if (!fullName || !email) return toast.warning("Name and Email are required.");
    
    // Logic: If wallet is connected, password is NOT required. If not, it IS required.
    if (!walletAddress && !password) {
      return toast.warning("Please set a password or connect a wallet.");
    }

    setIsRegistering(true);
    try {
      // Backend Request
      const response = await axios.post("http://localhost:5000/auth/register", {
        full_name: fullName,
        email,
        password: password || null, // Send null if using wallet
        wallet_address: walletAddress || null,
        signature: signature || null
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Account created! Auto-Login...");
      setTimeout(() => navigate("/dashboard"), 1500);

    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-card login-card">
        
        <div className="login-header">
          <h2>Create Account</h2>
          <p>Join EtherGuard today</p>
        </div>

        {/* Input: Full Name */}
        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* Input: Email */}
        <div className="input-group">
          <label className="input-label">Email Address</label>
          <input 
            type="email" 
            className="input-field" 
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Dynamic Section: Password OR Wallet */}
        {walletAddress ? (
          // IF WALLET CONNECTED
          <div className="wallet-badge">
            <span>✅ {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            <button onClick={resetWallet} className="btn-icon" title="Disconnect">✕</button>
          </div>
        ) : (
          // IF NO WALLET
          <>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="divider">
              <span>OR PREFER DECENTRALIZED?</span>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={connectWallet}
              disabled={isConnecting}
              style={{ marginBottom: "20px" }}
            >
              {isConnecting ? <div className="loader"></div> : <>🦊 Connect Wallet</>}
            </button>
          </>
        )}

        {/* Register Button */}
        <button 
          className="btn btn-primary" 
          onClick={handleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? <div className="loader"></div> : "Sign Up"}
        </button>

        {/* Footer */}
        <div className="footer-text">
          Already have an account?{" "}
          <Link to="/" className="text-link">Sign In</Link>
        </div>

      </div>
    </div>
  );
}

export default Register;