const { ethers } = require("ethers");

// 1. SENİN KONTRAT ADRESİN (Doğru olduğundan emin ol)
const CONTRACT_ADDRESS = "0x9846d5238a8bA6B1b963A906AE7172c35bCaE63d";

// 2. RPC PROVIDER (Yedekli Yapı)
// Biri çalışmazsa diğerini deneriz.
const RPC_URL = "https://sepolia.drpc.org";; 
// Alternatifler: "https://eth-sepolia.public.blastapi.io" veya "https://1rpc.io/sepolia"

const CONTRACT_ABI = [
  "function isAdmin(address _wallet) public view returns (bool)",
  "function admin() public view returns (address)" // Adminin kim olduğunu da soralım
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const checkAdminOnChain = async (walletAddress) => {
  try {
    console.log(`\n⛓️ --- ZİNCİR KONTROLÜ BAŞLIYOR ---`);
    console.log(`❓ Sorgulanan Cüzdan: ${walletAddress}`);

    // 1. Kontrattaki Admin Kim? (Onu öğrenelim)
    const realAdmin = await contract.admin();
    console.log(`👑 Kontrattaki Gerçek Admin: ${realAdmin}`);

    // 2. Eşleşiyor mu?
    // Adresleri küçük harfe çevirip kıyaslayalım (Garanti olsun)
    const isMatch = realAdmin.toLowerCase() === walletAddress.toLowerCase();
    
    // 3. Kontrat Fonksiyonunu da deneyelim
    const contractResult = await contract.isAdmin(walletAddress);
    console.log(`📜 Kontrat 'isAdmin' Fonksiyonu Ne Diyor?: ${contractResult}`);

    console.log(`🎯 SONUÇ: ${isMatch ? "ADMİN ONAYLANDI ✅" : "KULLANICI (REDDEDİLDİ) ❌"}`);
    console.log(`------------------------------------\n`);

    return isMatch; 

  } catch (error) {
    console.error("💥 BLOCKCHAIN HATASI:", error.message);
    return false;
  }
};

module.exports = { checkAdminOnChain };