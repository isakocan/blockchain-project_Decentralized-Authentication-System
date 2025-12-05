import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-toastify"; // Toast Eklendi
import "./Login.css";

function Register() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("password");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState(""); 
  const [isConnecting, setIsConnecting] = useState(false);
  // errorMessage state'ini kaldırdık, artık Toast var.

  // --- CÜZDAN BAĞLAMA ---
  const connectWallet = async () => {
    if (!window.ethereum) return toast.warning("🦊 Metamask bulunamadı!");
    
    setIsConnecting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      toast.info("📝 Lütfen kayıt onayını imzalayın...");
      const sig = await signer.signMessage("InsideBox Kayıt Onayı");

      setWalletAddress(address);
      setSignature(sig);
      toast.success("✅ Cüzdan bağlandı ve imzalandı!");

    } catch (err) {
      console.error(err);
      toast.error("❌ Bağlantı veya imza reddedildi.");
      setWalletAddress("");
      setSignature("");
    } finally {
      setIsConnecting(false);
    }
  };

  const resetWallet = () => {
    setWalletAddress("");
    setSignature("");
    toast.info("Bağlantı kesildi.");
  };

  // --- KAYIT OLMA ---
  const handleRegister = async () => {
    // 1. VALIDATION (Frontend)
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return toast.warn("⚠️ Lütfen geçerli bir e-posta girin.");
    }

    if (fullName.trim().length < 3) {
      return toast.warn("⚠️ Ad Soyad en az 3 karakter olmalı.");
    }

    if (activeTab === "password" && password.length < 6) {
      return toast.warn("⚠️ Şifre çok kısa (Min 6 karakter).");
    }

    try {
      let payload = {
        full_name: fullName,
        email: email,
        password: activeTab === "password" ? password : null,
        wallet_address: null,
        signature: null
      };

      if (activeTab === "wallet") {
        if (!walletAddress || !signature) {
           return toast.error("⚠️ Lütfen önce cüzdanı bağlayıp imzalayın.");
        }
        payload.wallet_address = walletAddress;
        payload.signature = signature;
      }

      const response = await axios.post("http://localhost:5000/auth/register", payload);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      toast.success("🎉 Kayıt Başarılı! Yönlendiriliyorsunuz...");
      setTimeout(() => navigate("/dashboard"), 1500);

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || "Kayıt işlemi başarısız.";
      toast.error(msg);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Hesap Oluştur</h2>
          <p>Hemen aramıza katılın</p>
        </div>

        {/* Eski Hata Kutusu Kaldırıldı -> Artık Toast var */}

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }}>
          <button 
            onClick={() => setActiveTab("password")}
            className={activeTab === "password" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ width: "50%", fontSize: "12px" }}
          >
            🔑 Şifre ile
          </button>
          <button 
            onClick={() => setActiveTab("wallet")}
            className={activeTab === "wallet" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ width: "50%", fontSize: "12px" }}
          >
            🦊 Cüzdan ile
          </button>
        </div>

        <div className="form-group">
          <label>Ad Soyad</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Adınız Soyadınız"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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

        {activeTab === "password" ? (
          <div className="form-group">
            <label>Şifre Belirle</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : (
          <div className="form-group">
             <label>Web3 Cüzdanı</label>
             
             {walletAddress ? (
               <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                 <div style={{ flex:1, padding: "12px", background: "#f0fdf4", color: "#15803d", borderRadius: "8px", fontSize: "14px", border: "1px solid #bbf7d0", fontWeight: "600" }}>
                   ✅ Cüzdan Bağlandı
                 </div>
                 <button 
                    onClick={resetWallet}
                    style={{ background:"#fee2e2", color:"#b91c1c", border:"none", borderRadius:"8px", width:"45px", height:"45px", cursor:"pointer", fontSize:"16px" }}
                    title="Bağlantıyı Kes"
                 >
                   ✕
                 </button>
               </div>
             ) : (
               <button 
                 onClick={connectWallet} 
                 className="btn btn-secondary" 
                 style={{ marginTop: "0", opacity: isConnecting ? 0.7 : 1, cursor: isConnecting ? "wait" : "pointer" }}
                 disabled={isConnecting}
               >
                 {isConnecting ? "⏳ Onay Bekleniyor..." : "🦊 Cüzdanımı Bağla"}
               </button>
             )}
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: "20px" }} onClick={handleRegister}>
            Kayıt Ol
        </button>

        <p style={{ fontSize: "12px", marginTop: "20px", color: "#666" }}>
          Zaten hesabın var mı? <Link to="/" style={{ color: "#3b82f6", cursor: "pointer", textDecoration: "none" }}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;