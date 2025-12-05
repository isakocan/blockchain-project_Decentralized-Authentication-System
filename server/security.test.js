const axios = require("axios");
const { ethers } = require("ethers");

// Sunucunun açık olduğundan emin ol (npm run dev)
const BASE_URL = "http://localhost:5000/auth";

// --- YARDIMCI: RASTGELE E-POSTA ÜRETİCİ ---
const generateEmail = (prefix) => `${prefix}_${Date.now()}@test.com`;

// --- YARDIMCI: WEB2 KULLANICISI OLUŞTUR ---
async function createWeb2User(email, password) {
  await axios.post(`${BASE_URL}/register`, {
    full_name: "Test Web2 Victim",
    email: email,
    password: password
  });
  return { email, password };
}

// --- YARDIMCI: WEB3 KULLANICISI OLUŞTUR ---
async function createWeb3User() {
  const wallet = ethers.Wallet.createRandom();
  const address = await wallet.getAddress();
  
  // Kayıt İmzası
  const signature = await wallet.signMessage("InsideBox Kayıt Onayı");
  
  await axios.post(`${BASE_URL}/register`, {
    full_name: "Test Web3 Victim",
    email: generateEmail("web3_victim"),
    wallet_address: address,
    signature: signature
  });
  
  return { wallet, address };
}

// --- YARDIMCI: AKILLI ŞİFRE LİSTESİ ---
function generateSmartPasswordList(email) {
  const username = email.split("@")[0].split("_")[0]; // "victim_123..." -> "victim"
  const capUsername = username.charAt(0).toUpperCase() + username.slice(1);
  return ["123456", "password", username, username + "123", capUsername + "!"];
}


describe("🛡️ GÜVENLİK LABORATUVARI (TAM OTOMASYON)", () => {

  // =================================================================
  // SAHNE 1: AKILLI SÖZLÜK SALDIRISI (Smart Dictionary)
  // Hedef: E-postadan tahmin edilebilir şifre koyan kullanıcı.
  // =================================================================
  test("Sahne 1: Tahmin edilebilir şifre kullanan Web2 hesabı hacklenmeli", async () => {
    // 1. Kurban Oluştur (Şifresi: "Victim!")
    const email = generateEmail("victim");
    const weakPassword = "Victim!"; 
    await createWeb2User(email, weakPassword);

    console.log(`\n🕵️‍♂️ [Sahne 1] Akıllı Saldırı Başlıyor: ${email}`);
    
    // 2. Hacker listeyi hazırlar
    const attackList = generateSmartPasswordList(email);
    let isCracked = false;

    // 3. Saldırı
    for (const pass of attackList) {
      try {
        await axios.post(`${BASE_URL}/login-email`, { email, password: pass });
        isCracked = true; // Hata vermediyse girdi demektir
        console.log(`   ✅ Şifre KIRILDI: "${pass}"`);
        break;
      } catch (e) {}
    }

    expect(isCracked).toBe(true);
  });


  // =================================================================
  // SAHNE 2: VERİ SIZINTISI (Credential Stuffing)
  // Hedef: Başka sitedeki şifresini burada da kullananlar.
  // =================================================================
  test("Sahne 2: Sızdırılan veritabanı ile saldırı", async () => {
    console.log("\n🕵️‍♂️ [Sahne 2] Veri Sızıntısı Saldırısı Başlıyor...");

    // 1. Kurbanları Oluştur
    const web2Email = generateEmail("leaked_web2");
    const web3Email = generateEmail("leaked_web3");
    const leakedPassword = "MyDogName123"; // Sızan şifre

    // Web2 kullanıcısı AYNI şifreyi kullanıyor (Hata!)
    await createWeb2User(web2Email, leakedPassword);
    
    // Web3 kullanıcısı da sızıntıda var ama cüzdan kullanıyor
    const walletUser = ethers.Wallet.createRandom(); // Sadece kayıt olsun diye
    const regSig = await walletUser.signMessage("InsideBox Kayıt Onayı");
    await axios.post(`${BASE_URL}/register`, {
        full_name: "Web3 Leaked", email: web3Email, 
        wallet_address: await walletUser.getAddress(), signature: regSig
    });

    // 2. Hacker'ın Elindeki Sızıntı Listesi
    const leakedDatabase = [
        { email: web2Email, password: leakedPassword }, // Bizim Web2 kurbanı
        { email: web3Email, password: leakedPassword }  // Bizim Web3 kurbanı
    ];

    // 3. Saldırı Başlasın
    let web2Hacked = false;
    let web3Hacked = false;

    for (const row of leakedDatabase) {
        try {
            await axios.post(`${BASE_URL}/login-email`, {
                email: row.email, password: row.password
            });
            // Giriş başarılıysa:
            if (row.email === web2Email) web2Hacked = true;
            if (row.email === web3Email) web3Hacked = true;
        } catch (e) {
             // Web3 kullanıcısı için özel hata mesajını kontrol edelim
             if (row.email === web3Email && e.response?.data?.includes("Cüzdan kullanın")) {
                 console.log("   🛡️ Web3 hesabı korundu: Şifre girişi reddedildi.");
             }
        }
    }

    expect(web2Hacked).toBe(true);  // Web2 hacklenmeli
    expect(web3Hacked).toBe(false); // Web3 hacklenmemeli
  });


  // =================================================================
  // SAHNE 3: PHISHING (OLTALAMA)
  // Hedef: Kullanıcı sahte siteye bilgilerini girer.
  // =================================================================
  test("Sahne 3: Phishing - Çalınan bilgilerle giriş", async () => {
    console.log("\n🎣 [Sahne 3] Phishing Simülasyonu...");

    // 1. Kurbanları Oluştur
    const web2User = await createWeb2User(generateEmail("phish_w2"), "GucluSifre123!");
    const web3User = await createWeb3User(); // Web3 kullanıcısı

    // 2. Sahte Site Fonksiyonu (Simülasyon)
    const fakeSite = (inputEmail, inputPassword) => {
        return { email: inputEmail, password: inputPassword }; // Hacker veriyi çalar
    };

    // 3. Saldırı: Web2 Kullanıcısı
    const stolenDataW2 = fakeSite(web2User.email, web2User.password);
    let w2Hacked = false;
    try {
        await axios.post(`${BASE_URL}/login-email`, stolenDataW2);
        w2Hacked = true;
        console.log("   ❌ Web2 Hesabı Hacklendi (Çalınan şifre ile)");
    } catch (e) {}

    // 4. Saldırı: Web3 Kullanıcısı 
    // (Dalgınlıkla cüzdan şifresini veya rastgele bir şey girdiğini varsayalım)
    const stolenDataW3 = fakeSite("irrelevant_email", "WalletPassword123");
    let w3Hacked = false;
    try {
        // Hacker, Web3 kullanıcısının e-postasıyla (veritabanından bulduğunu varsayalım) deniyor
        await axios.post(`${BASE_URL}/login-email`, {
            email: "irrelevant_email", // Aslında email kontrolünden önce şifre türüne takılacak
            password: stolenDataW3.password
        });
        w3Hacked = true;
    } catch (e) {}

    expect(w2Hacked).toBe(true);
    expect(w3Hacked).toBe(false);
  });


  // =================================================================
  // SAHNE 4: REPLAY ATTACK
  // Hedef: Geçerli bir imzayı tekrar kullanmak.
  // =================================================================
  test("Sahne 4: Replay Attack - Kullanılmış imza geçersiz olmalı", async () => {
    console.log("\n🎬 [Sahne 4] Replay Attack Testi...");

    // 1. Web3 Kullanıcısı Oluştur
    const { wallet, address } = await createWeb3User();

    // 2. Meşru Giriş Yap
    const nonceRes = await axios.post(`${BASE_URL}/nonce`, { wallet_address: address });
    const nonce = nonceRes.data.nonce;
    const message = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${nonce}`;
    const signature = await wallet.signMessage(message);

    await axios.post(`${BASE_URL}/login-wallet`, { wallet_address: address, signature });
    console.log("   ✅ İlk giriş başarılı (Nonce yandı).");

    // 3. Hacker Saldırısı (Aynı imza ile tekrar)
    let replaySuccess = false;
    try {
        await axios.post(`${BASE_URL}/login-wallet`, { wallet_address: address, signature });
        replaySuccess = true;
    } catch (e) {
        if (e.response?.status === 401) {
            console.log("   🛡️ Replay engellendi: İmza artık geçersiz.");
        }
    }

    expect(replaySuccess).toBe(false);
  });


  // =================================================================
  // SAHNE 5: PUBLIC ADRES SAHTECİLİĞİ
  // Hedef: İmzasız veya yanlış imzalı giriş.
  // =================================================================
  test("Sahne 5: Public Adres Sahteciliği - İmzasız giriş engellenmeli", async () => {
    console.log("\n🎭 [Sahne 5] Address Spoofing Testi...");

    const { address } = await createWeb3User();
    const hackerWallet = ethers.Wallet.createRandom(); // Hacker'ın kendi cüzdanı

    // Durum A: İmza Yok
    let noSigSuccess = false;
    try {
        await axios.post(`${BASE_URL}/login-wallet`, { wallet_address: address });
        noSigSuccess = true;
    } catch (e) {}

    // Durum B: Yanlış İmza (Hacker kendi cüzdanıyla imzalıyor)
    let wrongSigSuccess = false;
    try {
        // Hacker nonce'u alıyor (Public bilgi)
        const nonceRes = await axios.post(`${BASE_URL}/nonce`, { wallet_address: address });
        const msg = `InsideBox Güvenli Giriş\n\nBu imza isteği kimliğinizi doğrulamak içindir.\nNonce: ${nonceRes.data.nonce}`;
        
        // Hacker KENDİ anahtarıyla imzalıyor
        const fakeSig = await hackerWallet.signMessage(msg);

        await axios.post(`${BASE_URL}/login-wallet`, { wallet_address: address, signature: fakeSig });
        wrongSigSuccess = true;
    } catch (e) {
        console.log("   🛡️ Sahte imza engellendi (Adres uyuşmazlığı).");
    }

    expect(noSigSuccess).toBe(false);
    expect(wrongSigSuccess).toBe(false);
  });

});