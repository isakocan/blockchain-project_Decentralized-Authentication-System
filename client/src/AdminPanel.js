import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify"; 
import { ethers } from "ethers";
import "./AdminPanel.css";

const CONTRACT_ADDRESS = "0x81005dF7f98830ac673417BB083cD4d1Be0eBE50";

const CONTRACT_ABI = [
  "function addAdmin(address _newAdmin) public",
  "function removeAdmin(address _target) public",
  "function superAdmin() public view returns (address)",
  "function isAdmin(address _wallet) public view returns (bool)"
];

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [currentUserWallet, setCurrentUserWallet] = useState("");
  const [currentUserName, setCurrentUserName] = useState(""); // İsim için state eklendi
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);
  const [processingId, setProcessingId] = useState(null); 
  const [deleteId, setDeleteId] = useState(null);
  const [superAdminAddress, setSuperAdminAddress] = useState(""); 
  
  const navigate = useNavigate();

  // --- SECURITY CHECK ---
  useEffect(() => {
    const init = async () => {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      
      if (!currentUser) {
        navigate("/"); 
        return;
      }
      setCurrentUserWallet(currentUser.wallet_address ? currentUser.wallet_address.toLowerCase() : "");
      setCurrentUserName(currentUser.full_name); // İsmi set et

      try {
        // 1. Initialize Blockchain
        const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        if (!currentUser.wallet_address) throw new Error("No wallet connected");

        // 2. Critical Security Check
        const isRealAdmin = await contract.isAdmin(currentUser.wallet_address);
        
        if (!isRealAdmin) {
            toast.error("⛔ ACCESS DENIED: You are not an admin on-chain!");
            navigate("/dashboard"); 
            return;
        }

        // 3. Fetch Data if Authorized
        await Promise.all([fetchUsers(), fetchSuperAdmin()]);
        
      } catch (err) {
        console.error("Security Check Failed:", err);
        toast.error("Authorization failed.");
        navigate("/");
      } finally {
        setIsCheckingSecurity(false);
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
      console.error("Failed to fetch users");
      toast.error("Could not load user list.");
    }
  };

  const fetchSuperAdmin = async () => {
    try {
        const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const address = await contract.superAdmin();
        setSuperAdminAddress(address.toLowerCase());
    } catch (error) {
        console.error("Super Admin fetch error:", error);
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (error) {
      if (error.code === 4902) toast.error("Sepolia network not found in Metamask!");
    }
  };

  // --- ADMIN ACTIONS ---
  const processAdminAction = async (targetWallet, actionType) => {
    if (!targetWallet) return;
    setProcessingId(targetWallet);

    try {
      await switchToSepolia();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let tx;
      if (actionType === "GRANT") {
        toast.info("🦊 Please sign to GRANT admin rights...");
        tx = await contract.addAdmin(targetWallet);
      } else {
        toast.info("🦊 Please sign to REVOKE admin rights...");
        tx = await contract.removeAdmin(targetWallet);
      }

      const loadingToast = toast.loading("⏳ Waiting for blockchain confirmation...");
      await tx.wait(); 
      toast.dismiss(loadingToast);

      // Sync DB
      const targetLower = targetWallet.toLowerCase();
      await axios.put("http://localhost:5000/admin/sync-role", {
        wallet_address: targetLower,
        role: actionType === "GRANT" ? "admin" : "user"
      });

      // Self-Revoke Handling
      if (actionType === "REVOKE" && targetLower === currentUserWallet) {
        toast.warn("⚠️ You revoked your own rights! Redirecting...");
        const updatedUser = JSON.parse(localStorage.getItem("user"));
        updatedUser.role = 'user';
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setTimeout(() => navigate("/dashboard"), 2000);
        return; 
      }

      toast.success(actionType === "GRANT" ? "🎉 Admin Granted!" : "✅ Rights Revoked!");
      await fetchUsers(); 

    } catch (error) {
      console.error(error);
      if (error.reason) toast.error(`Error: ${error.reason}`);
      else if (error.code === "ACTION_REJECTED") toast.warn("User rejected transaction.");
      else toast.error("Transaction failed.");
    } finally {
      setProcessingId(null);
    }
  };

  // --- DELETE ACTION ---
  const confirmDelete = async () => {
    const userToDelete = users.find(u => u.id === deleteId);
    if (!userToDelete) return;

    const toastId = toast.loading("Deleting user...");

    // If deleting an Admin, remove from Chain first
    if (userToDelete.role === 'admin' && userToDelete.wallet_address) {
        if (userToDelete.wallet_address.toLowerCase() === superAdminAddress) {
            toast.dismiss(toastId);
            toast.error("Cannot delete Super Admin!");
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
          toast.error("Chain transaction failed. Delete cancelled.");
          setDeleteId(null);
          return;
        }
    }

    // DB Delete
    try {
      await axios.delete(`http://localhost:5000/admin/delete/${deleteId}`);
      
      if (userToDelete.wallet_address && userToDelete.wallet_address.toLowerCase() === currentUserWallet) {
         localStorage.clear();
         navigate("/");
         return;
      }
      
      setUsers(users.filter((user) => user.id !== deleteId));
      toast.update(toastId, { render: "🗑️ User deleted.", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.update(toastId, { render: "Delete failed!", type: "error", isLoading: false, autoClose: 3000 });
    } finally {
      setDeleteId(null);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // --- LOADING VIEW ---
  if (isCheckingSecurity) {
    return (
      <div className="admin-container" style={{ textAlign: "center", marginTop: "150px" }}>
        <div className="loader" style={{ width: "40px", height: "40px", margin: "0 auto" }}></div>
        <p style={{ marginTop: "20px", color: "var(--text-muted)" }}>Verifying Blockchain Authority...</p>
      </div>
    );
  }

  // --- HEADER: WELCOME + CROWN LOGIC ---
  const isCurrentSuperAdmin = currentUserWallet === superAdminAddress;

  return (
    <div className="admin-container">
      
      {/* DELETE MODAL */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: 0 }}>Delete User?</h3>
            <p style={{ color: "#94a3b8", margin: "10px 0 20px" }}>This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteId(null)} className="btn btn-sm btn-secondary">Cancel</button>
              <button onClick={confirmDelete} className="btn btn-sm btn-delete">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="admin-header">
        <div className="admin-title">
           {/* Welcome Message with Crown */}
           <h2 style={{ margin: 0, fontSize: "1.8rem", color: "white" }}>
             Welcome, {currentUserName} {isCurrentSuperAdmin && "👑"}
           </h2>
           <p style={{ margin: "5px 0 0", color: "var(--text-muted)" }}>
             🛡️ Governance Panel & User Management
           </p>
        </div>
        <button onClick={handleLogout} className="btn btn-sm btn-delete">Sign Out</button>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Wallet Address</th>
              <th>Password Hash</th> {/* Yeni Sütun */}
              <th>Role</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSuperAdmin = u.wallet_address && u.wallet_address.toLowerCase() === superAdminAddress;
              const isProcessing = processingId === u.wallet_address;

              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: "bold" }}>{u.full_name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{u.email}</div>
                  </td>
                  <td>
                    {u.wallet_address ? (
                      <span className="wallet-font">
                        {u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)}
                        {isSuperAdmin && " 👑"}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#e77e6eff" }}>Password Login</span>
                    )}
                  </td>
                  {/* Password Hash Data */}
                  <td>
                    {u.password_hash ? (
                      <div title={u.password_hash} style={{ 
                        fontFamily: "monospace", 
                        fontSize: "0.75rem", 
                        color: "#64748b", 
                        maxWidth: "100px", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {u.password_hash}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#6ee7b7" }}>Wallet Login</span>
                    )}
                  </td>
                  <td>
                    <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="action-buttons">
                      {/* Grant/Revoke Buttons */}
                      {u.wallet_address && !isSuperAdmin && (
                        u.role === 'admin' ? (
                          <button 
                            className="btn btn-sm btn-revoke"
                            onClick={() => processAdminAction(u.wallet_address, "REVOKE")}
                            disabled={!!processingId}
                          >
                            {isProcessing ? "Processing..." : "Revoke"}
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-grant"
                            onClick={() => processAdminAction(u.wallet_address, "GRANT")}
                            disabled={!!processingId}
                          >
                            {isProcessing ? "Processing..." : "Grant Admin"}
                          </button>
                        )
                      )}

                      {!isSuperAdmin && (
                        <button 
                          className="btn btn-sm btn-delete"
                          onClick={() => setDeleteId(u.id)} 
                          disabled={!!processingId}
                        >
                          Delete
                        </button>
                      )}
                    </div>
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