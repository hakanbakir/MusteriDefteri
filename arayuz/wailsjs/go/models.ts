export namespace modeller {
	
	export class Alis {
	    id: number;
	    cariId: number;
	    cariUnvan: string;
	    tarih: string;
	    aciklama: string;
	    toplam: number;
	    durum: string;
	    islemTuru: string;
	
	    static createFrom(source: any = {}) {
	        return new Alis(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.cariId = source["cariId"];
	        this.cariUnvan = source["cariUnvan"];
	        this.tarih = source["tarih"];
	        this.aciklama = source["aciklama"];
	        this.toplam = source["toplam"];
	        this.durum = source["durum"];
	        this.islemTuru = source["islemTuru"];
	    }
	}
	export class CariHareket {
	    id: number;
	    cariId: number;
	    cariUnvan: string;
	    cariBakiye: number;
	    belgeTuru: string;
	    belgeId: number;
	    tutar: number;
	    tarih: string;
	    aciklama: string;
	    islemTuru: string;
	
	    static createFrom(source: any = {}) {
	        return new CariHareket(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.cariId = source["cariId"];
	        this.cariUnvan = source["cariUnvan"];
	        this.cariBakiye = source["cariBakiye"];
	        this.belgeTuru = source["belgeTuru"];
	        this.belgeId = source["belgeId"];
	        this.tutar = source["tutar"];
	        this.tarih = source["tarih"];
	        this.aciklama = source["aciklama"];
	        this.islemTuru = source["islemTuru"];
	    }
	}
	export class CariHesap {
	    id: number;
	    unvan: string;
	    telefon: string;
	    eposta: string;
	    adres: string;
	    vergiNo: string;
	    notlar: string;
	    bakiye: number;
	    olusturma: string;
	
	    static createFrom(source: any = {}) {
	        return new CariHesap(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.unvan = source["unvan"];
	        this.telefon = source["telefon"];
	        this.eposta = source["eposta"];
	        this.adres = source["adres"];
	        this.vergiNo = source["vergiNo"];
	        this.notlar = source["notlar"];
	        this.bakiye = source["bakiye"];
	        this.olusturma = source["olusturma"];
	    }
	}
	export class Dashboard {
	    toplamCari: number;
	    toplamAlacak: number;
	    sonIslemler: CariHareket[];
	
	    static createFrom(source: any = {}) {
	        return new Dashboard(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.toplamCari = source["toplamCari"];
	        this.toplamAlacak = source["toplamAlacak"];
	        this.sonIslemler = this.convertValues(source["sonIslemler"], CariHareket);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExcelImportKontrolSonuc {
	    mevcutMu: number;
	    toplam: number;
	
	    static createFrom(source: any = {}) {
	        return new ExcelImportKontrolSonuc(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mevcutMu = source["mevcutMu"];
	        this.toplam = source["toplam"];
	    }
	}
	export class GecikmisOdemeli {
	    cariId: number;
	    unvan: string;
	    telefon: string;
	    borc: number;
	    sonSatis: string;
	    gunFarki: number;
	
	    static createFrom(source: any = {}) {
	        return new GecikmisOdemeli(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cariId = source["cariId"];
	        this.unvan = source["unvan"];
	        this.telefon = source["telefon"];
	        this.borc = source["borc"];
	        this.sonSatis = source["sonSatis"];
	        this.gunFarki = source["gunFarki"];
	    }
	}
	export class Kullanici {
	    id: number;
	    kullaniciAdi: string;
	    rol: string;
	
	    static createFrom(source: any = {}) {
	        return new Kullanici(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.kullaniciAdi = source["kullaniciAdi"];
	        this.rol = source["rol"];
	    }
	}
	export class Log {
	    id: number;
	    kullanici: string;
	    islem: string;
	    detay: string;
	    tarih: string;
	
	    static createFrom(source: any = {}) {
	        return new Log(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.kullanici = source["kullanici"];
	        this.islem = source["islem"];
	        this.detay = source["detay"];
	        this.tarih = source["tarih"];
	    }
	}
	export class Satis {
	    id: number;
	    cariId: number;
	    cariUnvan: string;
	    tarih: string;
	    aciklama: string;
	    toplam: number;
	    durum: string;
	
	    static createFrom(source: any = {}) {
	        return new Satis(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.cariId = source["cariId"];
	        this.cariUnvan = source["cariUnvan"];
	        this.tarih = source["tarih"];
	        this.aciklama = source["aciklama"];
	        this.toplam = source["toplam"];
	        this.durum = source["durum"];
	    }
	}
	export class SayfaliLog {
	    veriler: Log[];
	    toplam: number;
	    sayfa: number;
	    limit: number;
	
	    static createFrom(source: any = {}) {
	        return new SayfaliLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.veriler = this.convertValues(source["veriler"], Log);
	        this.toplam = source["toplam"];
	        this.sayfa = source["sayfa"];
	        this.limit = source["limit"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SayfaliSonuc_cari_modeller_Alis_ {
	    veriler: Alis[];
	    toplam: number;
	    sayfa: number;
	    limit: number;
	
	    static createFrom(source: any = {}) {
	        return new SayfaliSonuc_cari_modeller_Alis_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.veriler = this.convertValues(source["veriler"], Alis);
	        this.toplam = source["toplam"];
	        this.sayfa = source["sayfa"];
	        this.limit = source["limit"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SayfaliSonuc_cari_modeller_CariHesap_ {
	    veriler: CariHesap[];
	    toplam: number;
	    sayfa: number;
	    limit: number;
	
	    static createFrom(source: any = {}) {
	        return new SayfaliSonuc_cari_modeller_CariHesap_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.veriler = this.convertValues(source["veriler"], CariHesap);
	        this.toplam = source["toplam"];
	        this.sayfa = source["sayfa"];
	        this.limit = source["limit"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SayfaliSonuc_cari_modeller_Satis_ {
	    veriler: Satis[];
	    toplam: number;
	    sayfa: number;
	    limit: number;
	
	    static createFrom(source: any = {}) {
	        return new SayfaliSonuc_cari_modeller_Satis_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.veriler = this.convertValues(source["veriler"], Satis);
	        this.toplam = source["toplam"];
	        this.sayfa = source["sayfa"];
	        this.limit = source["limit"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

