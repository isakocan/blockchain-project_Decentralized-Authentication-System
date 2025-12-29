const { ethers } = require("ethers");

// 1. YENİ KONTRAT ADRESİN (Deploy ettiğin 0x477... ile başlayan adres)
const CONTRACT_ADDRESS = "0x81005dF7f98830ac673417BB083cD4d1Be0eBE50";

// 2. RPC PROVIDER
const RPC_URL = "https://sepolia.drpc.org"; 

// 3. YENİ ABI (AccessControl Kontratına Uygun)
// Eski 'admin()' fonksiyonu yok, artık sadece 'isAdmin()' var.
const CONTRACT_ABI = [
  "function isAdmin(address _wallet) public view returns (bool)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const checkAdminOnChain = async (walletAddress) => {
  try {
    // YENİ MANTIK: Direkt kontrata "Bu kişi admin mi?" diye soruyoruz.
    // Yeni kontratın 'isAdmin' fonksiyonu true veya false döner.
    const result = await contract.isAdmin(walletAddress);
    
    console.log(`⛓️ Zincir Kontrolü (${walletAddress}): ${result ? "YETKİLİ ✅" : "YETKİSİZ ❌"}`);
    return result; 

  } catch (error) {
    console.error("Blockchain Bağlantı Hatası:", error.message);
    // Hata varsa (örneğin kontrat adresi yanlışsa) false dön
    return false; 
  }
};

module.exports = { checkAdminOnChain };