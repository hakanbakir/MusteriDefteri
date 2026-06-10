package servisler

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"cari/modeller"

	"github.com/xuri/excelize/v2"
)

func (s *TicariServis) YedekAl(ctx context.Context, dbYolu, klasor string, maxSayi int) error {
	if err := os.MkdirAll(klasor, 0755); err != nil {
		return fmt.Errorf("yedek klasörü oluşturulamadı: %w", err)
	}
	if err := s.Checkpoint(ctx); err != nil {
		return fmt.Errorf("checkpoint alınamadı: %w", err)
	}
	ts := time.Now().Format("2006-01-02_150405")
	dbDst := filepath.Join(klasor, fmt.Sprintf("musteri_defteri_%s.db", ts))
	srcFile, err := os.Open(dbYolu)
	if err != nil {
		return fmt.Errorf("veritabanı açılamadı: %w", err)
	}
	defer srcFile.Close()
	dstFile, err := os.Create(dbDst)
	if err != nil {
		return fmt.Errorf("yedek oluşturulamadı: %w", err)
	}
	defer dstFile.Close()
	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return fmt.Errorf("yedek kopyalanamadı: %w", err)
	}
	xlsxDst := filepath.Join(klasor, fmt.Sprintf("musteri_defteri_%s.xlsx", ts))
	if err := s.excelExport(ctx, xlsxDst); err != nil {
		return fmt.Errorf("excel yedek alınamadı: %w", err)
	}
	if maxSayi > 0 {
		dbList, _ := YedekListesi(klasor)
		for len(dbList) > maxSayi {
			os.Remove(dbList[len(dbList)-1])
			dbList = dbList[:len(dbList)-1]
		}
		xlsxList := excelYedekListesi(klasor)
		for len(xlsxList) > maxSayi {
			os.Remove(xlsxList[len(xlsxList)-1])
			xlsxList = xlsxList[:len(xlsxList)-1]
		}
	}
	return nil
}

func YedekListesi(klasor string) ([]string, error) {
	entries, err := os.ReadDir(klasor)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var backups []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "musteri_defteri_") && strings.HasSuffix(e.Name(), ".db") {
			backups = append(backups, filepath.Join(klasor, e.Name()))
		}
	}
	sort.Slice(backups, func(i, j int) bool {
		fi, _ := os.Stat(backups[i])
		fj, _ := os.Stat(backups[j])
		if fi == nil || fj == nil {
			return backups[i] < backups[j]
		}
		return fi.ModTime().After(fj.ModTime())
	})
	return backups, nil
}

func excelYedekListesi(klasor string) []string {
	entries, err := os.ReadDir(klasor)
	if err != nil {
		return nil
	}
	var list []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "musteri_defteri_") && strings.HasSuffix(e.Name(), ".xlsx") {
			list = append(list, filepath.Join(klasor, e.Name()))
		}
	}
	sort.Slice(list, func(i, j int) bool {
		fi, _ := os.Stat(list[i])
		fj, _ := os.Stat(list[j])
		if fi == nil || fj == nil {
			return list[i] < list[j]
		}
		return fi.ModTime().After(fj.ModTime())
	})
	return list
}

func (s *TicariServis) YedekSayisi(klasor string) int {
	list, err := YedekListesi(klasor)
	if err != nil {
		return 0
	}
	return len(list)
}

func (s *TicariServis) ExcelYedekSayisi(klasor string) int {
	return len(excelYedekListesi(klasor))
}

