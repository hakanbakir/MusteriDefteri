package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"time"

	"cari/veritabani"
)

var harfler = []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "Y", "Z"}

var isimler = []string{"Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "Osman", "Yusuf", "Ömer",
	"Emre", "Murat", "Fatih", "Can", "Serkan", "Oğuz", "Burak", "Cem", "Uğur", "Tolga",
	"Kerem", "Mert", "Deniz", "Barış", "Onur", "Volkan", "Gökhan", "Kemal", "Orhan", "İsmail",
	"Zeynep", "Ayşe", "Fatma", "Elif", "Merve", "Büşra", "Selin", "Derya", "Gamze", "Esra",
	"İrem", "Hande", "Ebru", "Aslı", "Pınar", "Sibel", "Aylin", "Gülşah", "Yasemin", "Özge"}

var soyadlar = []string{"Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Koç", "Kurt", "Arslan", "Polat",
	"Kılıç", "Aslan", "Doğan", "Yıldız", "Aydın", "Özdemir", "Aksoy", "Kara", "Erdoğan", "Güneş",
	"Acar", "Korkmaz", "Karadağ", "Bulut", "Yıldırım", "Çetin", "Ateş", "Kartal", "Özkan", "Tekin",
	"Turan", "Sönmez", "Varol", "İnan", "Köse", "Güler", "Gül", "Bozkurt", "Akar", "Çağlar"}

var ilceler = []string{"Merkez", "Karatay", "Selçuklu", "Nilüfer", "Osmangazi", "Konak", "Bornova", "Çankaya",
	"Keçiören", "Mamak", "Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Muratpaşa", "Seyhan",
	"Tepebaşı", "Ortahisar", "İzmit", "Buca"}

var firmalar = []string{"Ticaret", "Sanayi", "Gıda", "Tekstil", "İnşaat", "Nakliyat", "Turizm",
	"Tarım", "Enerji", "Sağlık", "Eğitim", "Bilişim", "Elektronik", "Kimya", "Otomotiv"}

var islemTuruSecenek = []string{"Nakit", "Çek", "Banka Hesabı", "Kredi Kartı"}

var aciklamaTahsilat = []string{"Kısmi ödeme", "Tam ödeme", "Düzenli ödeme", "Havale", "Elden", "Banka transferi", "Kapora", "Senet tahsilatı"}
var aciklamaSatis = []string{"Toptan", "Perakende", "Online", "Kurumsal", "Peşin", "Vadeli"}

func rastgele(s []string) string { return s[rand.Intn(len(s))] }

func main() {
	rand.Seed(time.Now().UnixNano())

	db, kapat, err := veritabani.Baglan()
	if err != nil {
		log.Fatalf("Veritabanı bağlantısı: %v", err)
	}
	defer kapat()

	log.Println("Veritabanına bağlanıldı.")

	toplamCari := 500
	batch := 50

	for bas := 0; bas < toplamCari; bas += batch {
		son := bas + batch
		if son > toplamCari {
			son = toplamCari
		}

		err := islemBatch(db, bas, son)
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("%d / %d müşteri oluşturuldu.", son, toplamCari)
	}

	log.Println("Veritabanı başarıyla dolduruldu!")
	fmt.Println("Tamamlandı: 500 müşteri, her birine 10 işlem (ilk Satış, sonra Tahsilat/İade)")
}

