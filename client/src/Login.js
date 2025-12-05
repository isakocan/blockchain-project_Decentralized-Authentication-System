import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers"; // Metamask kütüphanesi
import "./Login.css";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // --- A. KLASİK GİRİŞ (WEB2) ---
  const handleEmailLogin = async () => {
    try {
      const response = await axios.post("http://localhost:5000/auth/login-email", {
        email: email,
        password: password
      });
      loginSuccess(response.data);
    } catch (error) {
      console.error(error);
      alert(error.response?.data || "Giriş başarısız!");
    }
  };

  // --- B. METAMASK İLE GİRİŞ (WEB3) ---
  // --- B. METAMASK İLE GİRİŞ (WEB3) ---
  const handleMetamaskLogin = async () => {
    if (!window.ethereum) {
      return alert("Lütfen tarayıcınıza Metamask eklentisini kurun!");
    }

    try {
      // 1. Cüzdanı Bağla
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      // 2. Backend'den Nonce İste
      const nonceResponse = await axios.post("http://localhost:5000/auth/nonce", {
        wallet_address: walletAddress
      });
      
      const nonce = nonceResponse.data.nonce;

      // --- GÜNCELLEME BURADA ---
      // Mesajı oluşturuyoruz (Backend'deki metinle %100 aynı olmalı)
      const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${nonce}`;
      
      // Artık sadece sayıyı değil, bu mesajı imzalıyoruz
      const signature = await signer.signMessage(message);
      // -------------------------

      // 3. İmzayı Gönder
      const loginResponse = await axios.post("http://localhost:5000/auth/login-wallet", {
        wallet_address: walletAddress,
        signature: signature
      });

      loginSuccess(loginResponse.data);

    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 404) {
        alert("Bu cüzdan adresi sistemde kayıtlı değil. Lütfen önce kayıt olun!");
      } else {
        alert("Cüzdan girişi başarısız oldu.");
      }
    }
  };

  // --- ORTAK BAŞARI FONKSİYONU ---
  const loginSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    navigate("/dashboard");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Giriş Yap</h2>
          <p>Devam etmek için bilgilerinizi girin</p>
        </div>

        {/* --- KLASİK GİRİŞ FORM --- */}
        <div className="form-group">
          <label>E-posta Adresi</label>
          <input 
            type="email" 
            className="form-control" 
            placeholder="ornek@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Şifre</label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleEmailLogin}>
            Giriş Yap
        </button>

        <div className="divider">
          <span>VEYA</span>
        </div>

        {/* --- WEB3 BUTONU --- */}
        <button className="btn btn-secondary" onClick={handleMetamaskLogin}>
           <span>🦊</span> Ethereum ile Giriş Yap
        </button>

        <p style={{ fontSize: "12px", marginTop: "20px", color: "#666" }}>
            Hesabın yok mu? <Link to="/register" style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "none" }}>Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;