func (s *TicariServis) excelExport(ctx context.Context, dst string) error {
	cariler, err := s.depo.TumCarileriListele(ctx)
	if err != nil {
		return fmt.Errorf("cariler alınamadı: %w", err)
	}
	hareketler, err := s.depo.TumHareketleriListele(ctx)
	if err != nil {
		return fmt.Errorf("hareketler alınamadı: %w", err)
	}
	f := excelize.NewFile()
	sheetCariler := "Müşteriler"
	f.SetSheetName(f.GetSheetName(0), sheetCariler)
	f.SetCellValue(sheetCariler, "A1", "Ünvan")
	f.SetCellValue(sheetCariler, "B1", "Telefon")
	f.SetCellValue(sheetCariler, "C1", "E-posta")
	f.SetCellValue(sheetCariler, "D1", "Adres")
	f.SetCellValue(sheetCariler, "E1", "Vergi No")
	f.SetCellValue(sheetCariler, "F1", "Notlar")
	f.SetCellValue(sheetCariler, "G1", "Bakiye")
	f.SetCellValue(sheetCariler, "H1", "Oluşturma")
	for i, c := range cariler {
		row := i + 2
		f.SetCellValue(sheetCariler, fmt.Sprintf("A%d", row), c.Unvan)
		f.SetCellValue(sheetCariler, fmt.Sprintf("B%d", row), c.Telefon)
		f.SetCellValue(sheetCariler, fmt.Sprintf("C%d", row), c.Eposta)
		f.SetCellValue(sheetCariler, fmt.Sprintf("D%d", row), c.Adres)
		f.SetCellValue(sheetCariler, fmt.Sprintf("E%d", row), c.VergiNo)
		f.SetCellValue(sheetCariler, fmt.Sprintf("F%d", row), c.Notlar)
		f.SetCellFloat(sheetCariler, fmt.Sprintf("G%d", row), c.Bakiye, 2, 64)
		f.SetCellValue(sheetCariler, fmt.Sprintf("H%d", row), c.Olusturma)
	}
	sheetHareketler := "Hareketler"
	idx, err := f.NewSheet(sheetHareketler)
	if err != nil {
		return err
	}
	f.SetActiveSheet(idx)
	f.SetCellValue(sheetHareketler, "A1", "Cari Ünvan")
	f.SetCellValue(sheetHareketler, "B1", "Belge Türü")
	f.SetCellValue(sheetHareketler, "C1", "Tutar")
	f.SetCellValue(sheetHareketler, "D1", "Tarih")
	f.SetCellValue(sheetHareketler, "E1", "Açıklama")
	f.SetCellValue(sheetHareketler, "F1", "İşlem Türü")
	for i, h := range hareketler {
		row := i + 2
		f.SetCellValue(sheetHareketler, fmt.Sprintf("A%d", row), h.CariUnvan)
		f.SetCellValue(sheetHareketler, fmt.Sprintf("B%d", row), h.BelgeTuru)
		f.SetCellFloat(sheetHareketler, fmt.Sprintf("C%d", row), h.Tutar, 2, 64)
		f.SetCellValue(sheetHareketler, fmt.Sprintf("D%d", row), h.Tarih)
		f.SetCellValue(sheetHareketler, fmt.Sprintf("E%d", row), h.Aciklama)
		f.SetCellValue(sheetHareketler, fmt.Sprintf("F%d", row), h.IslemTuru)
	}
	if err := f.SaveAs(dst); err != nil {
		return fmt.Errorf("excel kaydedilemedi: %w", err)
	}
	return nil
}

func (s *TicariServis) ExcelExportOlustur(ctx context.Context, hedefKlasor string) error {
	if err := os.MkdirAll(hedefKlasor, 0755); err != nil {
		return fmt.Errorf("klasör oluşturulamadı: %w", err)
	}
	ts := time.Now().Format("2006-01-02_150405")
	dst := filepath.Join(hedefKlasor, fmt.Sprintf("ihracat_%s.xlsx", ts))
	return s.excelExport(ctx, dst)
}

