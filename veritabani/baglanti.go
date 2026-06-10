package veritabani

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func Baglan() (*sql.DB, func() error, error) {
	exeYolu, err := os.Executable()
	if err != nil {
		return nil, nil, err
	}
	veriKlasoru := filepath.Dir(exeYolu)

	db, err := sql.Open("sqlite", filepath.Join(veriKlasoru, "musteri_defteri.db"))
	if err != nil {
		return nil, nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if _, err := db.Exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;"); err != nil {
		_ = db.Close()
		return nil, nil, err
	}
	return db, db.Close, nil
}
