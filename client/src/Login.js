import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-toastify"; // Toast kütüphanesini çağır
import "./Login.css";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // --- ORTAK BAŞARI FONKSİYONU (AKILLI YÖNLENDİRME) ---
  const loginSuccess = (data) => {
    // Gelen veriyi (Token ve User) kaydet
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    toast.success("🎉 Giriş Başarılı!");

    // ARTIK ADRES DEĞİL, ROL KONTROLÜ YAPIYORUZ
    // Backend zaten Blockchain'e bakıp rolü belirledi ve bize gönderdi.
    if (data.user.role === 'admin') {
      console.log("👑 Admin yetkisi tespit edildi -> Yönetici Paneline gidiliyor.");
      setTimeout(() => navigate("/admin"), 1000);
    } else {
      console.log("👤 Normal kullanıcı -> Dashboard'a gidiliyor.");
      setTimeout(() => navigate("/dashboard"), 1000);
    }
  };

  // --- WEB2 GİRİŞ ---
  const handleEmailLogin = async () => {
    try {
      const response = await axios.post("http://localhost:5000/auth/login-email", {
        email: email,
        password: password
      });
      loginSuccess(response.data);
    } catch (error) {
      console.error(error);
      // Hata bildirimi (Kırmızı)
      toast.error(error.response?.data || "Giriş başarısız!");
    }
  };

  // --- WEB3 GİRİŞ ---
  const handleMetamaskLogin = async () => {
    if (!window.ethereum) return toast.warning("🦊 Lütfen Metamask yükleyin!");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      
      const nonceResponse = await axios.post("http://localhost:5000/auth/nonce", {
        wallet_address: walletAddress
      });
      
      const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${nonceResponse.data.nonce}`;
      
      toast.info("📝 Lütfen Metamask üzerinden imzalayın...");
      const signature = await signer.signMessage(message);

      const loginResponse = await axios.post("http://localhost:5000/auth/login-wallet", {
        wallet_address: walletAddress,
        signature: signature
      });

      loginSuccess(loginResponse.data);

    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 404) {
        toast.error("⚠️ Bu cüzdan kayıtlı değil. Önce kayıt olun!");
      } else {
        toast.error("❌ İşlem iptal edildi veya hata oluştu.");
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