func (s *TicariServis) ExcelImportKontrol(ctx context.Context, dosyaYolu string) (modeller.ExcelImportKontrolSonuc, error) {
	f, err := excelize.OpenFile(dosyaYolu)
	if err != nil {
		return modeller.ExcelImportKontrolSonuc{}, fmt.Errorf("dosya açılamadı: %w", err)
	}
	defer f.Close()
	rows, err := f.GetRows("Müşteriler")
	if err != nil || len(rows) < 2 {
		return modeller.ExcelImportKontrolSonuc{Toplam: 0}, nil
	}
	headers := rows[0]
	unvanIdx := -1
	for i, h := range headers {
		if strings.EqualFold(h, "Ünvan") || strings.EqualFold(h, "Unvan") {
			unvanIdx = i
			break
		}
	}
	if unvanIdx < 0 {
		return modeller.ExcelImportKontrolSonuc{}, fmt.Errorf("Ünvan sütunu bulunamadı")
	}
	mevcutlar, _ := s.depo.TumCarileriListele(ctx)
	mevcutMap := make(map[string]bool, len(mevcutlar))
	for _, c := range mevcutlar {
		mevcutMap[strings.ToLower(strings.TrimSpace(c.Unvan))] = true
	}
	mevcut := 0
	toplam := 0
	for _, row := range rows[1:] {
		if len(row) <= unvanIdx || strings.TrimSpace(row[unvanIdx]) == "" {
			continue
		}
		toplam++
		if mevcutMap[strings.ToLower(strings.TrimSpace(row[unvanIdx]))] {
			mevcut++
		}
	}
	return modeller.ExcelImportKontrolSonuc{MevcutMu: mevcut, Toplam: toplam}, nil
}

