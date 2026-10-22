# KPSS İlan Radarı

`kamuilan.sbb.gov.tr` ve Kariyer Kapısı'ndaki kamu personel alımı ilanlarını **senin profiline göre**
puanlayan, şartları otomatik çıkaran ve **hızlı başvuru** yapmanı sağlayan uygulama.

**Veritabanı gerekmez.** Profilin, kriterlerin, ilan havuzun ve başvuru takibin tarayıcının kendi
deposunda (localStorage) tutulur. `npm install && npm run dev` — hepsi bu.

---

## Özellikler

| | |
|---|---|
| **Aday profili** | KPSS puanı + türü + yılı (iki puan desteği), yaş (doğum tarihinden otomatik), cinsiyet, öğrenim seviyesi, bölüm(ler), ehliyet, askerlik, deneyim, sertifikalar, ikamet ili |
| **İş kriterleri** | 81 il + bölge kısayolları, "sadece bu iller / öncelikli / tüm Türkiye", ilan türü, kurum türü, aranan ve hariç kelimeler, min. kadro, son başvuru penceresi, min. uyum skoru — canlı önizleme sayaçlı |
| **Eşleştirme motoru** | KPSS taban puanı/türü/yılı, öğrenim, bölüm, yaş, cinsiyet, ehliyet, deneyim, sertifika, şehir kontenjanı, kapanmış ilan kontrolü → %0-100 uyum skoru + "sağlıyorsun / engel / kontrol et" gerekçeleri |
| **Hızlı mod** | Kart kart ilerleyen, klavye kısayollu karar akışı: `→` atla, `←` kaydet, `3` başvurdum, `D` detay |
| **Tek bakışta inceleme** | Son başvuru geri sayımı, kadro sayısı, KPSS şartı, öğrenim, yaş, şehirler, başvuru yöntemi, kadro dağılımı tablosu, ilandaki önemli şartlar |
| **Belge kontrol listesi** | Genel + ilana özel belgeler otomatik üretilir (diploma, KPSS sonuç belgesi, ehliyet, sertifika, güvenlik soruşturması formu…) ve tikledikçe kaydedilir |
| **Başvuru hattı** | Kaydedildi → İncelendi → Belgeler → Başvuruldu → Sınav → Sonuç (kanban), not, hatırlatma ve sınav tarihi |
| **İlan yapıştır** | Tek bir ilanın metnini yapıştır → tüm şartlar otomatik çıksın |
| **Toplu içe aktarma** | SBB liste sayfasının tamamını yapıştır → 100+ ilan saniyeler içinde havuza eklensin |

## Hızlı başlangıç

```bash
npm install
npm run dev        # http://localhost:3000
```

Üretim derlemesi:

```bash
npm run build && npm run start
```

> Hiçbir ortam değişkeni, veritabanı veya API anahtarı gerekmez.

## İlanlar nereden geliyor?

1. **Hazır veri** (`public/veri/ilanlar.json`): derleme sırasında `scripts/fetch-ilanlar.ts` tarafından
   Kariyer Kapısı'nın resmî RSS beslemesinden (ve erişilebilirse SBB/tam liste uçlarından) üretilir.
   GitHub Actions bunu **6 saatte bir** tazeler.
2. **Toplu içe aktarma**: `kamuilan.sbb.gov.tr` Türkiye dışı IP'leri engellediği için portalın
   *tamamını* (ör. 101 ilan) eklemenin en hızlı yolu → sayfayı tarayıcında aç, `Ctrl+U` → `Ctrl+A` →
   `Ctrl+C`, sonra **İlan yapıştır → Toplu liste içe aktar**. Tamamen tarayıcıda çalışır.
3. **Tek ilan çözümleme**: bir ilanın metnini yapıştır; KPSS, yaş, bölüm, kadro, şehir ve son başvuru
   tarihi otomatik çıkarılsın.
4. **Örnek veri seti**: hiçbir kaynağa erişilemezse uygulama boş kalmaz, "Örnek" rozetli kayıtlarla
   tüm özellikler çalışır.

## GitHub Pages'e yayınlama

```bash
git init && git add -A && git commit -m "KPSS İlan Radarı"
git branch -M main && git remote add origin https://github.com/KULLANICI/DEPO.git
git push -u origin main
```

GitHub'da **Settings → Pages → Source: `GitHub Actions`** seç; iş akışı otomatik yayınlar.
Ayrıntılar: [GITHUB_PAGES.md](./GITHUB_PAGES.md)

## Teknoloji

- **Next.js (App Router) + React + TypeScript + Tailwind CSS v4**
- Veri: tarayıcı `localStorage` (sunucu/veritabanı yok)
- Ayrıştırma: kural tabanlı Türkçe metin motoru (`src/lib/parse.ts`, `src/lib/importer.ts`)
- Eşleştirme: `src/lib/match.ts`
- Kaynaklar: `src/lib/kariyerRss.ts`, `src/lib/kariyerSearch.ts`, `src/lib/sbb.ts`, `src/lib/normalize.ts`
- Mobil: iPhone safe-area, alt sekme çubuğu, 44px dokunma hedefleri, iOS zoom engeli, bottom-sheet detay paneli

## Not

Resmî kaynakların yayımladığı veriler esastır; bu uygulama bir kolaylaştırıcıdır. Başvuru öncesi
ilanın resmî metnini mutlaka kontrol edin.
