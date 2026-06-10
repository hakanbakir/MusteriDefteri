# Müşteri Defteri

Müşteri bazlı satış/tahsilat/iade işlemlerini yöneten, dashboard grafikleri, sıralanabilir tablolar, kullanıcı yönetimi, yedekleme ve Excel dışa/içe aktarma özelliklerine sahip bir masaüstü uygulaması.

Backend: **Go** + **net/http** (Wails kullanılmaz)  
Frontend: **React 18** + **TypeScript** + **Vite 5** + **Tailwind CSS 3**  
Pencere: **WebView2** (edge Chromium, Win32 API)  
Veritabanı: **SQLite** (modernc.org/sqlite, CGO gerektirmez)

---

## İçindekiler

- [Özellikler](#özellikler)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Geliştirme](#geliştirme)
- [Derleme](#derleme)
- [Test Verisi](#test-verisi)
- [Proje Yapısı](#proje-yapısı)
- [Kullanıcılar](#kullanıcılar)
- [Veritabanı](#veritabanı)
- [Yedekleme](#yedekleme)
- [Teknik Detaylar](#teknik-detaylar)
- [Lisans](#lisans)

---

## Özellikler

- **Dashboard** — Günlük/Aylık satış ve tahsilat grafikleri (SVG bar chart), tarih aralıklı işlem tablosu, sıralama, sayfalama
- **Müşteri Yönetimi** — Ekleme, düzenleme, silme (4 haneli onay kodu ile), arama (ünvan/telefon)
- **Satış / Tahsilat / İade** — Müşteri bazlı işlem girişi, bakiye kontrollü (negatif bakiye önlenir)
- **Kullanıcı Yönetimi** — Admin/kullanici rolleri, giriş/çıkış, "Beni Hatırla" ile otomatik giriş
- **İşletme Bilgileri** — İşletme adı ve logosu ayarlanabilir, yazdırma çıktılarında görünür
- **Yedekleme** — Manuel yedek, DB + Excel çıktısı
- **Excel Dışa Aktar** — Tüm müşteriler/hareketler Excel dosyasına aktarılır (excelize)
- **Excel İçe Aktar** — Dosya seç → çift kayıt kontrolü → onay → veritabanına yaz
- **Log Sistemi** — Tüm CRUD işlemleri kayıt altına alınır (sadece admin görür)
- **Koyu Tema** — Açık/koyu tema desteği
- **Sayfalama** — 30/50/70/100 kayıt/sayfa seçeneği
- **Yazdırma** — Dashboard işlem raporu ve müşteri kartı PDF çıktısı

---

## Gereksinimler

- [Go](https://go.dev/dl/) >= 1.21
- [Node.js](https://nodejs.org/) >= 18
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 11'de yerleşik, Windows 10'da genelde mevcut)
- Windows 10/11 (x64)

---

## Kurulum

```powershell
# Repoyu klonlayın
git clone <repo-url>
cd cari

# Frontend bağımlılıklarını yükleyin
cd arayuz
npm install
cd ..
```

---

## Geliştirme

### Frontend geliştirme (Browser)

```powershell
cd arayuz
npm run dev
```

`http://127.0.0.1:5173/` adresine gidin. Frontend, `wailsVarMi` kontrolü ile mock veri kullanır (Go backend olmadan çalışır).

### Tam uygulama (backend + pencere)

```powershell
go run .
```

Backend `:8080` portunda HTTP sunucusu başlatır ve WebView2 penceresi açar.

---

## Derleme

### Otomatik derleme (versiyon artırma dahil)

```powershell
.\build.ps1
```

- `version.txt` dosyasındaki patch numarasını 1 artırır
- Frontend build alır (`VITE_APP_VERSION` ortam değişkeni ile)
- Go binary derler (`-H=windowsgui` ile terminal penceresi gizlenir)
-   Çıktı: `build\bin\MusteriDefteri.exe`
-   İkon: `rcedit` ile build sonrası EXE'ye eklenir (otomatik indirilir)

### Manuel derleme

```powershell
# Frontend
cd arayuz
npm run build
cd ..

# Backend
go build -ldflags "-s -w -H=windowsgui" -o build/bin/MusteriDefteri.exe .
```

### Seed verisi derleme

```powershell
go build -o build\bin\seed.exe .\cmd\seed\
```

---

## Test Verisi

`build\bin\seed.exe` çalıştırıldığında:
- 500 müşteri (A'dan Z'ye sıralı harflerle başlayan ünvanlar)
- Her müşteriye 10 işlem (ilki satış, sonrası rastgele tahsilat/iade)
- Tarihler 2023'ten günümüze rastgele
- Tahsilat/iade tutarı mevcut bakiyeyi aşmaz

Kullanım:

```powershell
# Önce mevcut DB'yi temizleyin
Remove-Item build\bin\musteri_defteri.db*

# Seed verisini çalıştırın
.\build\bin\seed.exe
```

---

## Proje Yapısı

```
cari/
├── main.go                    # HTTP sunucu + WebView2 pencere başlatma
├── api.go                     # JSON API endpoint'leri (ServeHTTP)
├── app.go                     # Uygulama metodları (CRUD, yedek, export/import)
├── window.go                  # Win32 pencere + WebView2 Chromium gömme
├── go.mod / go.sum            # Go bağımlılıkları
├── modeller/
│   └── modeller.go            # Veri modelleri (Cari, Hareket, Kullanici, Log, vb.)
├── depolar/
│   └── sqlite_depo.go         # SQLite veritabanı işlemleri
├── servisler/
│   ├── ticari_servis.go       # İş mantığı katmanı
│   └── yedek.go               # Yedekleme + Excel export/import
├── veritabani/
│   └── baglanti.go            # SQLite bağlantısı
├── hatalar/
│   └── hatalar.go             # Hata tanımları
├── cmd/
│   └── seed/
│       └── main.go            # Test verisi oluşturucu
├── build/
│   ├── bin/                   # Derleme çıktıları
│   └── ...
├── build.ps1                  # Otomatik derleme scripti (versiyon artırma)
├── version.txt                # Mevcut sürüm numarası
└── arayuz/                    # React frontend
    ├── src/
    │   ├── App.tsx            # Ana uygulama (tüm sayfalar + bileşenler)
    │   ├── main.tsx           # React giriş noktası
    │   ├── servisler/
    │   │   └── api.ts         # API katmanı (fetch('/api/...') çağrıları)
    │   ├── bilesenler/
    │   │   ├── Yardimcilar.tsx  # Ortak bileşenler (Panel, paraFormat, IkonButon)
    │   │   └── gpl.ts         # GNU GPL v3 lisans metni
    │   └── turler/
    │       └── index.ts       # TypeScript interfaceleri
    ├── index.html
    └── package.json
```

---

## Kullanıcılar

Varsayılan kullanıcı (ilk çalıştırmada otomatik oluşturulur):

| Kullanıcı Adı | Şifre  | Rol    | Açıklama               |
|---------------|--------|--------|------------------------|
| admin         | admin  | admin  | Tam yetkili kullanıcı  |

- **admin**: Kullanıcı ekleme/silme, log görüntüleme, tüm şifreleri değiştirme
- **kullanici**: Sadece kendi şifresini değiştirme
- Yeni kullanıcılar admin tarafından eklenir
- Şifreler SHA-256 hash ile saklanır

---

## Veritabanı

SQLite dosyası: `build\bin\musteri_defteri.db` (EXE ile aynı klasörde)

Tablolar:
- **cari_hesaplar** — Müşteri bilgileri (ünvan, telefon, e-posta, adres, bakiye)
- **cari_hareketler** — Tüm finansal hareketler (borç/alacak kayıtları)
- **satislar** — Satış belgeleri
- **alislar** — İade belgeleri
- **kullanicilar** — Kullanıcı hesapları (SHA-256 hash)
- **loglar** — İşlem log kayıtları
- **ayarlar** — Uygulama ayarları (yedek, silme kodu, işletme adı/logosu)

WAL modu kullanılır (`PRAGMA journal_mode = WAL`). Yedekleme öncesinde `Checkpoint` çağrılarak WAL dosyası veritabanına flaşlanır, böylece son işlemlerin kaybolması önlenir.

---

## Yedekleme

- **Manuel**: "Yedek Al" butonu ile anlık yedek alınır
- **Yedek dosyaları**: `musteri_defteri_<zaman>.db` + `musteri_defteri_<zaman>.xlsx`
- **Klasör**: Varsayılan EXE yanında `yedek/`, kullanıcı tarafından değiştirilebilir
- **Saklama**: 10/20/30/40/50/sınırsız yedek seçeneği (eski yedekler otomatik silinir)
- Excel dosyaları `excelize/v2` kütüphanesi ile oluşturulur
- Açılışta yedek ayarlarına bağlı olarak otomatik yedek alınabilir
- Geri yükleme: Excel dosyası seçilir, çift kayıt kontrolü yapılır, onay ile veritabanına aktarılır

---

## Teknik Detaylar

- **Backend**: Go + net/http (Wails kullanılmaz)
- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS 3
- **Pencere**: Win32 API + WebView2 (edge.Chromium)
- **Veritabanı**: SQLite (modernc.org/sqlite, CGO gerektirmez)
- **Excel**: excelize/v2 (Go tarafında okuma/yazma)
- **Grafik**: SVG bar chart (harici kütüphane yok)
- **PDF**: jspdf + jspdf-autotable (frontend tarafında)
- **İkonlar**: lucide-react
- **Mimari**: 3 katmanlı (depo → servis → app → HTTP API → frontend)

### API

Tüm backend işlemleri `http://localhost:8080/api/<metot>` adresine `POST` isteği ile yapılır. İstek gövdesi JSON, yanıt `{ "data": ..., "hata": "..." }` formatındadır.

### Güvenlik

- Şifreler SHA-256 hash ile saklanır (salt kullanılmaz)
- Kullanıcı oturumu `localStorage`'da saklanır
- Müşteri silme işlemi 4 haneli onay kodu gerektirir
- İşlemler transaction ile yürütülür

### Önemli Kurallar

- Müşteri borcu negatif olamaz (frontend + backend doğrulama)
- Tahsilat/iade tutarı mevcut borcu aşamaz
- Müşteri silinirken ilişkili tüm kayıtlar transaction ile silinir
- Loglar sadece admin rolündeki kullanıcılar görebilir
- Yedek her zaman DB + XLSX üretir

---

## Lisans

Bu proje **GNU General Public License v3.0** ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.