func (s *TicariServis) ExcelImport(ctx context.Context, dosyaYolu string) error {
	f, err := excelize.OpenFile(dosyaYolu)
	if err != nil {
		return fmt.Errorf("dosya açılamadı: %w", err)
	}
	defer f.Close()
	rows, err := f.GetRows("Müşteriler")
	if err != nil || len(rows) < 2 {
		return nil
	}
	headers := rows[0]
	colMap := make(map[string]int)
	for i, h := range headers {
		colMap[strings.ToLower(strings.TrimSpace(h))] = i
	}
	// Also map normalized column names
	if idx, ok := colMap["e-posta"]; ok {
		if _, exists := colMap["eposta"]; !exists {
			colMap["eposta"] = idx
		}
	}
	unvanIdx := -1
	for key, idx := range colMap {
		if key == "ünvan" || key == "unvan" {
			unvanIdx = idx
			break
		}
	}
	if unvanIdx < 0 {
		return fmt.Errorf("Ünvan sütunu bulunamadı")
	}
	telefonIdx, telefonOk := colMap["telefon"]
	epostaIdx, epostaOk := colMap["eposta"]
	adresIdx, adresOk := colMap["adres"]
	vergiNoIdx, vergiNoOk := colMap["vergi no"]
	notlarIdx, notlarOk := colMap["notlar"]
	bakiyeIdx, bakiyeOk := colMap["bakiye"]
	olusturmaIdx, olusturmaOk := colMap["olusturma"]

	mevcutlar, _ := s.depo.TumCarileriListele(ctx)
	mevcutMap := make(map[string]bool, len(mevcutlar))
	for _, c := range mevcutlar {
		mevcutMap[strings.ToLower(strings.TrimSpace(c.Unvan))] = true
	}
	importEdilen := 0
	atlananDublicate := 0
	atlananBos := 0
	bakiyeHareket := 0
	for _, row := range rows[1:] {
		if len(row) <= unvanIdx || strings.TrimSpace(row[unvanIdx]) == "" {
			atlananBos++
			continue
		}
		unvan := strings.TrimSpace(row[unvanIdx])
		if mevcutMap[strings.ToLower(unvan)] {
			atlananDublicate++
			continue
		}
		c := modeller.CariHesap{Unvan: unvan}
		if telefonOk && telefonIdx < len(row) {
			c.Telefon = strings.TrimSpace(row[telefonIdx])
		}
		if epostaOk && epostaIdx < len(row) {
			c.Eposta = strings.TrimSpace(row[epostaIdx])
		}
		if adresOk && adresIdx < len(row) {
			c.Adres = strings.TrimSpace(row[adresIdx])
		}
		if vergiNoOk && vergiNoIdx < len(row) {
			c.VergiNo = strings.TrimSpace(row[vergiNoIdx])
		}
		if notlarOk && notlarIdx < len(row) {
			c.Notlar = strings.TrimSpace(row[notlarIdx])
		}
		eklenen, err := s.depo.CariKaydet(ctx, c)
		if err != nil {
			return fmt.Errorf("cari eklenemedi (%s): %w", unvan, err)
		}
		importEdilen++

		// Importtan gelen bakiye varsa başlangıç hareketi oluştur
		if bakiyeOk && bakiyeIdx < len(row) {
			bakiye := 0.0
			fmt.Sscanf(row[bakiyeIdx], "%f", &bakiye)
			if bakiye > 0 {
				h := modeller.CariHareket{
					CariID:    eklenen.ID,
					CariUnvan: unvan,
					BelgeTuru: "Satış",
					Tutar:     bakiye,
					Aciklama:  "Devir bakiye",
					IslemTuru: "",
				}
				if olusturmaOk && olusturmaIdx < len(row) {
					h.Tarih = strings.TrimSpace(row[olusturmaIdx])
				}
				if _, err := s.depo.CariHareketOlustur(ctx, h); err != nil {
					return fmt.Errorf("bakiye hareketi eklenemedi (%s): %w", unvan, err)
				}
				bakiyeHareket++
			} else if bakiye < 0 {
				h := modeller.CariHareket{
					CariID:    eklenen.ID,
					CariUnvan: unvan,
					BelgeTuru: "Tahsilat",
					Tutar:     -bakiye,
					Aciklama:  "Devir bakiye",
					IslemTuru: "",
				}
				if olusturmaOk && olusturmaIdx < len(row) {
					h.Tarih = strings.TrimSpace(row[olusturmaIdx])
				}
				if _, err := s.depo.CariHareketOlustur(ctx, h); err != nil {
					return fmt.Errorf("bakiye hareketi eklenemedi (%s): %w", unvan, err)
				}
				bakiyeHareket++
			}
		}
	}
	toplamSatir := len(rows) - 1
	log.Printf("Excel import: %d satır okundu, %d import edildi, %d duplicate atlandı, %d boş atlandı, %d bakiye hareketi oluşturuldu",
		toplamSatir, importEdilen, atlananDublicate, atlananBos, bakiyeHareket)
	if atlananDublicate > 0 {
		log.Printf("UYARI: Excel'de case-insensitive aynı isme sahip %d kayıt atlandı (büyük/küçük harf farkı olan aynı isimler)", atlananDublicate)
	}
	// Hareketleri içe aktar (varsa)
	hareketRows, err := f.GetRows("Hareketler")
	if err == nil && len(hareketRows) >= 2 {
		hHeaders := hareketRows[0]
		hColMap := make(map[string]int)
		for i, h := range hHeaders {
			hColMap[strings.ToLower(strings.TrimSpace(h))] = i
		}
		cariUnvanIdx := -1
		for key, idx := range hColMap {
			if key == "cari ünvan" || key == "cari unvan" {
				cariUnvanIdx = idx
				break
			}
		}
		belgeTuruIdx, belgeTuruOk := hColMap["belge türü"]
		tutarIdx, tutarOk := hColMap["tutar"]
		tarihIdx, tarihOk := hColMap["tarih"]
		aciklamaIdx, aciklamaOk := hColMap["açıklama"]
		islemTuruIdx, islemTuruOk := hColMap["işlem türü"]

		if cariUnvanIdx >= 0 && belgeTuruOk && tutarOk {
			tumCariler, _ := s.depo.TumCarileriListele(ctx)
			unvanToID := make(map[string]int64, len(tumCariler))
			for _, c := range tumCariler {
				unvanToID[strings.ToLower(strings.TrimSpace(c.Unvan))] = c.ID
			}
			for _, row := range hareketRows[1:] {
				if len(row) <= cariUnvanIdx || strings.TrimSpace(row[cariUnvanIdx]) == "" {
					continue
				}
				cariUnvan := strings.TrimSpace(row[cariUnvanIdx])
				cariID, ok := unvanToID[strings.ToLower(cariUnvan)]
				if !ok {
					continue
				}
				belgeTuru := strings.TrimSpace(row[belgeTuruIdx])
				if belgeTuru == "" {
					continue
				}
				tutar := 0.0
				if tutarOk && tutarIdx < len(row) {
					fmt.Sscanf(row[tutarIdx], "%f", &tutar)
				}
				if tutar <= 0 {
					continue
				}
				h := modeller.CariHareket{
					CariID:    cariID,
					CariUnvan: cariUnvan,
					BelgeTuru: belgeTuru,
					Tutar:     tutar,
				}
				if tarihOk && tarihIdx < len(row) {
					h.Tarih = strings.TrimSpace(row[tarihIdx])
				}
				if aciklamaOk && aciklamaIdx < len(row) {
					h.Aciklama = strings.TrimSpace(row[aciklamaIdx])
				}
				if islemTuruOk && islemTuruIdx < len(row) {
					h.IslemTuru = strings.TrimSpace(row[islemTuruIdx])
				}
				if _, err := s.depo.CariHareketOlustur(ctx, h); err != nil {
					return fmt.Errorf("hareket eklenemedi (%s - %s): %w", cariUnvan, belgeTuru, err)
				}
			}
		}
	}
	return nil
}

