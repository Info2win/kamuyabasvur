# GitHub Pages'e Yayınlama

Uygulama **veritabanı kullanmaz**: profil, kriterler, ilan havuzu, başvuru takibi ve belge listeleri
tarayıcının kendi deposunda (localStorage) tutulur. Bu yüzden GitHub Pages gibi tamamen statik bir
barındırmada olduğu gibi çalışır — sunucu, `.env`, API anahtarı gerekmez.

## 1) Yayına alma (3 adım)

```bash
git init && git add -A && git commit -m "KPSS İlan Radarı"
git branch -M main
git remote add origin https://github.com/KULLANICI/DEPO.git
git push -u origin main
```

1. GitHub'da **Settings → Pages → Build and deployment → Source: `GitHub Actions`** seç.
2. **Actions** sekmesinde `GitHub Pages'e Yayınla` iş akışı otomatik çalışır (push ile).
3. Site: `https://KULLANICI.github.io/DEPO/`

> `basePath` depo adından **otomatik** türetilir (`scripts/build-pages.sh`).
> `KULLANICI.github.io` depolarında kök alan adı kullanıldığı için basePath boş kalır.
> Elle belirtmek istersen: `PAGES_BASE_PATH="/depom" bash scripts/build-pages.sh`

## 2) Yerelde statik derlemeyi deneme

```bash
bash scripts/build-pages.sh      # out/ üretir (önce ilan verisini çeker)
npx serve out                    # http://localhost:3000
```

Betik sırasıyla:
1. `npx tsx scripts/fetch-ilanlar.ts` → `public/veri/ilanlar.json` üretir (ağ yoksa örnek veri yazar).
2. `src/app/api` dizinini geçici olarak taşır (statik dışa aktarımda API ucu olamaz), derleme bitince geri koyar.
3. `DEPLOY_TARGET=github-pages` ile `next build` → `out/` (yalnızca statik dosyalar).
4. `out/.nojekyll` oluşturur.

## 3) İlan verisi nasıl tazelenir?

- `.github/workflows/deploy-pages.yml` her push'ta ve **6 saatte bir** (cron `17 */6 * * *`) çalışır,
  veriyi yeniden çekip siteyi yayınlar.
- Elle tetikleme: **Actions → GitHub Pages'e Yayınla → Run workflow**.
- Derleme günlüğünde kaynak durumu görünür, örn:
  `[fetch-ilanlar] 30 ilan yazıldı (sbb:blocked, tam-liste:error, rss:ok)`

`kamuilan.sbb.gov.tr` ve `api.kariyerkapisi.gov.tr` yurt dışı IP'lerini (GitHub Actions dahil)
engellediği için CI'da güvenilir kaynak **Kariyer Kapısı resmî RSS** beslemesidir (son ~30-32 ilan).

## 4) Portalın tamamını (ör. 101 ilan) ekleme

Uygulamada **İlan yapıştır → Toplu liste içe aktar**:

1. Tarayıcında `https://kamuilan.sbb.gov.tr/` adresini aç.
2. `Ctrl+U` (kaynağı görüntüle) → `Ctrl+A` → `Ctrl+C`. (Kaynağı açmak istemezsen sayfada `Ctrl+A` + `Ctrl+C` de çalışır.)
3. Uygulamaya yapıştır → **Tümünü içe aktar**.

Bu işlem tamamen tarayıcıda çalışır; sunucu, CORS veya vekil gerekmez. Kurum adı, kadro sayısı,
"14 Ekim - 28 Ekim" biçimindeki son başvuru tarihleri ve şehirler otomatik çıkarılır. Aynı listeyi
tekrar yapıştırırsan kayıtlar güncellenir, çoğalmaz.

## 5) İsteğe bağlı: tarayıcıdan canlı çekim (CORS vekili)

Ana paneldeki **Kaynak ayarları** bölümünden bir vekil seçebilirsin (`allorigins.win`, `codetabs.com`
veya kendi vekilin). Vekiller güvenilmez olabilir; **kapalı bırakmak önerilir** — hazır JSON + yapıştırma
zaten yeterlidir.

## 6) Bilinen sınırlar

- Veriler tarayıcıda tutulur: farklı cihaz/tarayıcı arasında senkronize olmaz, site verileri
  temizlenirse kaybolur. (Ana panel → Kaynak ayarları → **Örnek verilerle sıfırla**.)
- Kariyer Kapısı'nın resmî **detay ucu** POST + CORS gerektirdiği için tarayıcıdan çağrılamaz.
  Bunun yerine ilan kartındaki **"Metni yapıştır"** ile ilan metnini verirsen tüm şartlar otomatik çıkar.

## 7) Ortam değişkenleri (hepsi isteğe bağlı)

| Değişken | Açıklama |
|---|---|
| `DEPLOY_TARGET=github-pages` | `output: "export"` ile statik derleme |
| `PAGES_BASE_PATH` | Pages alt yolu (ör. `/kpss-ilan-radari`); boş = kök |
| `NEXT_PUBLIC_BASE_PATH` | İstemcinin `veri/ilanlar.json` isteğinde kullanılır |
| `SKIP_FETCH=1` | Derlemede ilan verisini yeniden çekme |
| `KARIYER_RSS_URL` / `SBB_ILAN_URL` / `KARIYER_API_URL` | Kaynak adreslerini değiştirmek istersen |
