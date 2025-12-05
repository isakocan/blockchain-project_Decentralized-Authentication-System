import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// BURAYA KENDİ CÜZDAN ADRESİNİ YAPIŞTIR
const ADMIN_WALLET = "0xa3e5c03ea8473d40f81908724837b93fc56b85ed".toLowerCase();

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Yetki Kontrolü
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const currentWallet = currentUser?.wallet_address ? currentUser.wallet_address.toLowerCase() : "";

    if (currentWallet !== ADMIN_WALLET) {
      navigate("/"); // Admin değilse direkt ana sayfaya at
    } else {
      setIsAdmin(true);
      fetchUsers();
    }
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/admin/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    }
  };

  // --- SİLME İŞLEMİ ---
  const handleDelete = async (id) => {
    // Tarayıcıdan onay iste
    if (!window.confirm("Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
      // Backend'e silme emri gönder
      await axios.delete(`http://localhost:5000/admin/delete/${id}`);
      
      // Tabloyu güncelle (Silinen kişiyi listeden çıkar)
      setUsers(users.filter((user) => user.id !== id));
      
    } catch (error) {
      console.error(error);
      alert("Silme işlemi sırasında hata oluştu.");
    }
  };

  // --- ÇIKIŞ İŞLEMİ ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!isAdmin) return null;

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI", maxWidth: "1100px", margin: "0 auto" }}>
      {/* BAŞLIK VE ÇIKIŞ BUTONU */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e293b" }}>🛡️ Yönetici Paneli</h1>
          <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>
            Toplam Kullanıcı Sayısı: <strong>{users.length}</strong>
          </p>
        </div>
        
        <button 
          onClick={handleLogout}
          style={{ 
            padding: "10px 20px", 
            background: "#ef4444", 
            color: "white", 
            border: "none", 
            borderRadius: "8px", 
            cursor: "pointer", 
            fontWeight: "600",
            display: "flex", alignItems: "center", gap: "5px"
          }}
        >
          Çıkış Yap
        </button>
      </div>

      {/* TABLO */}
      <div style={{ overflowX: "auto", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.5px" }}>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>ID</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Ad Soyad</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>E-posta</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Password Hash</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Cüzdan Adresi</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "16px", color: "#94a3b8" }}>#{u.id}</td>
                
                <td style={{ padding: "16px", fontWeight: "600", color: "#334155" }}>
                  {u.full_name}
                </td>
                
                <td style={{ padding: "16px", color: "#475569" }}>
                  {u.email}
                </td>

                <td style={{ padding: "16px", fontFamily: "monospace", fontSize: "12px" }}>
                  {u.password_hash ? (
                    <span style={{ color: "#ef4444", background: "#fef2f2", padding: "4px 8px", borderRadius: "4px" }}>
                        {u.password_hash.substring(0, 10)}...
                    </span>
                  ) : (
                    <span style={{ color: "#cbd5e1" }}>NULL</span> 
                  )}
                </td>

                <td style={{ padding: "16px", fontFamily: "monospace", color: "#64748b", fontSize: "12px" }}>
                  {u.wallet_address ? u.wallet_address : "-"}
                </td>

                <td style={{ padding: "16px", textAlign: "center" }}>
                  {/* SİLME BUTONU */}
                  <button 
                    onClick={() => handleDelete(u.id)}
                    style={{ 
                      background: "white", 
                      border: "1px solid #fee2e2", 
                      color: "#ef4444", 
                      padding: "6px 12px", 
                      borderRadius: "6px", 
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                    title="Kullanıcıyı Sil"
                  >
                    🗑️ Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPanel;