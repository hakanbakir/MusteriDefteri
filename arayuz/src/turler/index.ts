export interface SayfaliSonuc<T> {
  veriler: T[];
  toplam: number;
  sayfa: number;
  limit: number;
}

export interface CariHesap {
  id: number;
  unvan: string;
  telefon: string;
  eposta: string;
  adres: string;
  vergiNo: string;
  notlar?: string;
  bakiye: number;
  olusturma?: string;
}

export type IslemTuruTipi = "Nakit" | "Çek" | "Banka Hesabı" | "Kredi Kartı";

export interface CariHareket {
  id: number;
  cariId: number;
  cariUnvan?: string;
  cariBakiye?: number;
	belgeTuru: "Satış" | "İade" | "Tahsilat";
  belgeId: number;
  tutar: number;
  tarih: string;
  aciklama: string;
  islemTuru: string;
}

export interface Satis {
  id: number;
  cariId: number;
  cariUnvan?: string;
  tarih: string;
  aciklama: string;
  toplam: number;
  durum: string;
}

export interface Alis {
  id: number;
  cariId: number;
  cariUnvan?: string;
  tarih: string;
  aciklama: string;
  toplam: number;
  durum: string;
  islemTuru?: string;
}

export interface Kullanici {
  id: number;
  kullaniciAdi: string;
  rol: "admin" | "kullanici";
}

export interface Dashboard {
  toplamCari: number;
  toplamAlacak: number;
  sonIslemler: CariHareket[];
}

export interface GecikmisOdemeli {
  cariId: number;
  unvan: string;
  telefon: string;
  borc: number;
  sonSatis: string;
  gunFarki: number;
}

export interface ExcelImportKontrolSonuc {
  mevcutMu: number;
  toplam: number;
}

export interface Log {
  id: number;
  kullanici: string;
  islem: string;
  detay: string;
  tarih: string;
}

export interface SayfaliLog {
  veriler: Log[];
  toplam: number;
  sayfa: number;
  limit: number;
}

declare global {
  interface Window {
    go?: {
      main: {
        Uygulama: Record<string, (...args: unknown[]) => Promise<unknown>>;
      };
    };
  }
}
