package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"cari/depolar"
	"cari/modeller"
	"cari/servisler"
	"cari/veritabani"
)

type Uygulama struct {
	ctx         context.Context
	servis      *servisler.TicariServis
	kapat       func() error
	baslatma    error
	currentUser string
}

func paraFormat(tutar float64) string {
	s := fmt.Sprintf("%.2f", tutar)
	parts := strings.Split(s, ".")
	intPart := parts[0]
	var buf strings.Builder
	for i, c := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			buf.WriteByte('.')
		}
		buf.WriteRune(c)
	}
	return buf.String() + "," + parts[1]
}

func YeniUygulama() (*Uygulama, error) {
	db, kapat, err := veritabani.Baglan()
	if err != nil {
		return nil, err
	}
	depo := depolar.YeniSQLiteDepo(db)
	return &Uygulama{servis: servisler.YeniTicariServis(depo), kapat: kapat}, nil
}

func (u *Uygulama) dbYolu() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	return filepath.Join(filepath.Dir(exe), "musteri_defteri.db")
}

func (u *Uygulama) durum() error {
	return u.baslatma
}

func (u *Uygulama) DashboardGetir(baslangic, bitis string) (modeller.Dashboard, error) {
	if err := u.durum(); err != nil {
		return modeller.Dashboard{}, err
	}
	return u.servis.DashboardGetir(u.ctx, baslangic, bitis)
}

func (u *Uygulama) CarileriListele(arama string, sayfa int, limit int, sirala string, yon string) (modeller.SayfaliSonuc[modeller.CariHesap], error) {
	if err := u.durum(); err != nil {
		return modeller.SayfaliSonuc[modeller.CariHesap]{}, err
	}
	return u.servis.CarileriListele(u.ctx, arama, sayfa, limit, sirala, yon)
}

func (u *Uygulama) CariGetir(id int64) (modeller.CariHesap, error) {
	if err := u.durum(); err != nil {
		return modeller.CariHesap{}, err
	}
	return u.servis.CariGetir(u.ctx, id)
}

func (u *Uygulama) CariKaydet(cari modeller.CariHesap) (modeller.CariHesap, error) {
	if err := u.durum(); err != nil {
		return modeller.CariHesap{}, err
	}
	var onceki modeller.CariHesap
	if cari.ID != 0 {
		onceki, _ = u.servis.CariGetir(u.ctx, cari.ID)
	}
	sonuc, err := u.servis.CariKaydet(u.ctx, cari)
	if err == nil {
		if cari.ID != 0 {
			var farklar []string
			alanlar := map[string]func(modeller.CariHesap) string{
				"Ünvan":    func(c modeller.CariHesap) string { return c.Unvan },
				"Telefon":  func(c modeller.CariHesap) string { return c.Telefon },
				"E-posta":  func(c modeller.CariHesap) string { return c.Eposta },
				"Vergi No": func(c modeller.CariHesap) string { return c.VergiNo },
				"Adres":    func(c modeller.CariHesap) string { return c.Adres },
				"Notlar":   func(c modeller.CariHesap) string { return c.Notlar },
			}
			for ad, fn := range alanlar {
				if fn(cari) != fn(onceki) {
					farklar = append(farklar, ad)
				}
			}
			detay := sonuc.Unvan
			if len(farklar) > 0 {
				detay += " (" + strings.Join(farklar, ", ") + ")"
			}
			u.servis.LogKaydet(u.ctx, u.currentUser, "Müşteri Düzenlendi", detay)
		} else {
			u.servis.LogKaydet(u.ctx, u.currentUser, "Müşteri Eklendi", sonuc.Unvan)
		}
	}
	return sonuc, err
}

func (u *Uygulama) CariSil(id int64) error {
	if err := u.durum(); err != nil {
		return err
	}
	c, _ := u.servis.CariGetir(u.ctx, id)
	err := u.servis.CariSil(u.ctx, id)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Müşteri Silindi", c.Unvan)
	}
	return err
}

func (u *Uygulama) CariHareketleriListele(cariID int64) ([]modeller.CariHareket, error) {
	if err := u.durum(); err != nil {
		return nil, err
	}
	return u.servis.CariHareketleriListele(u.ctx, cariID)
}

