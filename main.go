package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"
)

//go:embed all:arayuz/dist
var varliklar embed.FS

func main() {
	uygulama, err := YeniUygulama()
	if err != nil {
		log.Fatal(err)
	}
	uygulama.ctx = context.Background()
	uygulama.baslatma = uygulama.servis.VeritabaniHazirla(uygulama.ctx)
	uygulama.BaslangicYedekKontrol()

	mux := http.NewServeMux()
	mux.Handle("/api/", uygulama)
	mux.Handle("/", spaHandler(varliklar))

	server := &http.Server{
		Addr:    "127.0.0.1:8080",
		Handler: mux,
	}
	go func() {
		log.Println("http://localhost:8080")
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	time.Sleep(500 * time.Millisecond)

	openWindow("http://localhost:8080", "Müşteri Defteri", 1360, 860)

	server.Shutdown(context.Background())
	os.Exit(0)
}

func spaHandler(varliklar embed.FS) http.Handler {
	alt, err := fs.Sub(varliklar, "arayuz/dist")
	if err != nil {
		log.Fatal(err)
	}
	fsHandler := http.FileServer(http.FS(alt))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			f, err := alt.Open(r.URL.Path[1:])
			if err == nil {
				f.Close()
				fsHandler.ServeHTTP(w, r)
				return
			}
		}
		r.URL.Path = "/"
		fsHandler.ServeHTTP(w, r)
	})
}
