import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify"; 

// BURAYA KENDİ CÜZDAN ADRESİNİ YAPIŞTIR
const ADMIN_WALLET = "0xa3e5c03ea8473d40f81908724837b93fc56b85ed".toLowerCase();

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteId, setDeleteId] = useState(null); // Silinecek ID'yi tutan hafıza
  
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const currentWallet = currentUser?.wallet_address ? currentUser.wallet_address.toLowerCase() : "";

    if (currentWallet !== ADMIN_WALLET) {
      toast.error("⛔ Yetkisiz Giriş!");
      navigate("/"); 
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
      console.error(error);
      toast.error("Veri çekilemedi.");
    }
  };

  // --- 1. SİL BUTONUNA BASINCA ---
  const askDelete = (id) => {
    setDeleteId(id); // Silinecek kişiyi seç ve kutuyu aç
  };

  // --- 2. KUTUDAN "EVET" DEYİNCE ---
  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/admin/delete/${deleteId}`);
      setUsers(users.filter((user) => user.id !== deleteId));
      toast.success("🗑️ Kullanıcı başarıyla silindi.");
      setDeleteId(null); // Kutuyu kapat
    } catch (error) {
      console.error(error);
      toast.error("Silme işlemi başarısız.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.info("Çıkış yapıldı.");
    navigate("/");
  };

  if (!isAdmin) return null;

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI", maxWidth: "1100px", margin: "0 auto" }}>
      
      {/* --- ÖZEL ONAY KUTUSU (MODAL) --- */}
      {deleteId && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)", // Arka planı karart
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", width: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Emin misiniz?</h3>
            <p style={{ color: "#64748b" }}>Bu kullanıcıyı (ID: {deleteId}) kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.</p>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button 
                onClick={() => setDeleteId(null)} // İptal
                style={{ padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}
              >
                İptal
              </button>
              <button 
                onClick={confirmDelete} // Onayla
                style={{ padding: "10px 20px", background: "#ef4444", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "white" }}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------- */}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e293b" }}>🛡️ Yönetici Paneli</h1>
          <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>
            Toplam Kullanıcı: <strong>{users.length}</strong>
          </p>
        </div>
        
        <button 
          onClick={handleLogout}
          style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
        >
          Çıkış Yap
        </button>
      </div>

      <div style={{ overflowX: "auto", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", textTransform: "uppercase", fontSize: "12px" }}>
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
                <td style={{ padding: "16px", fontWeight: "600", color: "#334155" }}>{u.full_name}</td>
                <td style={{ padding: "16px", color: "#475569" }}>{u.email}</td>
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
                  <button 
                    onClick={() => askDelete(u.id)} // askDelete fonksiyonunu çağırdık
                    style={{ background: "white", border: "1px solid #fee2e2", color: "#ef4444", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
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