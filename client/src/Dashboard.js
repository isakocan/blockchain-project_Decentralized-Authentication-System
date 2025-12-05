import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null; // Kullanıcı yoksa boş dön

  return (
    <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "Segoe UI" }}>
      <h1>🎉 Hoşgeldin, {user.full_name}!</h1>
      <p style={{ color: "#666" }}>Kimlik doğrulama başarıyla tamamlandı.</p>
      
      <div style={{ 
          marginTop: "20px", 
          padding: "30px", 
          borderRadius: "12px", 
          background: "white", 
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          display: "inline-block",
          textAlign: "left",
          minWidth: "400px"
        }}>
        
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Rol:</strong> <span style={{background:"#eee", padding:"2px 8px", borderRadius:"4px"}}>{user.role}</span></p>
        
        <hr style={{margin: "15px 0", border:"0", borderTop:"1px solid #eee"}}/>

        {/* ŞİFRE İLE GİRENLER İÇİN */}
        {user.password_hash && (
          <div>
            <p style={{fontSize:"12px", color:"#888", marginBottom:"5px"}}>🔑 Password Hash (Güvenli):</p>
            <code style={{background:"#f8f9fa", padding:"5px", display:"block", wordBreak:"break-all", fontSize:"11px"}}>
              {user.password_hash}
            </code>
          </div>
        )}

        {/* CÜZDAN İLE GİRENLER İÇİN */}
        {user.wallet_address && (
          <div>
            <p style={{fontSize:"12px", color:"#888", marginBottom:"5px"}}>🦊 Public Wallet Address:</p>
            <code style={{background:"#f0fdf4", color:"#15803d", padding:"5px", display:"block", wordBreak:"break-all", fontSize:"12px"}}>
              {user.wallet_address}
            </code>
          </div>
        )}

      </div>

      <br /><br />
      
      <button 
        onClick={handleLogout}
        style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight:"600" }}
      >
        Çıkış Yap
      </button>
    </div>
  );
}

export default Dashboard;