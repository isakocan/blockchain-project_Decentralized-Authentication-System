import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify"; 
import { ethers } from "ethers";

// Kontrat Adresin
const CONTRACT_ADDRESS = "0x81005dF7f98830ac673417BB083cD4d1Be0eBE50";

// ABI
const CONTRACT_ABI = [
  "function addAdmin(address _newAdmin) public",
  "function removeAdmin(address _target) public",
  "function superAdmin() public view returns (address)",
  "function isAdmin(address _wallet) public view returns (bool)"
];

// Dönen Çark
const Spinner = () => (
  <svg style={{ animation: "spin 1s linear infinite", height: "14px", width: "14px", marginRight: "5px" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </svg>
);

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [currentUserWallet, setCurrentUserWallet] = useState(""); 
  
  // Yükleme durumu (Güvenlik kontrolü için)
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  const [processingId, setProcessingId] = useState(null); 
  const [deleteId, setDeleteId] = useState(null);
  const [superAdminAddress, setSuperAdminAddress] = useState(""); 
  
  const navigate = useNavigate();

  // --- GÜVENLİK VE VERİ YÜKLEME ---
  useEffect(() => {
    const init = async () => {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      
      // 1. Basit Kontrol: Giriş yapmış mı?
      if (!currentUser) {
        navigate("/"); 
        return;
      }
      setCurrentUserWallet(currentUser.wallet_address ? currentUser.wallet_address.toLowerCase() : "");

      try {
        // 2. KRİTİK GÜVENLİK KONTROLÜ (Blockchain)
        // Hacker veritabanını aşsa bile burada takılır.
        const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        // Eğer cüzdan adresi yoksa direkt at
        if (!currentUser.wallet_address) {
            throw new Error("Cüzdan adresi yok");
        }

        const isRealAdmin = await contract.isAdmin(currentUser.wallet_address);
        
        if (!isRealAdmin) {
            toast.error("⛔ ZİNCİR ONAYI REDDEDİLDİ: Bu alana erişim yetkiniz yok!");
            navigate("/dashboard"); // Sahte admini dashboard'a geri gönder
            return;
        }

        // 3. Gerçekten adminse verileri çekmeye başla
        await Promise.all([fetchUsers(), fetchSuperAdmin()]);
        
      } catch (err) {
        console.error("Güvenlik hatası:", err);
        toast.error("Yetki doğrulanamadı.");
        navigate("/");
      } finally {
        setIsCheckingSecurity(false); // Yükleme ekranını kaldır
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/admin/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Kullanıcı listesi alınamadı.");
    }
  };

  const fetchSuperAdmin = async () => {
    try {
        const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const address = await contract.superAdmin();
        setSuperAdminAddress(address.toLowerCase());
    } catch (error) {
        console.error("Super Admin Error:", error);
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (error) {
      if (error.code === 4902) toast.error("Sepolia ağı ekli değil!");
    }
  };

  // --- YETKİ VERME / ALMA ---
  const processAdminAction = async (targetWallet, actionType) => {
    if (!targetWallet) return;
    setProcessingId(targetWallet);

    try {
      await switchToSepolia();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // 1. ZİNCİR İŞLEMİ
      let tx;
      if (actionType === "GRANT") {
        toast.info("🦊 Yetki veriliyor... Lütfen imzalayın.");
        tx = await contract.addAdmin(targetWallet);
      } else {
        toast.info("🦊 Yetki alınıyor... Lütfen imzalayın.");
        tx = await contract.removeAdmin(targetWallet);
      }

      const loadingToast = toast.loading("⏳ Zincir onayı bekleniyor...");
      await tx.wait(); 
      toast.dismiss(loadingToast);

      // 2. VERİTABANI GÜNCELLEME (Backend'deki LOWER düzeltmesine güveniyoruz)
      const targetLower = targetWallet.toLowerCase();
      
      await axios.put("http://localhost:5000/admin/sync-role", {
        wallet_address: targetLower,
        role: actionType === "GRANT" ? "admin" : "user"
      });

      // 3. KENDİ YETKİMİZİ Mİ ALDIK?
      if (actionType === "REVOKE" && targetLower === currentUserWallet) {
        toast.warn("⚠️ Kendi yetkini aldın! Çıkış yapılıyor...");
        
        // LocalStorage'ı güncelle
        const updatedUser = JSON.parse(localStorage.getItem("user"));
        updatedUser.role = 'user';
        localStorage.setItem("user", JSON.stringify(updatedUser));

        setTimeout(() => navigate("/dashboard"), 2000);
        return; 
      }

      toast.success(actionType === "GRANT" ? "🎉 Yetki Verildi!" : "✅ Yetki Alındı!");
      await fetchUsers(); 

    } catch (error) {
      console.error(error);
      if (error.reason) toast.error(`Hata: ${error.reason}`);
      else if (error.response) toast.error(`DB Hatası: ${error.response.data.error}`);
      else if (error.code === "ACTION_REJECTED") toast.warn("İşlem reddedildi.");
      else toast.error("Hata oluştu.");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = async () => {
    const userToDelete = users.find(u => u.id === deleteId);
    if (!userToDelete) return;

    const toastId = toast.loading("Silme işlemi yapılıyor...");

    if (userToDelete.role === 'admin' && userToDelete.wallet_address) {
        if (userToDelete.wallet_address.toLowerCase() === superAdminAddress) {
            toast.dismiss(toastId);
            toast.error("Süper Admin silinemez.");
            setDeleteId(null);
            return;
        }

        try {
          await switchToSepolia();
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          
          const tx = await contract.removeAdmin(userToDelete.wallet_address);
          await tx.wait();
        } catch (err) {
          toast.dismiss(toastId);
          toast.error("Zincir işlemi iptal edildi.");
          setDeleteId(null);
          return;
        }
    }

    try {
      await axios.delete(`http://localhost:5000/admin/delete/${deleteId}`);
      if (userToDelete.wallet_address && userToDelete.wallet_address.toLowerCase() === currentUserWallet) {
         localStorage.clear();
         navigate("/");
         return;
      }
      
      setUsers(users.filter((user) => user.id !== deleteId));
      toast.update(toastId, { render: "🗑️ Kullanıcı silindi.", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, { render: "Silme hatası!", type: "error", isLoading: false, autoClose: 3000 });
    } finally {
      setDeleteId(null);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // YÜKLENİYOR EKRANI (Güvenlik Kontrolü Sırasında Gözükür)
  if (isCheckingSecurity) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <Spinner />
        <p style={{ marginTop: "10px", color: "#666" }}>🔐 Admin yetkisi zincir üzerinden doğrulanıyor...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* SİLME MODALI */}
      {deleteId && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", width: "400px", textAlign: "center" }}>
            <h3 style={{ marginTop: 0 }}>Kullanıcı Silinecek</h3>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "10px 20px", borderRadius: "8px", border: "none" }}>İptal</button>
              <button onClick={confirmDelete} style={{ padding: "10px 20px", background: "#ef4444", color: "white", borderRadius: "8px", border: "none" }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
           <h1 style={{ margin: 0 }}>🛡️ Yönetici Paneli</h1>
           {superAdminAddress && <p style={{fontSize: "12px", color: "#666", marginTop:"5px"}}>👑 Süper Admin: {superAdminAddress.slice(0,6)}...{superAdminAddress.slice(-4)}</p>}
        </div>
        <button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px" }}>Çıkış</button>
      </div>

      {/* TABLO */}
      <div style={{ overflowX: "auto", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
              <th style={{ padding: "16px" }}>Ad Soyad</th>
              <th style={{ padding: "16px" }}>Cüzdan</th>
              <th style={{ padding: "16px" }}>Rol</th>
              <th style={{ padding: "16px", textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSuperAdmin = u.wallet_address && u.wallet_address.toLowerCase() === superAdminAddress;
              const isProcessing = processingId === u.wallet_address;

              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px", fontWeight: "600" }}>{u.full_name}</td>
                  <td style={{ padding: "16px", fontFamily: "monospace", color: "#64748b" }}>
                    {u.wallet_address ? (
                      <>{u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)} {isSuperAdmin && " (👑)"}</>
                    ) : "-"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
                      background: u.role === 'admin' ? "#dcfce7" : "#f1f5f9",
                      color: u.role === 'admin' ? "#166534" : "#64748b"
                    }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    {u.wallet_address && !isSuperAdmin && (
                      u.role === 'admin' ? (
                        <button 
                          onClick={() => processAdminAction(u.wallet_address, "REVOKE")}
                          disabled={!!processingId}
                          style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#b45309", padding: "6px 12px", borderRadius: "6px", cursor: processingId ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                        >
                          {isProcessing ? <><Spinner /> İşleniyor</> : "⬇️ Yetki Al"}
                        </button>
                      ) : (
                        <button 
                          onClick={() => processAdminAction(u.wallet_address, "GRANT")}
                          disabled={!!processingId}
                          style={{ background: "#dbeafe", border: "1px solid #3b82f6", color: "#1d4ed8", padding: "6px 12px", borderRadius: "6px", cursor: processingId ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                        >
                          {isProcessing ? <><Spinner /> İşleniyor</> : "👑 Yetki Ver"}
                        </button>
                      )
                    )}
                    <button onClick={() => setDeleteId(u.id)} disabled={!!processingId} style={{ background: "white", border: "1px solid #fee2e2", color: "#ef4444", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>🗑️ Sil</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPanel;