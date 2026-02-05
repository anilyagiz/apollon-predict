# Draft: Apollon ZK Oracle - Algoran'dan NEAR'a Migration

## Proje Özeti
- **Proje Adı:** Apollon ZK Oracle
- **Mevcut Zincir:** Algorand
- **Hedef Zincir:** NEAR Protocol (Intents veya Geleneksel)
- **Proje Tipi:** ML tabanlı ZK Oracle (DeFi + Privacy)

## Mevcut Mimariden Notlar

### Core Bileşenler
1. **ML Ensemble:** LSTM (35%), GRU (25%), Prophet (25%), XGBoost (15%)
2. **ZK Privacy:** Circom + snarkjs, ~350ms proof generation
3. **Data Sources:** CoinGecko, Binance, CoinLore, Cryptonator
4. **Smart Contracts:** TEAL (approval.teal, clear.teal)
5. **SDKs:** TypeScript/JavaScript + Python
6. **Frontend:** Next.js dashboard

### Migrasyon Gerektiren Dosyalar
- `smart-contracts/algorand/*.teal` → NEAR Rust contracts
- `backend/oracle-core/main.py` (algosdk) → NEAR SDK
- `backend/oracle-core/operations.py` → NEAR contract calls
- SDK'lar → near-api-js / near-api-py
- Frontend → NEAR Wallet Selector

## NEAR Intents Araştırma Bulguları

### NEAR Intents Nedir?
- Intent-based transaction protokolü
- User "ne istediğini" söyler, solver'lar "nasıl yapılacağını" bulur
- 3 temel bileşen: Distribution Channels, Market Makers (Solvers), Verifier Contract

### Intent Akışı
1. Intent oluşturma (kullanıcı/AI)
2. Solver ağında rekabet
3. NEAR Verifier'da doğrulama ve settlement

### Örnek Intent Yapısı
```json
{
  "intent": "token_diff",
  "diff": {
    "nep141:usdc.near": "-100",
    "nep141:usdt.near": "100"
  }
}
```

## Kararlar Alındı (2026-02-04)

### 1. Strateji Seçimi ✅
**SEÇİLEN:** NEAR Intents ile Modern Oracle
- Intent tabanlı mimari
- Solver network entegrasyonu
- Geleceğe yönelik, AI hazır

### 2. ZK Privacy ✅
**SEÇİLEN:** On-chain Verification
- NEAR smart contract'ında Groth16 verifier implementasyonu
- En güvenli yaklaşım
- Kriptografik kanıtlama on-chain

### 3. Timeline ✅
**SEÇİLEN:** 3-4 Ay - Dengeli
- Faz 1: Temel NEAR Intents entegrasyonu (1-2 ay)
- Faz 2: ZK on-chain verification + SDK'lar (1-2 ay)
- Testnet deployment dahil

### 4. SDK Öncelikleri ✅
**SEÇİLEN:** Önce TypeScript SDK
- Frontend entegrasyonu için öncelik
- Sonra Python SDK güncellemesi

### 5. Cross-chain ✅
**SEÇİLEN:** Sadece NEAR
- NEAR ekosistemine odaklanma
- Daha basiz mimari
- Hızlı deployment

### 6. Test Stratejisi ✅
**SEÇİLEN:** Hybrid (Sandbox + Testnet)
- Local sandbox: Geliştirme ve hızlı iterasyon
- NEAR testnet: Integration testing
- En iyi pratik yaklaşım

## Teknik Kararlar

### Smart Contract Mimarisi
- [x] NEAR Rust contracts (near-sdk-rs)
- [x] Intent publisher contract
- [x] ZK Verifier contract (Groth16)
- [x] Verifier Contract entegrasyonu (`intents.near`)

### SDK Design
- [x] near-api-js entegrasyonu
- [x] @defuse-protocol/intents-sdk kullanımı
- [x] Backward compatibility (mümkün olduğunca)

### Frontend Integration
- [x] NEAR Wallet Selector
- [x] Intent submission flow
- [x] ZK proof verification UI

### ZK Proof Sistemi
- [x] Mevcut Circom circuit'ları korunacak
- [x] Groth16 verifier (Rust/WASM)
- [x] Proof format standardization

## Teknik Kararlar (Henüz Alınmadı)

### Smart Contract Mimarisi
- [ ] NEAR contract structure
- [ ] State management pattern
- [ ] Access control (owner/admin)

### SDK Design
- [ ] near-api-js entegrasyonu
- [ ] near-api-py entegrasyonu
- [ ] Backward compatibility

### Frontend Integration
- [ ] NEAR Wallet Selector
- [ ] Transaction flow
- [ ] Error handling

### ZK Proof Sistemi
- [ ] Circom circuit migration (gerekir mi?)
- [ ] Verifier contract (on-chain / off-chain)
- [ ] Proof format standardization

## Varsayılan Değerler (Kullanıcı Onayı Gerektirir)
- **Contract Dili:** Rust (near-sdk-rs)
- **SDK Dili:** TypeScript ve Python (mevcut SDK'ların güncellenmesi)
- **Test Ağı:** NEAR testnet önerilir
- **Deployment:** Progressive (testnet → mainnet)

## Metis Gap Analysis Sonuçları

### Kritik Riskler (Week 1'de Validasyon Gerekli)
1. **ZK Verification Gas Maliyeti**: Full Groth16 verification NEAR gas limitlerine sığar mı?
2. **NEAR Intents Custom Intent Desteği**: Oracle prediction intent'leri destekleniyor mu?
3. **snarkjs → Rust Uyumluluğu**: Proof formatları uyumlu mu?

### Eksik Tanımlar (Planlamada Adreslenmeli)
1. **Intent Semantics**: "Fiyat tahmini iste" mi yoksa "ZK doğrulanmış tahmin iste" mi?
2. **Solver Modeli**: Kendi solver'ınızı mu çalıştıracaksınız, üçüncü taraflar mı?
3. **Token Ekonomisi**: Tahmin için ücret var mı? Solver'lar nasıl ödüllendirilir?
4. **Model Güncelleme**: ML model yeniden eğitildiğinde circuit nasıl güncellenir?

### Guardrails (Kapsam Sınırları)
- **Dahil**: NEAR-only, mevcut 4 model, Circom circuit'ları
- **Hariç**: Multi-chain, yeni ML modelleri, mobil SDK, DAO yönetişimi

### Varsayımlar (Doğrulanmalı)
1. ZK proof'lar snarkjs'ten Rust'a taşınabilir
2. near-api-py yeterli özellikleri destekliyor
3. 3-4 aylık timeline gerçekçi

## Sonraki Adımlar
✅ Kullanıcı kararları alındı
✅ Metis gap analizi tamamlandı
🔄 Detaylı work plan oluşturuluyor
⏳ /start-work ile execution başlatılacak

---
**Son Güncelleme:** 2026-02-04
**Durum:** Plan Generation - Work Plan Oluşturuluyor
