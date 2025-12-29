const { ethers } = require("ethers");

// Configuration
const CONTRACT_ADDRESS = "0x81005dF7f98830ac673417BB083cD4d1Be0eBE50";
const RPC_URL = "https://sepolia.drpc.org"; 

// Minimal ABI (Only what we need)
const CONTRACT_ABI = [
  "function isAdmin(address _wallet) public view returns (bool)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// --- Function: Check On-Chain Admin Status ---
const checkAdminOnChain = async (walletAddress) => {
  try {
    // Direct call to smart contract
    const result = await contract.isAdmin(walletAddress);
    
    console.log(`⛓️ Chain Check (${walletAddress}): ${result ? "AUTHORIZED ✅" : "UNAUTHORIZED ❌"}`);
    return result; 

  } catch (error) {
    console.error("Blockchain Connection Error:", error.message);
    return false; // Default to false on error for safety
  }
};

module.exports = { checkAdminOnChain };