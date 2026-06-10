package modeller

type SayfaliSonuc[T any] struct {
	Veriler []T   `json:"veriler"`
	Toplam  int64 `json:"toplam"`
	Sayfa   int   `json:"sayfa"`
	Limit   int   `json:"limit"`
}

type CariHesap struct {
	ID        int64   `json:"id"`
	Unvan     string  `json:"unvan"`
	Telefon   string  `json:"telefon"`
	Eposta    string  `json:"eposta"`
	Adres     string  `json:"adres"`
	VergiNo   string  `json:"vergiNo"`
	Notlar    string  `json:"notlar"`
	Bakiye    float64 `json:"bakiye"`
	Olusturma string  `json:"olusturma"`
}

type CariHareket struct {
	ID         int64   `json:"id"`
	CariID     int64   `json:"cariId"`
	CariUnvan  string  `json:"cariUnvan"`
	CariBakiye float64 `json:"cariBakiye"`
	BelgeTuru  string  `json:"belgeTuru"`
	BelgeID    int64   `json:"belgeId"`
	Tutar      float64 `json:"tutar"`
	Tarih      string  `json:"tarih"`
	Aciklama   string  `json:"aciklama"`
	IslemTuru  string  `json:"islemTuru"`
}

type Satis struct {
	ID        int64   `json:"id"`
	CariID    int64   `json:"cariId"`
	CariUnvan string  `json:"cariUnvan"`
	Tarih     string  `json:"tarih"`
	Aciklama  string  `json:"aciklama"`
	Toplam    float64 `json:"toplam"`
	Durum     string  `json:"durum"`
}

type Alis struct {
	ID        int64   `json:"id"`
	CariID    int64   `json:"cariId"`
	CariUnvan string  `json:"cariUnvan"`
	Tarih     string  `json:"tarih"`
	Aciklama  string  `json:"aciklama"`
	Toplam    float64 `json:"toplam"`
	Durum     string  `json:"durum"`
	IslemTuru string  `json:"islemTuru"`
}

type Kullanici struct {
	ID          int64  `json:"id"`
	KullaniciAdi string `json:"kullaniciAdi"`
	SifreHash   string `json:"-"`
	Rol         string `json:"rol"`
}

type ExcelImportKontrolSonuc struct {
	MevcutMu int `json:"mevcutMu"`
	Toplam   int `json:"toplam"`
}

type Dashboard struct {
	ToplamCari   int64         `json:"toplamCari"`
	ToplamAlacak float64       `json:"toplamAlacak"`
	SonIslemler  []CariHareket `json:"sonIslemler"`
}

type GecikmisOdemeli struct {
	CariID    int64   `json:"cariId"`
	Unvan     string  `json:"unvan"`
	Telefon   string  `json:"telefon"`
	Borc      float64 `json:"borc"`
	SonSatis  string  `json:"sonSatis"`
	GunFarki  int     `json:"gunFarki"`
}

type Log struct {
	ID        int64  `json:"id"`
	Kullanici string `json:"kullanici"`
	Islem     string `json:"islem"`
	Detay     string `json:"detay"`
	Tarih     string `json:"tarih"`
}

type SayfaliLog struct {
	Veriler []Log `json:"veriler"`
	Toplam  int64 `json:"toplam"`
	Sayfa   int   `json:"sayfa"`
	Limit   int   `json:"limit"`
}
