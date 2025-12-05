import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import "./Login.css";

function Register() {
  const navigate = useNavigate();

  // --- HAFIZA (State) ---
  const [activeTab, setActiveTab] = useState("password");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Cüzdan Durumları
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState(""); // YENİ: İmzayı burada saklayacağız
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); 

  // --- 1. CÜZDAN BAĞLAMA VE İMZALAMA ---
  const connectWallet = async () => {
    if (!window.ethereum) return setErrorMessage("Metamask bulunamadı!");
    
    setIsConnecting(true); // Yükleniyor...
    setErrorMessage("");   

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // KRİTİK DEĞİŞİKLİK: İmzayı burada, bağlanırken alıyoruz
      // Bu işlem kullanıcı onay verene kadar bekler (await)
      const sig = await signer.signMessage("InsideBox Kayıt Onayı");

      // Onay verildiyse bilgileri kaydet
      setWalletAddress(address);
      setSignature(sig); // İmzayı sakla

    } catch (err) {
      console.error(err);
      // Kullanıcı iptal ederse veya hata olursa
      setErrorMessage("Bağlantı veya İmza reddedildi.");
      setWalletAddress(""); // Temizle
      setSignature("");     // Temizle
    } finally {
      setIsConnecting(false); // Yüklenme bitti
    }
  };

  // --- 2. CÜZDAN SIFIRLAMA ---
  const resetWallet = () => {
    setWalletAddress("");
    setSignature(""); // İmzayı da sil
    setErrorMessage("");
  };

  // --- 3. KAYIT OLMA ---
  const handleRegister = async () => {
    setErrorMessage("");

    try {
      let payload = {
        full_name: fullName,
        email: email,
        password: activeTab === "password" ? password : null,
        wallet_address: null,
        signature: null
      };

      if (activeTab === "wallet") {
        // Hem adres hem imza var mı kontrol et
        if (!walletAddress || !signature) {
           return setErrorMessage("Lütfen önce cüzdanınızı bağlayıp imzalayın.");
        }
        
        // Zaten connectWallet içinde aldığımız imzayı kullanıyoruz
        payload.wallet_address = walletAddress;
        payload.signature = signature;
      }

      const response = await axios.post("http://localhost:5000/auth/register", payload);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/dashboard");

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || "Kayıt işlemi başarısız.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Hesap Oluştur</h2>
          <p>Hemen aramıza katılın</p>
        </div>

        {/* Hata Mesajı */}
        {errorMessage && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "15px", textAlign:"left" }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Tab Butonları */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center" }}>
          <button 
            onClick={() => {setActiveTab("password"); setErrorMessage("");}}
            className={activeTab === "password" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ width: "50%", fontSize: "12px" }}
          >
            🔑 Şifre ile
          </button>
          <button 
            onClick={() => {setActiveTab("wallet"); setErrorMessage("");}}
            className={activeTab === "wallet" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ width: "50%", fontSize: "12px" }}
          >
            🦊 Cüzdan ile
          </button>
        </div>

        {/* Form Alanları */}
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