func islemBatch(db *sql.DB, bas, son int) error {
	trx, err := db.Begin()
	if err != nil {
		return err
	}
	defer trx.Rollback()

	simdi := time.Now()
	ucYilOnce := simdi.AddDate(-3, 0, 0)

	for c := bas; c < son; c++ {
		harf := harfler[c%len(harfler)]
		isim := rastgele(isimler)
		soyad := rastgele(soyadlar)
		unvan := fmt.Sprintf("%s %s %s", isim, soyad, rastgele(firmalar))
		telefon := fmt.Sprintf("05%02d %03d %02d %02d", rand.Intn(99)+1, rand.Intn(999)+1, rand.Intn(99)+1, rand.Intn(99)+1)
		eposta := fmt.Sprintf("%s%s%d@mail.com",
			strings.ToLower(harf),
			strings.ToLower(soyadlar[rand.Intn(len(soyadlar))]),
			c)
		adres := fmt.Sprintf("%s Mah. %s Sok. No:%d", rastgele(ilceler), rastgele(soyadlar), rand.Intn(50)+1)

		res, err := trx.Exec("INSERT INTO cari_hesaplar (unvan, telefon, eposta, adres) VALUES (?, ?, ?, ?)",
			unvan, telefon, eposta, adres)
		if err != nil {
			return fmt.Errorf("cari ekleme (sıra %d): %w", c, err)
		}
		cariID, _ := res.LastInsertId()

		bakiye := 0

		aralik := (simdi.Unix() - ucYilOnce.Unix()) / 10
		for i := 0; i < 10; i++ {
			dakika := ucYilOnce.Unix() + int64(i)*aralik + rand.Int63n(aralik)
			tarih := time.Unix(dakika, 0).Format("2006-01-02T15:04")

			if i == 0 {
				tutar := rand.Intn(50000-1000) + 1000
				aciklama := fmt.Sprintf("%s satışı", rastgele(aciklamaSatis))

				res, err := trx.Exec("INSERT INTO satislar (cari_id, tarih, aciklama, toplam, durum) VALUES (?, ?, ?, ?, 'Aktif')",
					cariID, tarih, aciklama, tutar)
				if err != nil {
					return fmt.Errorf("satış ekleme: %w", err)
				}
				satisID, _ := res.LastInsertId()

				_, err = trx.Exec("INSERT INTO cari_hareketler (cari_id, belge_turu, belge_id, tutar, tarih, aciklama, islem_turu) VALUES (?, 'Satış', ?, ?, ?, ?, '')",
					cariID, satisID, tutar, tarih, aciklama)
				if err != nil {
					return fmt.Errorf("hareket ekleme: %w", err)
				}
				bakiye += tutar
			} else {
				maks := bakiye
				if maks < 1 {
					maks = 1
				}
				tutar := rand.Intn(maks) + 1
				if tutar > bakiye {
					tutar = bakiye
				}

				belgeTuru := []string{"Tahsilat", "İade"}[rand.Intn(2)]
				aciklama := rastgele(aciklamaTahsilat)

				if belgeTuru == "İade" {
					islemTuru := rastgele(islemTuruSecenek)
					res, err := trx.Exec("INSERT INTO alislar (cari_id, tarih, aciklama, toplam, durum) VALUES (?, ?, ?, ?, 'Aktif')",
						cariID, tarih, aciklama, tutar)
					if err != nil {
						return fmt.Errorf("iade ekleme: %w", err)
					}
					alisID, _ := res.LastInsertId()
					_, err = trx.Exec("INSERT INTO cari_hareketler (cari_id, belge_turu, belge_id, tutar, tarih, aciklama, islem_turu) VALUES (?, 'İade', ?, ?, ?, ?, ?)",
						cariID, alisID, tutar, tarih, aciklama, islemTuru)
					if err != nil {
						return fmt.Errorf("hareket ekleme: %w", err)
					}
				} else {
					islemTuru := rastgele(islemTuruSecenek)
					_, err := trx.Exec("INSERT INTO cari_hareketler (cari_id, belge_turu, belge_id, tutar, tarih, aciklama, islem_turu) VALUES (?, 'Tahsilat', 0, ?, ?, ?, ?)",
						cariID, tutar, tarih, aciklama, islemTuru)
					if err != nil {
						return fmt.Errorf("tahsilat ekleme: %w", err)
					}
				}
				bakiye -= tutar
			}
		}
	}

	return trx.Commit()
}
