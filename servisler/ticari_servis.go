package servisler

import (
	"context"
	"errors"
	"strings"

	"cari/hatalar"
	"cari/modeller"
)

type TicariDepo interface {
	Migrasyon(context.Context) error
	DashboardGetir(context.Context, string, string) (modeller.Dashboard, error)
	CarileriListele(context.Context, string, int, int, string, string) (modeller.SayfaliSonuc[modeller.CariHesap], error)
	TumCarileriListele(context.Context) ([]modeller.CariHesap, error)
	TumHareketleriListele(context.Context) ([]modeller.CariHareket, error)
	CariGetir(context.Context, int64) (modeller.CariHesap, error)
	CariKaydet(context.Context, modeller.CariHesap) (modeller.CariHesap, error)
	CariSil(context.Context, int64) error
	CariHareketleriListele(context.Context, int64) ([]modeller.CariHareket, error)
	CariHareketGetir(context.Context, int64) (modeller.CariHareket, error)
	CariHareketOlustur(context.Context, modeller.CariHareket) (modeller.CariHareket, error)
	CariHareketSil(context.Context, int64) error
	CariHareketGuncelle(context.Context, modeller.CariHareket) (modeller.CariHareket, error)
	SatislariListele(context.Context, string, int, int) (modeller.SayfaliSonuc[modeller.Satis], error)
	SatisGetir(context.Context, int64) (modeller.Satis, error)
	SatisOlustur(context.Context, modeller.Satis) (modeller.Satis, error)
	SatisIptalEt(context.Context, int64) error
	AlislariListele(context.Context, string, int, int) (modeller.SayfaliSonuc[modeller.Alis], error)
	AlisGetir(context.Context, int64) (modeller.Alis, error)
	AlisOlustur(context.Context, modeller.Alis) (modeller.Alis, error)
	AlisIptalEt(context.Context, int64) error
	AyarGetir(context.Context, string) (string, error)
	AyarKaydet(context.Context, string, string) error
	KullaniciGiris(context.Context, string, string) (modeller.Kullanici, error)
	KullaniciDogrula(context.Context, string) (modeller.Kullanici, error)
	KullaniciListele(context.Context) ([]modeller.Kullanici, error)
	KullaniciEkle(context.Context, modeller.Kullanici) (modeller.Kullanici, error)
	KullaniciSil(context.Context, int64) error
	KullaniciSifreDegistir(context.Context, int64, string) error
	Checkpoint(context.Context) error
	GecikmisOdemelerGetir(context.Context, int) ([]modeller.GecikmisOdemeli, error)
	LogKaydet(context.Context, string, string, string) error
	LoglariListele(context.Context, int, int) (modeller.SayfaliLog, error)
	LoglariSil(context.Context) error
}

type TicariServis struct {
	depo TicariDepo
}

func YeniTicariServis(depo TicariDepo) *TicariServis {
	return &TicariServis{depo: depo}
}

func (s *TicariServis) VeritabaniHazirla(ctx context.Context) error {
	return s.depo.Migrasyon(ctx)
}

func (s *TicariServis) DashboardGetir(ctx context.Context, baslangic, bitis string) (modeller.Dashboard, error) {
	return s.depo.DashboardGetir(ctx, baslangic, bitis)
}

func (s *TicariServis) CarileriListele(ctx context.Context, arama string, sayfa int, limit int, sirala string, yon string) (modeller.SayfaliSonuc[modeller.CariHesap], error) {
	return s.depo.CarileriListele(ctx, arama, sayfa, limit, sirala, yon)
}

func (s *TicariServis) CariGetir(ctx context.Context, id int64) (modeller.CariHesap, error) {
	return s.depo.CariGetir(ctx, id)
}

func (s *TicariServis) CariKaydet(ctx context.Context, cari modeller.CariHesap) (modeller.CariHesap, error) {
	if strings.TrimSpace(cari.Unvan) == "" {
		return cari, hatalar.ErrGecersizVeri
	}
	return s.depo.CariKaydet(ctx, cari)
}

