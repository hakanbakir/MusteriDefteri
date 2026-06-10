package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"cari/modeller"
)

func (u *Uygulama) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	path := strings.TrimPrefix(r.URL.Path, "/api/")

	var res interface{}
	var err error

	switch path {
	case "DashboardGetir":
		var args struct{ Baslangic, Bitis string }
		if r.Body != nil {
			json.NewDecoder(r.Body).Decode(&args)
		}
		res, err = u.DashboardGetir(args.Baslangic, args.Bitis)

	case "CarileriListele":
		var args struct {
			Arama string `json:"arama"`
			Sayfa int    `json:"sayfa"`
			Limit int    `json:"limit"`
			Sirala string `json:"sirala"`
			Yon    string `json:"yon"`
		}
		if r.Body != nil {
			json.NewDecoder(r.Body).Decode(&args)
		}
		if args.Sayfa < 1 {
			args.Sayfa = 1
		}
		if args.Limit < 1 {
			args.Limit = 10
		}
		if args.Sirala == "" {
			args.Sirala = "unvan"
		}
		if args.Yon == "" {
			args.Yon = "asc"
		}
		res, err = u.CarileriListele(args.Arama, args.Sayfa, args.Limit, args.Sirala, args.Yon)

	case "CariGetir":
		var args struct {
			ID int64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.CariGetir(args.ID)

	case "CariKaydet":
		var args struct {
			Cari modeller.CariHesap `json:"cari"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.CariKaydet(args.Cari)

	case "CariSil":
		var args struct {
			ID int64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.CariSil(args.ID)

	case "CariHareketleriListele":
		var args struct {
			CariID int64 `json:"cariId"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.CariHareketleriListele(args.CariID)

	case "CariHareketOlustur":
		var args struct {
			Hareket modeller.CariHareket `json:"hareket"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.CariHareketOlustur(args.Hareket)

	case "CariHareketSil":
		var args struct {
			ID int64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.CariHareketSil(args.ID)

	case "CariHareketGuncelle":
		var args struct {
			Hareket modeller.CariHareket `json:"hareket"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.CariHareketGuncelle(args.Hareket)

	case "SatislariListele":
		var args struct {
			Arama string `json:"arama"`
			Sayfa int    `json:"sayfa"`
			Limit int    `json:"limit"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		if args.Sayfa < 1 {
			args.Sayfa = 1
		}
		if args.Limit < 1 {
			args.Limit = 10
		}
		res, err = u.SatislariListele(args.Arama, args.Sayfa, args.Limit)

	case "SatisOlustur":
		var args struct {
			Satis modeller.Satis `json:"satis"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.SatisOlustur(args.Satis)

	case "SatisIptalEt":
		var args struct {
			ID int64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.SatisIptalEt(args.ID)

	case "AlislariListele":
		var args struct {
			Arama string `json:"arama"`
			Sayfa int    `json:"sayfa"`
			Limit int    `json:"limit"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		if args.Sayfa < 1 {
			args.Sayfa = 1
		}
		if args.Limit < 1 {
			args.Limit = 10
		}
		res, err = u.AlislariListele(args.Arama, args.Sayfa, args.Limit)

	case "AlisOlustur":
		var args struct {
			Alis modeller.Alis `json:"alis"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.AlisOlustur(args.Alis)

	case "AlisIptalEt":
		var args struct {
			ID int64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.AlisIptalEt(args.ID)

	case "SilmeKoduGetir":
		res, err = u.SilmeKoduGetir()

	case "SilmeKoduKaydet":
		var args struct {
			Kod string `json:"kod"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.SilmeKoduKaydet(args.Kod)

	case "KullaniciGiris":
		var args struct {
			KullaniciAdi string `json:"kullaniciAdi"`
			Sifre        string `json:"sifre"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.KullaniciGiris(args.KullaniciAdi, args.Sifre)

	case "KullaniciCikis":
		err = u.KullaniciCikis()

	case "KullaniciDogrula":
		var args struct {
			KullaniciAdi string `json:"kullaniciAdi"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.KullaniciDogrula(args.KullaniciAdi)

	case "KullaniciListele":
		res, err = u.KullaniciListele()

	case "KullaniciEkle":
		var args struct {
			Kullanici modeller.Kullanici `json:"kullanici"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.KullaniciEkle(args.Kullanici)

	case "KullaniciSil":
		var args struct {
			ID int64 `json:"id"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.KullaniciSil(args.ID)

	case "KullaniciSifreDegistir":
		var args struct {
			ID        int64  `json:"id"`
			YeniSifre string `json:"yeniSifre"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.KullaniciSifreDegistir(args.ID, args.YeniSifre)

	case "AyarGetir":
		var args struct {
			Anahtar string `json:"anahtar"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.AyarGetir(args.Anahtar)

	case "AyarKaydet":
		var args struct {
			Anahtar string `json:"anahtar"`
			Deger   string `json:"deger"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.AyarKaydet(args.Anahtar, args.Deger)

	case "YedekAl":
		err = u.YedekAl()

	case "YedekVarsayilanKlasor":
		res = u.YedekVarsayilanKlasor()

	case "YedekSonGetir":
		res, err = u.YedekSonGetir()

	case "YedekSayisiGetir":
		res, err = u.YedekSayisiGetir()

	case "ExcelYedekSayisiGetir":
		res, err = u.ExcelYedekSayisiGetir()

	case "YedekKlasoruAc":
		err = u.YedekKlasoruAc()

	case "ExcelYedekKaydet":
		var args struct {
			ExcelBase64 string `json:"excelBase64"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.ExcelYedekKaydet(args.ExcelBase64)

	case "ExcelExportKaydet":
		var args struct {
			ExcelBase64 string `json:"excelBase64"`
			HedefKlasor string `json:"hedefKlasor"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.ExcelExportKaydet(args.ExcelBase64, args.HedefKlasor)

	case "ExcelExportOlustur":
		var args struct {
			HedefKlasor string `json:"hedefKlasor"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.ExcelExportOlustur(args.HedefKlasor)

	case "ExcelExportAl":
		res, err = u.ExcelExportAl()

	case "ExcelImportKontrol":
		var args struct {
			DosyaYolu string `json:"dosyaYolu"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.ExcelImportKontrol(args.DosyaYolu)

	case "ExcelImport":
		var args struct {
			DosyaYolu string `json:"dosyaYolu"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.ExcelImport(args.DosyaYolu)

	case "ExcelImportBase64Kontrol":
		var args struct {
			DosyaBase64 string `json:"dosyaBase64"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.ExcelImportBase64Kontrol(args.DosyaBase64)

	case "ExcelImportBase64Import":
		var args struct {
			DosyaBase64 string `json:"dosyaBase64"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.ExcelImportBase64Import(args.DosyaBase64)

	case "GecikmisOdemelerGetir":
		var args struct {
			Ay int `json:"ay"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		res, err = u.GecikmisOdemelerGetir(args.Ay)

	case "LogKaydet":
		var args struct {
			Islem string `json:"islem"`
			Detay string `json:"detay"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		err = u.LogKaydet(args.Islem, args.Detay)

	case "LoglariListele":
		var args struct {
			Sayfa int `json:"sayfa"`
			Limit int `json:"limit"`
		}
		json.NewDecoder(r.Body).Decode(&args)
		if args.Sayfa < 1 {
			args.Sayfa = 1
		}
		if args.Limit < 1 {
			args.Limit = 10
		}
		res, err = u.LoglariListele(args.Sayfa, args.Limit)

	case "LoglariSil":
		err = u.LoglariSil()

	default:
		http.Error(w, `{"error":"bilinmeyen metod: `+path+`"}`, 404)
		return
	}

	if err != nil {
		log.Printf("API error [%s]: %v", path, err)
		w.WriteHeader(400)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if res == nil {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		return
	}
	json.NewEncoder(w).Encode(res)
}