func (s *TicariServis) ExcelExportBase64(ctx context.Context) (string, error) {
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("ihracat_%d.xlsx", time.Now().UnixNano()))
	if err := s.excelExport(ctx, tmpFile); err != nil {
		return "", err
	}
	defer os.Remove(tmpFile)
	data, err := os.ReadFile(tmpFile)
	if err != nil {
		return "", fmt.Errorf("export dosyası okunamadı: %w", err)
	}
	return base64.StdEncoding.EncodeToString(data), nil
}

func (s *TicariServis) excelImportBase64Write(base64Data string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("base64 çözülemedi: %w", err)
	}
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("import_%d.xlsx", time.Now().UnixNano()))
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return "", fmt.Errorf("geçici dosya yazılamadı: %w", err)
	}
	return tmpFile, nil
}

func (s *TicariServis) ExcelImportBase64Kontrol(ctx context.Context, base64Data string) (modeller.ExcelImportKontrolSonuc, error) {
	tmpFile, err := s.excelImportBase64Write(base64Data)
	if err != nil {
		return modeller.ExcelImportKontrolSonuc{}, err
	}
	defer os.Remove(tmpFile)
	return s.ExcelImportKontrol(ctx, tmpFile)
}

func (s *TicariServis) ExcelImportBase64Import(ctx context.Context, base64Data string) error {
	tmpFile, err := s.excelImportBase64Write(base64Data)
	if err != nil {
		return err
	}
	defer os.Remove(tmpFile)
	return s.ExcelImport(ctx, tmpFile)
}

func (s *TicariServis) ExcelYedekKaydet(ctx context.Context, excelBase64, klasor string) error {
	if excelBase64 == "" {
		return nil
	}
	data, err := base64.StdEncoding.DecodeString(excelBase64)
	if err != nil {
		return fmt.Errorf("base64 çözülemedi: %w", err)
	}
	if err := os.MkdirAll(klasor, 0755); err != nil {
		return fmt.Errorf("klasör oluşturulamadı: %w", err)
	}
	ts := time.Now().Format("2006-01-02_150405")
	dst := filepath.Join(klasor, fmt.Sprintf("musteri_defteri_%s.xlsx", ts))
	if err := os.WriteFile(dst, data, 0644); err != nil {
		return fmt.Errorf("excel kaydedilemedi: %w", err)
	}
	return nil
}