func (u *Uygulama) CariHareketOlustur(hareket modeller.CariHareket) (modeller.CariHareket, error) {
	if err := u.durum(); err != nil {
		return modeller.CariHareket{}, err
	}
	sonuc, err := u.servis.CariHareketOlustur(u.ctx, hareket)
	if err == nil {
		islemAdi := "Tahsilat Yapıldı"
		if sonuc.BelgeTuru == "İade" {
			islemAdi = "İade Yapıldı"
		}
		c, _ := u.servis.CariGetir(u.ctx, sonuc.CariID)
		unvan := c.Unvan
		if unvan == "" {
			unvan = fmt.Sprintf("CariID: %d", sonuc.CariID)
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, islemAdi, unvan+" "+paraFormat(sonuc.Tutar)+" TL")
	}
	return sonuc, err
}

func (u *Uygulama) CariHareketSil(id int64) error {
	if err := u.durum(); err != nil {
		return err
	}
	h, _ := u.servis.CariHareketGetir(u.ctx, id)
	err := u.servis.CariHareketSil(u.ctx, id)
	if err == nil {
		detay := fmt.Sprintf("ID: %d", id)
		if h.CariUnvan != "" {
			detay = h.CariUnvan
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "Borç Kaydı Silindi", detay)
	}
	return err
}

func (u *Uygulama) CariHareketGuncelle(hareket modeller.CariHareket) (modeller.CariHareket, error) {
	if err := u.durum(); err != nil {
		return modeller.CariHareket{}, err
	}
	sonuc, err := u.servis.CariHareketGuncelle(u.ctx, hareket)
	if err == nil {
		c, _ := u.servis.CariGetir(u.ctx, sonuc.CariID)
		unvan := c.Unvan
		if unvan == "" {
			unvan = fmt.Sprintf("CariID: %d", sonuc.CariID)
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "Borç Kaydı Düzenlendi", unvan+" "+paraFormat(sonuc.Tutar)+" TL")
	}
	return sonuc, err
}

func (u *Uygulama) SatislariListele(arama string, sayfa int, limit int) (modeller.SayfaliSonuc[modeller.Satis], error) {
	if err := u.durum(); err != nil {
		return modeller.SayfaliSonuc[modeller.Satis]{}, err
	}
	return u.servis.SatislariListele(u.ctx, arama, sayfa, limit)
}

func (u *Uygulama) SatisOlustur(satis modeller.Satis) (modeller.Satis, error) {
	if err := u.durum(); err != nil {
		return modeller.Satis{}, err
	}
	sonuc, err := u.servis.SatisOlustur(u.ctx, satis)
	if err == nil {
		c, _ := u.servis.CariGetir(u.ctx, sonuc.CariID)
		unvan := c.Unvan
		if unvan == "" {
			unvan = fmt.Sprintf("CariID: %d", sonuc.CariID)
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "Satış Oluşturuldu", unvan+" "+paraFormat(sonuc.Toplam)+" TL")
	}
	return sonuc, err
}

func (u *Uygulama) SatisIptalEt(id int64) error {
	if err := u.durum(); err != nil {
		return err
	}
	s, _ := u.servis.SatisGetir(u.ctx, id)
	err := u.servis.SatisIptalEt(u.ctx, id)
	if err == nil {
		detay := fmt.Sprintf("SatisID: %d", id)
		if s.CariUnvan != "" {
			detay = s.CariUnvan
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "Satış İptal Edildi", detay)
	}
	return err
}

func (u *Uygulama) AlislariListele(arama string, sayfa int, limit int) (modeller.SayfaliSonuc[modeller.Alis], error) {
	if err := u.durum(); err != nil {
		return modeller.SayfaliSonuc[modeller.Alis]{}, err
	}
	return u.servis.AlislariListele(u.ctx, arama, sayfa, limit)
}

func (u *Uygulama) AlisOlustur(alis modeller.Alis) (modeller.Alis, error) {
	if err := u.durum(); err != nil {
		return modeller.Alis{}, err
	}
	sonuc, err := u.servis.AlisOlustur(u.ctx, alis)
	if err == nil {
		c, _ := u.servis.CariGetir(u.ctx, sonuc.CariID)
		unvan := c.Unvan
		if unvan == "" {
			unvan = fmt.Sprintf("CariID: %d", sonuc.CariID)
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "İade Oluşturuldu", unvan+" "+paraFormat(sonuc.Toplam)+" TL")
	}
	return sonuc, err
}

func (u *Uygulama) AlisIptalEt(id int64) error {
	if err := u.durum(); err != nil {
		return err
	}
	a, _ := u.servis.AlisGetir(u.ctx, id)
	err := u.servis.AlisIptalEt(u.ctx, id)
	if err == nil {
		detay := fmt.Sprintf("AlisID: %d", id)
		if a.CariUnvan != "" {
			detay = a.CariUnvan
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "İade İptal Edildi", detay)
	}
	return err
}

