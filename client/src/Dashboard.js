import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { ethers } from "ethers";
import "./Dashboard.css"; // ARTIK KENDİ CSS DOSYASINI KULLANIYOR

function Dashboard() {
  const navigate = useNavigate();
  
  // State'i localStorage'dan güvenli başlatma
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Form States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");

  const isAdmin = user?.role === 'admin';

  // Güvenlik: Kullanıcı yoksa at
  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  const handleLogout = () => {
    toast.info("Logging out...");
    localStorage.clear();
    setTimeout(() => navigate("/"), 1000);
  };

  // --- Functions ---

  const updateProfile = async () => {
    try {
      const response = await axios.put("http://localhost:5000/user/update-info", {
        id: user.id, full_name: fullName, email
      });
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed.");
    }
  };

  const changePassword = async () => {
    try {
      const response = await axios.post("http://localhost:5000/user/change-password", {
        id: user.id, password: newPassword
      });
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setNewPassword("");
      toast.success("Password changed successfully.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change password.");
    }
  };

  const changeWallet = async () => {
    if (!window.ethereum) return toast.warning("Metamask not found!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      toast.info("Please sign to confirm new wallet...");
      const signature = await signer.signMessage("InsideBox Cüzdan Güncelleme");

      const response = await axios.post("http://localhost:5000/user/change-wallet", {
        id: user.id, wallet_address: address, signature
      });
      
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      toast.success("Wallet updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Wallet update failed.");
    }
  };

  const switchToWallet = async () => {
    if (!window.ethereum) return toast.warning("Metamask not found!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      toast.info("Please sign to switch login method...");
      const signature = await signer.signMessage("InsideBox Kimlik Değişimi");

      const response = await axios.post("http://localhost:5000/user/switch-to-wallet", {
        id: user.id, wallet_address: address, signature
      });

      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      toast.success("Switched to Wallet login!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Switch failed.");
    }
  };

  const switchToPassword = async () => {
    try {
      const response = await axios.post("http://localhost:5000/user/switch-to-password", {
        id: user.id, password: switchPassword
      });

      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setSwitchPassword("");
      toast.success("Switched to Password login!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Switch failed.");
    }
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      
      {/* HEADER */}
      <div className="dashboard-header">
        <div className="welcome-text">
          <h1>Welcome back, {user.full_name}</h1>
        </div>
        <button onClick={handleLogout} className="btn btn-danger" style={{ width: "auto" }}>
          Sign Out
        </button>
      </div>

      {/* ADMIN BANNER */}
      {isAdmin && (
        <div className="admin-banner">
          <div className="admin-content">
            <h3>🛡️ Administrator Access</h3>
            <p>You have elevated privileges to manage users and roles.</p>
          </div>
          <button onClick={() => navigate("/admin")} className="admin-btn">
            Open Admin Panel →
          </button>
        </div>
      )}

      {/* GRID */}
      <div className="dashboard-grid">
        
        {/* LEFT: PROFILE */}
        <div className="glass-card">
          <div className="card-header">
            <span>👤</span> Profile Information
          </div>
          
          <div className="input-group">
            <label className="input-label">User ID (Immutable)</label>
            <input type="text" className="input-field" value={user.id} disabled />
          </div>

          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <button onClick={updateProfile} className="btn btn-primary">
            Save Changes
          </button>
        </div>

        {/* RIGHT: SECURITY */}
        <div className="glass-card">
          <div className="card-header">
            <span>🔐</span> Security Method
          </div>

          {user.password_hash ? (
            // PASSWORD USER
            <>
              <div style={{ marginBottom: "30px" }}>
                <label className="input-label">Update Password</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button onClick={changePassword} className="btn btn-secondary" style={{ width: "auto" }}>Save</button>
                </div>
              </div>

              <div className="divider"><span>SWITCH TO WEB3</span></div>

              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "15px" }}>
                  Connect your wallet to login without a password.
                </p>
                <button onClick={switchToWallet} className="btn btn-primary">
                   🦊 Connect Wallet
                </button>
              </div>
            </>
          ) : (
            // WALLET USER
            <>
              <div style={{ marginBottom: "30px" }}>
                <label className="input-label">Active Wallet</label>
                <div className="wallet-badge" style={{marginBottom: "10px"}}>
                  <span style={{ fontFamily: "monospace" }}>{user.wallet_address}</span>
                </div>
                <button onClick={changeWallet} className="btn btn-secondary">
                  Change Wallet
                </button>
              </div>

              <div className="divider"><span>SWITCH TO WEB2</span></div>

              <div>
                <label className="input-label">Set Password</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="New password"
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                  />
                  <button onClick={switchToPassword} className="btn btn-primary" style={{ width: "auto" }}>Set</button>
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