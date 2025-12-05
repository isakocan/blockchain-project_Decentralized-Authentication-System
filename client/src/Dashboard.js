import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { ethers } from "ethers";

// BURAYA KENDİ CÜZDAN ADRESİNİ YAPIŞTIR
const ADMIN_WALLET = "0xa3e5c03ea8473d40f81908724837b93fc56b85ed".toLowerCase();

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  
  // Form State'leri
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [switchPassword, setSwitchPassword] = useState(""); // Yöntem değişimi için şifre

  const isAdmin = user?.wallet_address?.toLowerCase() === ADMIN_WALLET;

  const handleLogout = () => {
    toast.info("👋 Çıkış yapılıyor...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setTimeout(() => navigate("/"), 1000);
  };

  // --- A. PROFİL GÜNCELLEME ---
  const updateProfile = async () => {
    try {
      const response = await axios.put("http://localhost:5000/user/update-info", {
        id: user.id, full_name: fullName, email
      });
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      toast.success("✅ Profil bilgileri güncellendi.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Güncelleme hatası");
    }
  };

  // --- B. GÜVENLİK FONKSİYONLARI ---

  // 1. Şifre Yenileme (Mevcut Yöntemde Kal)
  const changePassword = async () => {
    try {
      const response = await axios.post("http://localhost:5000/user/change-password", {
        id: user.id, password: newPassword
      });
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setNewPassword("");
      toast.success("🔑 Şifreniz başarıyla değiştirildi.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Hata oluştu");
    }
  };

  // 2. Cüzdan Yenileme (Mevcut Yöntemde Kal)
  const changeWallet = async () => {
    if (!window.ethereum) return toast.warning("🦊 Metamask yok!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      toast.info("📝 Yeni cüzdanı doğrulamak için imzalayın...");
      const signature = await signer.signMessage("InsideBox Cüzdan Güncelleme");

      const response = await axios.post("http://localhost:5000/user/change-wallet", {
        id: user.id, wallet_address: address, signature
      });
      
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      toast.success("🦊 Cüzdan adresiniz güncellendi!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Hata oluştu");
    }
  };

  // 3. Cüzdana Geçiş Yap (Yöntem Değiştir)
  const switchToWallet = async () => {
    if (!window.ethereum) return toast.warning("🦊 Metamask yok!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      toast.info("📝 Geçiş için imzalayın...");
      const signature = await signer.signMessage("InsideBox Kimlik Değişimi");

      const response = await axios.post("http://localhost:5000/user/switch-to-wallet", {
        id: user.id, wallet_address: address, signature
      });

      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      toast.success("🎉 Başarıyla Cüzdan girişine geçildi!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Hata oluştu");
    }
  };

  // 4. Şifreye Geçiş Yap (Yöntem Değiştir)
  const switchToPassword = async () => {
    try {
      const response = await axios.post("http://localhost:5000/user/switch-to-password", {
        id: user.id, password: switchPassword
      });

      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setSwitchPassword("");
      toast.success("🎉 Başarıyla Şifre girişine geçildi!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Hata oluştu");
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI", maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* --- ÜST KISIM --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1>🎉 Hoşgeldin, {user.full_name}!</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          {isAdmin && (
            <button onClick={() => navigate("/admin")} style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
              🛡️ Yönetici Paneli
            </button>
          )}
          <button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* --- IZGARA DÜZENİ (GRID) --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        
        {/* 1. PROFİL KARTI */}
        <div style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#1e293b", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>👤 Profil Bilgileri</h3>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>ID</label>
            <input type="text" value={user.id} disabled style={{ width: "100%", padding: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#94a3b8" }} />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Ad Soyad</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
          </div>

          <button onClick={updateProfile} style={{ width: "100%", padding: "10px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            Bilgileri Güncelle
          </button>
        </div>

        {/* 2. GÜVENLİK KARTI (DİNAMİK) */}
        <div style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#1e293b", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>🛡️ Güvenlik & Yöntem</h3>

          {user.password_hash ? (
            // --- SENARYO A: ŞİFRELİ KULLANICI ---
            <>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Şifre Değiştir</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="password" placeholder="Yeni şifreniz" 
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} 
                  />
                  <button onClick={changePassword} style={{ padding: "10px 15px", background: "#0f172a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Güncelle</button>
                </div>
              </div>

              <div style={{ background: "#eff6ff", padding: "15px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <h4 style={{ margin: "0 0 5px 0", color: "#1e40af" }}>🦊 Cüzdana Geçiş Yap</h4>
                <p style={{ fontSize: "12px", color: "#60a5fa", marginBottom: "10px" }}>Şifreli giriş iptal edilecek, sadece cüzdanla girebileceksiniz.</p>
                <button onClick={switchToWallet} style={{ width: "100%", padding: "10px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                  Cüzdanı Bağla ve Geç
                </button>
              </div>
            </>
          ) : (
            // --- SENARYO B: CÜZDANLI KULLANICI ---
            <>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Aktif Cüzdan</label>
                <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "6px", border: "1px solid #bbf7d0", color: "#166534", fontSize: "12px", wordBreak: "break-all", marginBottom: "10px" }}>
                  {user.wallet_address}
                </div>
                <button onClick={changeWallet} style={{ width: "100%", padding: "10px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                  Farklı Cüzdan Tanımla
                </button>
              </div>

              <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 5px 0", color: "#475569" }}>🔑 Şifreye Geçiş Yap</h4>
                <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>Cüzdan silinecek, belirleyeceğiniz şifre ile gireceksiniz.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="password" placeholder="Yeni şifre belirle" 
                    value={switchPassword} onChange={(e) => setSwitchPassword(e.target.value)}
                    style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} 
                  />
                  <button onClick={switchToPassword} style={{ padding: "10px 15px", background: "#475569", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Geçiş Yap</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;