func (s *TicariServis) CariSil(ctx context.Context, id int64) error {
	return s.depo.CariSil(ctx, id)
}

func (s *TicariServis) CariHareketleriListele(ctx context.Context, cariID int64) ([]modeller.CariHareket, error) {
	return s.depo.CariHareketleriListele(ctx, cariID)
}

func (s *TicariServis) borcHesapla(hareketler []modeller.CariHareket, haricID int64) float64 {
	var b float64
	for _, h := range hareketler {
		if h.ID == haricID {
			continue
		}
		switch h.BelgeTuru {
		case "Satış":
			b += h.Tutar
		case "Tahsilat", "İade":
			b -= h.Tutar
		}
	}
	if b < 0 {
		b = 0
	}
	return b
}

func (s *TicariServis) bakiyeKontrol(ctx context.Context, cariID int64, belgeTuru string, tutar float64, haricID int64) error {
	if belgeTuru != "Tahsilat" && belgeTuru != "İade" {
		return nil
	}
	hareketler, err := s.depo.CariHareketleriListele(ctx, cariID)
	if err != nil {
		return err
	}
	borc := s.borcHesapla(hareketler, haricID)
	if tutar > borc {
		return errors.New("bakiye yetersiz: borçtan fazla tahsilat veya iade yapılamaz")
	}
	return nil
}

func (s *TicariServis) CariHareketOlustur(ctx context.Context, hareket modeller.CariHareket) (modeller.CariHareket, error) {
	if hareket.CariID == 0 || strings.TrimSpace(hareket.BelgeTuru) == "" || hareket.Tutar <= 0 {
		return hareket, hatalar.ErrGecersizVeri
	}
	if hareket.BelgeTuru != "Tahsilat" && hareket.BelgeTuru != "İade" {
		return hareket, hatalar.ErrGecersizVeri
	}
	if err := s.bakiyeKontrol(ctx, hareket.CariID, hareket.BelgeTuru, hareket.Tutar, 0); err != nil {
		return hareket, err
	}
	return s.depo.CariHareketOlustur(ctx, hareket)
}

func (s *TicariServis) CariHareketGetir(ctx context.Context, id int64) (modeller.CariHareket, error) {
	return s.depo.CariHareketGetir(ctx, id)
}

func (s *TicariServis) CariHareketSil(ctx context.Context, id int64) error {
	if id == 0 {
		return hatalar.ErrGecersizVeri
	}
	return s.depo.CariHareketSil(ctx, id)
}

func (s *TicariServis) CariHareketGuncelle(ctx context.Context, hareket modeller.CariHareket) (modeller.CariHareket, error) {
	if hareket.ID == 0 || hareket.CariID == 0 || strings.TrimSpace(hareket.BelgeTuru) == "" || hareket.Tutar <= 0 {
		return hareket, hatalar.ErrGecersizVeri
	}
	if err := s.bakiyeKontrol(ctx, hareket.CariID, hareket.BelgeTuru, hareket.Tutar, hareket.ID); err != nil {
		return hareket, err
	}
	return s.depo.CariHareketGuncelle(ctx, hareket)
}

func (s *TicariServis) SatislariListele(ctx context.Context, arama string, sayfa int, limit int) (modeller.SayfaliSonuc[modeller.Satis], error) {
	return s.depo.SatislariListele(ctx, arama, sayfa, limit)
}

func (s *TicariServis) SatisOlustur(ctx context.Context, satis modeller.Satis) (modeller.Satis, error) {
	if satis.CariID == 0 || satis.Toplam <= 0 {
		return satis, hatalar.ErrGecersizVeri
	}
	return s.depo.SatisOlustur(ctx, satis)
}

func (s *TicariServis) SatisGetir(ctx context.Context, id int64) (modeller.Satis, error) {
	return s.depo.SatisGetir(ctx, id)
}

func (s *TicariServis) SatisIptalEt(ctx context.Context, id int64) error {
	return s.depo.SatisIptalEt(ctx, id)
}

