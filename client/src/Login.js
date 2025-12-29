import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Yükleniyor durumu eklendi
  const navigate = useNavigate();

  // --- Success Handler ---
  const loginSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    toast.success("Welcome back! 🚀");

    if (data.user.role === 'admin') {
      setTimeout(() => navigate("/admin"), 1000);
    } else {
      setTimeout(() => navigate("/dashboard"), 1000);
    }
  };

  // --- Email Login ---
  const handleEmailLogin = async () => {
    if (!email || !password) return toast.warning("Please fill in all fields.");
    
    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/auth/login-email", {
        email,
        password,
      });
      loginSuccess(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Metamask Login ---
  const handleMetamaskLogin = async () => {
    if (!window.ethereum) return toast.warning("Metamask not found!");

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 1. Get Nonce
      const nonceRes = await axios.post("http://localhost:5000/auth/nonce", { 
        wallet_address: address 
      });
      const { nonce } = nonceRes.data;

      // 2. Sign Message
      const message = `EtherGuard Secure Authentication System\n\nThis signature request is to verify your identity.\nNonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      // 3. Verify & Login
      const response = await axios.post("http://localhost:5000/auth/login-wallet", {
        wallet_address: address,
        signature,
      });
      loginSuccess(response.data);

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Wallet login failed.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="login-container">
      {/* glass-card sınıfı index.css'ten geliyor */}
      <div className="glass-card login-card">
        
        <div className="login-header">
          <h2>Welcome back!</h2>
          <p></p>
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

        {/* Input: Password */}
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

        {/* Action Button */}
        <button 
          className="btn btn-primary" 
          onClick={handleEmailLogin} 
          disabled={isLoading}
        >
          {isLoading ? <div className="loader"></div> : "Sign In"}
        </button>

        {/* Divider */}
        <div className="divider">
          <span>OR</span>
        </div>

        {/* Web3 Button */}
        <button 
          className="btn btn-secondary" 
          onClick={handleMetamaskLogin}
          disabled={isLoading}
        >
           {isLoading ? <div className="loader"></div> : <>🦊 Connect Wallet</>}
        </button>

        {/* Footer Link */}
        <div className="footer-text">
          Don't have an account?{" "}
          <Link to="/register" className="text-link">
            Create Account
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;