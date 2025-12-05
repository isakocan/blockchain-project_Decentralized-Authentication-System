import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import "./Login.css";

// --- DİKKAT: BURAYA KENDİ CÜZDAN ADRESİNİ YAPIŞTIR ---
const ADMIN_WALLET = "0xa3e5c03ea8473d40f81908724837b93fc56b85ed".toLowerCase(); 

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // --- ORTAK BAŞARI FONKSİYONU (AKILLI YÖNLENDİRME) ---
  const loginSuccess = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Admin Kontrolü
    const currentWallet = data.user.wallet_address ? data.user.wallet_address.toLowerCase() : "";

    if (currentWallet === ADMIN_WALLET) {
      console.log("👑 Admin girişi tespit edildi -> Yönetici Paneline gidiliyor.");
      navigate("/admin");
    } else {
      console.log("👤 Normal kullanıcı girişi -> Dashboard'a gidiliyor.");
      navigate("/dashboard");
    }
  };

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
  const handleMetamaskLogin = async () => {
    if (!window.ethereum) return alert("Metamask yüklü değil!");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const nonceResponse = await axios.post("http://localhost:5000/auth/nonce", {
        wallet_address: walletAddress
      });
      
      const nonce = nonceResponse.data.nonce;
      
      // Profesyonel İmzalama Mesajı
      const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${nonce}`;
      const signature = await signer.signMessage(message);

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
        alert("Giriş işlemi iptal edildi veya hata oluştu.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Giriş Yap</h2>
          <p>Devam etmek için bilgilerinizi girin</p>
        </div>

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