import type { Alis, CariHareket, CariHesap, Dashboard, ExcelImportKontrolSonuc, GecikmisOdemeli, Kullanici, Log, Satis, SayfaliLog, SayfaliSonuc } from "../turler";

const API_BASE = "/api";

async function apiCall<T>(method: string, args: Record<string, any> = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: Object.keys(args).length > 0 ? JSON.stringify(args) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  dashboardGetir: (baslangic?: string, bitis?: string) =>
    apiCall<Dashboard>("DashboardGetir", { baslangic: baslangic ?? "", bitis: bitis ?? "" }),
  carileriListele: (p: { arama?: string; sayfa?: number; limit?: number; sirala?: string; yon?: string }) =>
    apiCall<SayfaliSonuc<CariHesap>>("CarileriListele", { arama: p.arama ?? "", sayfa: p.sayfa ?? 1, limit: p.limit ?? 10, sirala: p.sirala ?? "unvan", yon: p.yon ?? "asc" }),
  cariGetir: (id: number) =>
    apiCall<CariHesap>("CariGetir", { id }),
  cariKaydet: (cari: CariHesap) =>
    apiCall<CariHesap>("CariKaydet", { cari }),
  cariSil: (id: number) =>
    apiCall<void>("CariSil", { id }),
  cariHareketleriListele: (cariId: number) =>
    apiCall<CariHareket[]>("CariHareketleriListele", { cariId }),
  cariHareketOlustur: (hareket: CariHareket) =>
    apiCall<CariHareket>("CariHareketOlustur", { hareket }),
  cariHareketSil: (id: number) =>
    apiCall<void>("CariHareketSil", { id }),
  cariHareketGuncelle: (h: CariHareket) =>
    apiCall<CariHareket>("CariHareketGuncelle", { hareket: h }),
  satislariListele: (p: { arama?: string; sayfa?: number; limit?: number }) =>
    apiCall<SayfaliSonuc<Satis>>("SatislariListele", { arama: p.arama ?? "", sayfa: p.sayfa ?? 1, limit: p.limit ?? 10 }),
  satisOlustur: (s: Satis) =>
    apiCall<Satis>("SatisOlustur", { satis: s }),
  alislariListele: (p: { arama?: string; sayfa?: number; limit?: number }) =>
    apiCall<SayfaliSonuc<Alis>>("AlislariListele", { arama: p.arama ?? "", sayfa: p.sayfa ?? 1, limit: p.limit ?? 10 }),
  alisOlustur: (a: Alis) =>
    apiCall<Alis>("AlisOlustur", { alis: a }),
  ayarGetir: (anahtar: string) =>
    apiCall<string>("AyarGetir", { anahtar }),
  ayarKaydet: (anahtar: string, deger: string) =>
    apiCall<void>("AyarKaydet", { anahtar, deger }),
  yedekAl: () =>
    apiCall<void>("YedekAl"),
  yedekSonGetir: () =>
    apiCall<string>("YedekSonGetir"),
  yedekSayisiGetir: () =>
    apiCall<number>("YedekSayisiGetir"),
  excelYedekSayisiGetir: () =>
    apiCall<number>("ExcelYedekSayisiGetir"),
  yedekKlasoruAc: () =>
    apiCall<void>("YedekKlasoruAc"),
  excelYedekKaydet: (excelBase64: string) =>
    apiCall<void>("ExcelYedekKaydet", { excelBase64 }),
  excelExportKaydet: (excelBase64: string, hedefKlasor: string) =>
    apiCall<void>("ExcelExportKaydet", { excelBase64, hedefKlasor }),
  excelExportOlustur: (hedefKlasor: string) =>
    apiCall<void>("ExcelExportOlustur", { hedefKlasor }),
  excelExportAl: () =>
    apiCall<string>("ExcelExportAl"),
  excelImportBase64Kontrol: (dosyaBase64: string) =>
    apiCall<ExcelImportKontrolSonuc>("ExcelImportBase64Kontrol", { dosyaBase64 }),
  excelImportBase64Import: (dosyaBase64: string) =>
    apiCall<void>("ExcelImportBase64Import", { dosyaBase64 }),
  logKaydet: (islem: string, detay: string) =>
    apiCall<void>("LogKaydet", { islem, detay }),
  loglariListele: (sayfa: number, limit: number) =>
    apiCall<SayfaliLog>("LoglariListele", { sayfa, limit }),
  loglariSil: () =>
    apiCall<void>("LoglariSil"),
  silmeKoduGetir: () =>
    apiCall<string>("SilmeKoduGetir"),
  silmeKoduKaydet: (kod: string) =>
    apiCall<void>("SilmeKoduKaydet", { kod }),
  kullaniciGiris: (kullaniciAdi: string, sifre: string) =>
    apiCall<Kullanici>("KullaniciGiris", { kullaniciAdi, sifre }),
  kullaniciCikis: () =>
    apiCall<void>("KullaniciCikis"),
  kullaniciDogrula: (kullaniciAdi: string) =>
    apiCall<Kullanici>("KullaniciDogrula", { kullaniciAdi }),
  kullaniciListele: () =>
    apiCall<Kullanici[]>("KullaniciListele"),
  kullaniciEkle: (k: Kullanici) =>
    apiCall<Kullanici>("KullaniciEkle", { kullanici: k }),
  kullaniciSil: (id: number) =>
    apiCall<void>("KullaniciSil", { id }),
  kullaniciSifreDegistir: (id: number, yeniSifre: string) =>
    apiCall<void>("KullaniciSifreDegistir", { id, yeniSifre }),
  gecikmisOdemelerGetir: (ay: number) =>
    apiCall<GecikmisOdemeli[]>("GecikmisOdemelerGetir", { ay }),
};
