package hatalar

import "errors"

var (
	ErrKayitBulunamadi = errors.New("kayıt bulunamadı")
	ErrGecersizVeri    = errors.New("geçersiz veri")
	ErrYetersizStok    = errors.New("yetersiz stok")
)
