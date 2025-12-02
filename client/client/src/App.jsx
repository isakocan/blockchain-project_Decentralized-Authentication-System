// client/client/src/App.jsx

import { useState } from 'react';
import { ethers } from 'ethers'; // Cüzdanla konuşmak için
import './App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState(""); // Giriş yapan kullanıcının adresi
  const [status, setStatus] = useState(""); // Ekrana bilgi mesajları yazmak için

  /**
   * Cüzdanı Bağla ve Giriş Yap Fonksiyonu
   * İşleyiş Sırası:
   * 1. Metamask'a bağlan.
   * 2. Sunucudan rastgele sayı (Nonce) iste.
   * 3. Bu sayıyı Metamask ile imzala (Şifre yerine imza).
   * 4. İmzayı sunucuya gönder ve sonucu bekle.
   */
  async function connectWallet() {
    // Tarayıcıda Metamask var mı kontrol et
    if (!window.ethereum) {
      alert("Lütfen önce Metamask eklentisini kurun!");
      return;
    }

    try {
      setStatus("Cüzdana bağlanılıyor...");
      
      // Metamask ile bağlantı kuruyoruz
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(); // İmzayı atacak kişi (Sen)
      const address = await signer.getAddress(); // Senin cüzdan adresin
      
      setWalletAddress(address);
      setStatus(`Bağlandı: ${address}. Giriş yapılıyor...`);

      // ADIM 1: Backend'den rastgele sayı (Nonce) iste
      const responseNonce = await fetch(`http://localhost:3000/nonce/${address}`);
      const dataNonce = await responseNonce.json();
      const nonce = dataNonce.nonce;

      // ADIM 2: Mesajı Hazırla ve İmzala
      // Bu işlem sırasında Metamask penceresi açılır ve onay ister.
      const message = `Sisteme giris yapiyorum. Tek kullanimlik kodum: ${nonce}`;
      const signature = await signer.signMessage(message);

      setStatus("İmza atıldı, sunucu kontrol ediyor...");

      // ADIM 3: İmzayı ve Adresi Backend'e gönder
      const responseVerify = await fetch('http://localhost:3000/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature })
      });

      const dataVerify = await responseVerify.json();

      // ADIM 4: Sonucu Kontrol Et
      if (dataVerify.success) {
        setStatus("✅ GİRİŞ BAŞARILI! Hoşgeldiniz.");
        alert("Tebrikler! Şifresiz, sadece imza ile giriş yaptınız.");
      } else {
        setStatus("❌ HATA: Giriş yapılamadı. " + dataVerify.error);
      }

    } catch (error) {
      console.error("Bir hata oluştu:", error);
      setStatus("Hata: " + error.message);
    }
  }

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Şifresiz Giriş Projesi (SIWE)</h1>
      
      {!walletAddress ? (
        // Eğer giriş yapılmadıysa butonu göster
        <button onClick={connectWallet} style={{ fontSize: "20px", padding: "10px 20px", cursor: "pointer" }}>
          🦊 Metamask ile Giriş Yap
        </button>
      ) : (
        // Giriş yapıldıysa bilgileri göster
        <div>
          <h3>Aktif Cüzdan: {walletAddress}</h3>
          <p style={{ fontSize: "18px", fontWeight: "bold", color: "green" }}>{status}</p>
        </div>
      )}
    </div>
  );
}

export default App;