func (u *Uygulama) SilmeKoduGetir() (string, error) {
	if err := u.durum(); err != nil {
		return "", err
	}
	return u.servis.AyarGetir(u.ctx, "silme-kodu")
}

func (u *Uygulama) KullaniciGiris(kullaniciAdi, sifre string) (modeller.Kullanici, error) {
	if err := u.durum(); err != nil {
		return modeller.Kullanici{}, err
	}
	k, err := u.servis.KullaniciGiris(u.ctx, kullaniciAdi, sifre)
	if err == nil {
		u.currentUser = k.KullaniciAdi
		u.servis.LogKaydet(u.ctx, u.currentUser, "Giriş Yapıldı", k.KullaniciAdi)
	}
	return k, err
}

func (u *Uygulama) KullaniciCikis() error {
	if err := u.durum(); err != nil {
		return err
	}
	u.servis.LogKaydet(u.ctx, u.currentUser, "Çıkış Yapıldı", u.currentUser)
	u.currentUser = ""
	return nil
}

func (u *Uygulama) KullaniciDogrula(kullaniciAdi string) (modeller.Kullanici, error) {
	if err := u.durum(); err != nil {
		return modeller.Kullanici{}, err
	}
	k, err := u.servis.KullaniciDogrula(u.ctx, kullaniciAdi)
	if err == nil {
		u.currentUser = k.KullaniciAdi
	}
	return k, err
}

func (u *Uygulama) KullaniciListele() ([]modeller.Kullanici, error) {
	if err := u.durum(); err != nil {
		return nil, err
	}
	return u.servis.KullaniciListele(u.ctx)
}

func (u *Uygulama) KullaniciEkle(k modeller.Kullanici) (modeller.Kullanici, error) {
	if err := u.durum(); err != nil {
		return modeller.Kullanici{}, err
	}
	sonuc, err := u.servis.KullaniciEkle(u.ctx, k)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Kullanıcı Eklendi", sonuc.KullaniciAdi)
	}
	return sonuc, err
}

func (u *Uygulama) KullaniciSil(id int64) error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.KullaniciSil(u.ctx, id)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Kullanıcı Silindi", fmt.Sprintf("ID: %d", id))
	}
	return err
}

func (u *Uygulama) KullaniciSifreDegistir(id int64, yeniSifre string) error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.KullaniciSifreDegistir(u.ctx, id, yeniSifre)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Şifre Değiştirildi", fmt.Sprintf("Kullanıcı ID: %d", id))
	}
	return err
}

func (u *Uygulama) AyarGetir(anahtar string) (string, error) {
	if err := u.durum(); err != nil {
		return "", err
	}
	return u.servis.AyarGetir(u.ctx, anahtar)
}

func (u *Uygulama) AyarKaydet(anahtar string, deger string) error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.AyarKaydet(u.ctx, anahtar, deger)
	if err == nil {
		kisa := deger
		if len(kisa) > 50 {
			kisa = kisa[:50] + "..."
		}
		if kisa == "" {
			kisa = "(temizlendi)"
		}
		u.servis.LogKaydet(u.ctx, u.currentUser, "Ayar Kaydet", fmt.Sprintf("%s = %s", anahtar, kisa))
	}
	return err
}

func (u *Uygulama) yedekKlasor() string {
	k, _ := u.servis.AyarGetir(u.ctx, "yedek_klasor")
	if k == "" {
		return u.yedekVarsayilanKlasor()
	}
	return k
}

func (u *Uygulama) yedekVarsayilanKlasor() string {
	exe, err := os.Executable()
	if err != nil {
		return "yedek"
	}
	return filepath.Join(filepath.Dir(exe), "yedek")
}

func (u *Uygulama) YedekAl() error {
	if err := u.durum(); err != nil {
		return err
	}
	klasor := u.yedekKlasor()
	sayiStr, _ := u.servis.AyarGetir(u.ctx, "yedek_sayi")
	maxSayi := 10
	if sayiStr != "" && sayiStr != "sinirsiz" {
		fmt.Sscanf(sayiStr, "%d", &maxSayi)
	}
	if sayiStr == "sinirsiz" {
		maxSayi = 0
	}
	if err := u.servis.YedekAl(u.ctx, u.dbYolu(), klasor, maxSayi); err != nil {
		return err
	}
	u.servis.LogKaydet(u.ctx, u.currentUser, "Yedek Alındı", klasor)
	return nil
}

func (u *Uygulama) YedekVarsayilanKlasor() string {
	return u.yedekVarsayilanKlasor()
}

