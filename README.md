# Mağaza Sitesi (Deneme Sürümü)

Kız kardeşinin ürünlerini satabileceği basit bir sipariş sitesi + admin paneli.
Şimdilik senin bilgisayarında (yerel sunucu olarak) çalışacak şekilde kuruldu.

## Neler var?

- **Müşteri sitesi** (`/`): Ürünleri görüntüleme, hesap oluşturma/giriş yapma, sepete
  ürün ekleme, sipariş verme, "Siparişlerim" sekmesinden geçmiş siparişleri görme.
- **Admin paneli** (`/admin`): Ürün ekleme/düzenleme/silme (fotoğraflı), gelen
  siparişleri görme ve durumunu güncelleme (Yeni → Hazırlanıyor → Kargoda →
  Tamamlandı). **Yeni bir sipariş geldiğinde admin panele anında (canlı) bildirim,
  ses ve sayaç düşer** — sayfayı yenilemek gerekmez.
- Veriler bilgisayarındaki `shop-data.json` dosyasında tutulur (ekstra bir
  veritabanı kurmana gerek yok). Yedek almak için bu dosyayı ve `public/uploads` klasörünü kopyalaman yeterli.

## Kurulum (Windows - en kolay yol)

1. Zip'i bir klasöre çıkar.
2. **`kur.bat`** dosyasına çift tıkla. Node.js yoksa kendisi kurmaya çalışır,
   sonra gerekli paketleri indirir. (Visual Studio / C++ gibi bir şey gerekmez.)
3. **`baslat.bat`** dosyasına çift tıkla. Sunucu açılır ve tarayıcıda site otomatik
   açılır. Admin paneli: `http://localhost:3000/admin`

Siteyi açık tutmak için `baslat.bat` penceresi açık kalmalı.

Elle çalıştırmak istersen: `npm install` sonra `npm start`.

## Admin paneline giriş

Varsayılan bilgiler (`.env` dosyasında değiştirmediysen):
- Kullanıcı adı: `admin`
- Şifre: `admin123`

> Bu bilgiler sadece **veri dosyası ilk defa oluşturulurken** kullanılır. Şifreyi
> değiştirmek istersen: sunucuyu durdur, `.env` dosyasındaki `ADMIN_PASS`
> değerini değiştir, `shop-data.json` dosyasını sil, sonra `baslat.bat` ile tekrar
> başlat (dikkat: bu, önceki ürün/sipariş verilerini de siler — test aşamasında
> sorun olmaz).

## Telefondan girmek (kardeşin ve müşteriler için)

Site şu an sadece **aynı WiFi ağındaki** cihazlardan erişilebilir (bilgisayarın
açık ve sunucu çalışır durumda olmalı):

1. Bilgisayarının yerel ağ IP adresini bul:
   - Windows: `ipconfig` yaz, "IPv4 Address" satırına bak (örn. `192.168.1.24`)
   - Mac: Sistem Ayarları → Ağ, ya da terminalde `ipconfig getifaddr en0`
2. Telefon **aynı WiFi'a** bağlıyken tarayıcıdan şunu aç:
   ```
   http://<bilgisayarinin-ip-adresi>:3000
   ```
   Admin paneli için sonuna `/admin` ekle.
3. Açılmıyorsa büyük ihtimalle Windows Güvenlik Duvarı 3000 portunu
   engelliyordur — ilk bağlantıda çıkan izin penceresine "izin ver" demen
   yeterli olur.

Bu, **test/deneme aşaması** için uygun bir kurulum. Siteyi gerçek müşterilere
7/24 açık tutmak istediğinizde (bilgisayarın kapalıyken de site açık kalsın
istersen), bir hosting servisine taşımak gerekir — o zaman yardımcı olabilirim.

## Ürün ekleme

Kod ile uğraşmana gerek yok — admin panelinden (`/admin` → Ürünler → **+ Yeni
Ürün**) fotoğraf, isim, açıklama, fiyat ve stok girerek ürün ekleyebilirsin.
Örnek olarak eklenen 2 test ürününü silip kendi ürünlerinizi ekleyebilirsiniz.

## Proje yapısı (ileride değişiklik istersen diye)

```
server.js         → sunucunun ana dosyası
store.js          → veri dosyası (shop-data.json) yönetimi ve ilk kurulum
routes/           → API uçları (auth, products, orders, admin)
public/           → müşteri sitesi (index.html, css, js)
public/admin/     → admin paneli
public/uploads/   → yüklenen ürün fotoğrafları
```

## Not

Bu kurulum test/geliştirme amaçlıdır (oturum bilgileri sunucu belleğinde
tutulur). Site büyüyüp gerçek satışa geçtiğinde daha kalıcı bir kuruluma
(gerçek hosting + kalıcı oturum deposu) geçmek iyi olur — o noktaya gelince
tekrar yazabilirsin.
