package main

import (
	"fmt"
	"log"
	"cari/veritabani"
)

func main() {
	db, kapat, err := veritabani.Baglan()
	if err != nil {
		log.Fatal(err)
	}
	defer kapat()

	var cariSay, hareketSay, satisSay, alisSay int
	db.QueryRow("SELECT COUNT(*) FROM cari_hesaplar").Scan(&cariSay)
	db.QueryRow("SELECT COUNT(*) FROM cari_hareketler").Scan(&hareketSay)
	db.QueryRow("SELECT COUNT(*) FROM satislar").Scan(&satisSay)
	db.QueryRow("SELECT COUNT(*) FROM alislar").Scan(&alisSay)

	fmt.Printf("Müşteri: %d\n", cariSay)
	fmt.Printf("Hareket: %d\n", hareketSay)
	fmt.Printf("Satış:   %d\n", satisSay)
	fmt.Printf("İade:    %d\n", alisSay)
}