func (u *Uygulama) YedekSonGetir() (string, error) {
	klasor := u.yedekKlasor()
	list, err := servisler.YedekListesi(klasor)
	if err != nil || len(list) == 0 {
		return "", nil
	}
	fi, err := os.Stat(list[0])
	if err != nil {
		return "", nil
	}
	return fi.ModTime().Format("2006-01-02 15:04:05"), nil
}

func (u *Uygulama) YedekSayisiGetir() (int, error) {
	return u.servis.YedekSayisi(u.yedekKlasor()), nil
}

func (u *Uygulama) ExcelYedekSayisiGetir() (int, error) {
	return u.servis.ExcelYedekSayisi(u.yedekKlasor()), nil
}

func (u *Uygulama) YedekKlasoruAc() error {
	klasor := u.yedekKlasor()
	os.MkdirAll(klasor, 0755)
	exec.Command("explorer", klasor).Start()
	return nil
}

func (u *Uygulama) BaslangicYedekKontrol() {
	if u.baslatma != nil {
		return
	}
	aktifStr, _ := u.servis.AyarGetir(u.ctx, "yedek_al")
	if aktifStr != "true" {
		return
	}
	aralikStr, _ := u.servis.AyarGetir(u.ctx, "yedek_aralik")
	saat := 24
	switch aralikStr {
	case "1":
		saat = 1
	case "168":
		saat = 168
	}
	sonStr, _ := u.YedekSonGetir()
	if sonStr == "" {
		u.YedekAl()
		return
	}
	son, err := time.Parse("2006-01-02 15:04:05", sonStr)
	if err != nil || time.Since(son) > time.Duration(saat)*time.Hour {
		u.YedekAl()
	}
}

func (u *Uygulama) ExcelExportAl() (string, error) {
	if err := u.durum(); err != nil {
		return "", err
	}
	return u.servis.ExcelExportBase64(u.ctx)
}

func (u *Uygulama) ExcelImportBase64Kontrol(dosyaBase64 string) (modeller.ExcelImportKontrolSonuc, error) {
	if err := u.durum(); err != nil {
		return modeller.ExcelImportKontrolSonuc{}, err
	}
	return u.servis.ExcelImportBase64Kontrol(u.ctx, dosyaBase64)
}

func (u *Uygulama) ExcelImportBase64Import(dosyaBase64 string) error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.ExcelImportBase64Import(u.ctx, dosyaBase64)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Excel İçe Aktarıldı", "base64")
	}
	return err
}

func (u *Uygulama) ExcelYedekKaydet(excelBase64 string) error {
	return nil
}

func (u *Uygulama) ExcelExportKaydet(excelBase64 string, hedefKlasor string) error {
	return nil
}

func (u *Uygulama) ExcelExportOlustur(hedefKlasor string) error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.ExcelExportOlustur(u.ctx, hedefKlasor)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Excel Dışa Aktarıldı", hedefKlasor)
	}
	return err
}

func (u *Uygulama) ExcelImportKontrol(dosyaYolu string) (modeller.ExcelImportKontrolSonuc, error) {
	if err := u.durum(); err != nil {
		return modeller.ExcelImportKontrolSonuc{}, err
	}
	return u.servis.ExcelImportKontrol(u.ctx, dosyaYolu)
}

func (u *Uygulama) ExcelImport(dosyaYolu string) error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.ExcelImport(u.ctx, dosyaYolu)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Excel İçe Aktarıldı", dosyaYolu)
	}
	return err
}

func (u *Uygulama) SilmeKoduKaydet(kod string) error {
	err := u.AyarKaydet("silme-kodu", kod)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Silme Kodu Değiştirildi", kod)
	}
	return err
}

func (u *Uygulama) GecikmisOdemelerGetir(ay int) ([]modeller.GecikmisOdemeli, error) {
	if err := u.durum(); err != nil {
		return nil, err
	}
	return u.servis.GecikmisOdemelerGetir(u.ctx, ay)
}

func (u *Uygulama) LogKaydet(islem string, detay string) error {
	if err := u.durum(); err != nil {
		return err
	}
	return u.servis.LogKaydet(u.ctx, u.currentUser, islem, detay)
}

func (u *Uygulama) LoglariListele(sayfa int, limit int) (modeller.SayfaliLog, error) {
	if err := u.durum(); err != nil {
		return modeller.SayfaliLog{}, err
	}
	return u.servis.LoglariListele(u.ctx, sayfa, limit)
}

func (u *Uygulama) LoglariSil() error {
	if err := u.durum(); err != nil {
		return err
	}
	err := u.servis.LoglariSil(u.ctx)
	if err == nil {
		u.servis.LogKaydet(u.ctx, u.currentUser, "Log Kayıtları Silindi", "")
	}
	return err
}