func (s *TicariServis) AlislariListele(ctx context.Context, arama string, sayfa int, limit int) (modeller.SayfaliSonuc[modeller.Alis], error) {
	return s.depo.AlislariListele(ctx, arama, sayfa, limit)
}

func (s *TicariServis) AlisOlustur(ctx context.Context, alis modeller.Alis) (modeller.Alis, error) {
	if alis.CariID == 0 || strings.TrimSpace(alis.Tarih) == "" || alis.Toplam <= 0 {
		return alis, hatalar.ErrGecersizVeri
	}
	if err := s.bakiyeKontrol(ctx, alis.CariID, "İade", alis.Toplam, 0); err != nil {
		return alis, err
	}
	return s.depo.AlisOlustur(ctx, alis)
}

func (s *TicariServis) AlisGetir(ctx context.Context, id int64) (modeller.Alis, error) {
	return s.depo.AlisGetir(ctx, id)
}

func (s *TicariServis) AlisIptalEt(ctx context.Context, id int64) error {
	return s.depo.AlisIptalEt(ctx, id)
}

func (s *TicariServis) AyarGetir(ctx context.Context, anahtar string) (string, error) {
	return s.depo.AyarGetir(ctx, anahtar)
}

func (s *TicariServis) Checkpoint(ctx context.Context) error {
	return s.depo.Checkpoint(ctx)
}

func (s *TicariServis) KullaniciGiris(ctx context.Context, kullaniciAdi, sifre string) (modeller.Kullanici, error) {
	if strings.TrimSpace(kullaniciAdi) == "" || sifre == "" {
		return modeller.Kullanici{}, hatalar.ErrGecersizVeri
	}
	return s.depo.KullaniciGiris(ctx, kullaniciAdi, sifre)
}

func (s *TicariServis) KullaniciDogrula(ctx context.Context, kullaniciAdi string) (modeller.Kullanici, error) {
	return s.depo.KullaniciDogrula(ctx, kullaniciAdi)
}

func (s *TicariServis) KullaniciListele(ctx context.Context) ([]modeller.Kullanici, error) {
	return s.depo.KullaniciListele(ctx)
}

func (s *TicariServis) KullaniciEkle(ctx context.Context, k modeller.Kullanici) (modeller.Kullanici, error) {
	if strings.TrimSpace(k.KullaniciAdi) == "" || (k.Rol != "admin" && k.Rol != "kullanici") {
		return k, hatalar.ErrGecersizVeri
	}
	return s.depo.KullaniciEkle(ctx, k)
}

func (s *TicariServis) KullaniciSil(ctx context.Context, id int64) error {
	if id == 0 {
		return hatalar.ErrGecersizVeri
	}
	return s.depo.KullaniciSil(ctx, id)
}

func (s *TicariServis) KullaniciSifreDegistir(ctx context.Context, id int64, yeniSifre string) error {
	if id == 0 || len(yeniSifre) < 3 {
		return hatalar.ErrGecersizVeri
	}
	return s.depo.KullaniciSifreDegistir(ctx, id, yeniSifre)
}

func (s *TicariServis) AyarKaydet(ctx context.Context, anahtar string, deger string) error {
	return s.depo.AyarKaydet(ctx, anahtar, deger)
}

func (s *TicariServis) GecikmisOdemelerGetir(ctx context.Context, ay int) ([]modeller.GecikmisOdemeli, error) {
	return s.depo.GecikmisOdemelerGetir(ctx, ay)
}

func (s *TicariServis) LogKaydet(ctx context.Context, kullanici, islem, detay string) error {
	return s.depo.LogKaydet(ctx, kullanici, islem, detay)
}

func (s *TicariServis) LoglariListele(ctx context.Context, sayfa, limit int) (modeller.SayfaliLog, error) {
	return s.depo.LoglariListele(ctx, sayfa, limit)
}

func (s *TicariServis) LoglariSil(ctx context.Context) error {
	return s.depo.LoglariSil(ctx)
}
