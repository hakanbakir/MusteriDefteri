import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Activity, ArrowLeft, BarChart3, ChevronLeft, ChevronRight, ClipboardList, Clock, CreditCard, FileSpreadsheet, FileText, HardDrive, Landmark, Mail, MapPin, Pencil, Phone, RotateCcw, Search, Settings, TrendingUp, Trash2, Users, Wallet, X } from "lucide-react";
import openBookLogo from "./assets/open-book-logo.png";
import { api } from "./servisler/api";
import type { Alis, CariHareket, CariHesap, Dashboard, IslemTuruTipi, Kullanici, Log, Satis, SayfaliLog, SayfaliSonuc } from "./turler";
import { AramaKutusu, BirincilButon, IkonButon, Panel, Sayfalama, SiralamaBaslik, para } from "./bilesenler/Yardimcilar";
import gplMetin from "./bilesenler/gpl";

type Sayfa = "dashboard" | "cariler" | "ayarlar" | "loglar";
type IslemTuru = "Satış" | "İade" | "Tahsilat";
const menuler = [
  { id: "dashboard", ad: "Gösterge Paneli", icon: BarChart3 },
  { id: "cariler", ad: "Müşteriler", icon: Users }
] as const;

const yanBarStil = {
  bg: "bg-white dark:bg-slate-900",
  text: "text-slate-600 dark:text-slate-300",
  aktif: "bg-[var(--renk-marka-600)] text-[var(--renk-marka-yazi)] border border-[var(--renk-marka-border)]",
  pasif: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  border: "border-slate-200 dark:border-slate-800",
  logoBg: "bg-[var(--renk-marka-600)] text-[var(--renk-marka-yazi)] border border-[var(--renk-marka-border)]",
  logoText: "text-slate-900 dark:text-slate-100",
  divider: "border-slate-200 dark:border-slate-800",
  aciklama: "text-slate-500"
};

const ustBarStil = {
  bg: "bg-white dark:bg-slate-900",
  border: "border-b border-slate-200 dark:border-slate-800",
  text: "text-slate-800 dark:text-slate-100"
};

function LisansModal({ acik, kapat }: { acik: boolean; kapat: () => void }) {
  if (!acik) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={kapat}>
      <div className="mx-4 max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">GNU Genel Kamu Lisansı v3</h2>
          <button onClick={kapat} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">&times;</button>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <p><strong>Müşteri Defteri</strong> — Copyright (C) 2026 <strong>Hakan Bakır</strong></p>
          <p>Kaynak kod: <a href="https://github.com/hakanbakir/MusteriDefteri" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">github.com/hakanbakir/MusteriDefteri</a></p>
          <p>Bu program özgür bir yazılımdır: GNU Genel Kamu Lisansı'nın (GNU General Public License) 3. sürümü veya (isteğe bağlı olarak) daha sonraki bir sürümünün koşulları altında yeniden dağıtabilir ve/veya değiştirebilirsiniz.</p>
          <p>Bu program, yararlı olması umuduyla dağıtılmaktadır, ancak HERHANGİ BİR GARANTİ OLMADAN; belirli bir AMACA UYGUNLUK veya SATILABİLİRLİK garantisi olmadan dağıtılmaktadır. Ayrıntılar için GNU Genel Kamu Lisansı'na bakın.</p>
          <p>Bu programla birlikte GNU Genel Kamu Lisansı'nın bir kopyasını almış olmalısınız. Eğer almadıysanız, <a href="https://www.gnu.org/licenses/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">https://www.gnu.org/licenses/</a> adresini ziyaret edin.</p>
          <hr className="border-slate-200 dark:border-slate-700" />
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Tam Lisans Metnini Göster</summary>
            <pre className="mt-4 max-h-[400px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">{gplMetin}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

const yerelTarihStr = () => {
  const simdi = new Date();
  simdi.setMinutes(simdi.getMinutes() - simdi.getTimezoneOffset());
  return simdi.toISOString().slice(0, 16);
};

const tarihFormatla = (t: string) => {
  if (!t) return "-";
  const [tarihKisim, saatKisim] = t.split("T");
  const [y, ay, g] = tarihKisim.split("-");
  const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  return `${parseInt(g)} ${aylar[parseInt(ay) - 1]} ${y}${saatKisim ? " " + saatKisim : ""}`;
};

const bosCari: CariHesap = { id: 0, unvan: "", telefon: "", eposta: "", adres: "", vergiNo: "", notlar: "", bakiye: 0 };

const tabloStil = {
  kapsayici: "overflow-hidden rounded-xl border border-[var(--ui-border)] bg-gradient-to-br from-slate-100 via-white to-blue-100/60 shadow-sm dark:border-[var(--ui-dark-border)] dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/40",
  baslikSatiri: "border-b border-[var(--ui-border)] bg-[var(--ui-bg-table-header)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--ui-text-muted)] dark:border-[var(--ui-dark-border)] dark:bg-[var(--ui-dark-bg-table-header)] dark:text-[var(--ui-dark-text-muted)]",
  govde: "divide-y divide-[var(--ui-border)] dark:divide-[var(--ui-dark-border)]",
  satir: "transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40",
  hucre: "px-4 py-3.5",
  hucreMerkez: "px-4 py-3.5 text-center",
  hucreSag: "px-4 py-3.5 text-right",
  metin: "text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]",
} as const;

function ModalKatmani({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      {children}
    </div>,
    document.body
  );
}

function OnayModal({ acik, baslik, mesaj, onayla, iptal }: { acik: boolean; baslik: string; mesaj: string; onayla: () => void; iptal: () => void }) {
  const [kod, setKod] = useState("");
  const [kodHata, setKodHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kayitliKod, setKayitliKod] = useState("");
  useEffect(() => { if (acik) api.silmeKoduGetir().then(setKayitliKod); }, [acik]);
  if (!acik) return null;
  const handleOnayla = async () => {
    setYukleniyor(true);
    if (kayitliKod && kod !== kayitliKod) {
      setKodHata("Hatalı kod!");
      setYukleniyor(false);
      return;
    }
    setKod("");
    setKodHata("");
    setYukleniyor(false);
    onayla();
  };
  return (
    <ModalKatmani>
      <div className="w-full max-w-sm rounded-lg border border-red-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-xl dark:border-red-900/60 dark:from-blue-950 dark:via-slate-900 dark:to-blue-900">
        <div className="flex h-14 items-center border-b border-red-100 px-5 dark:border-red-900/30">
          <h2 className="text-sm font-bold text-red-700 dark:text-red-400">{baslik}</h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">{mesaj}</p>
          {kayitliKod && <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Silme Onay Kodu</label>
            <input type="text" inputMode="numeric" maxLength={4} value={kod} onChange={(e) => { setKod(e.target.value.replace(/\D/g, "").slice(0, 4)); setKodHata(""); }} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-center text-lg font-bold tracking-[0.5em] outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" placeholder="****" />
            {kodHata && <p className="mt-1 text-xs text-red-500">{kodHata}</p>}
          </div>}
          <div className="flex justify-end gap-3">
            <button type="button" disabled={yukleniyor} onClick={() => { setKod(""); setKodHata(""); iptal(); }} className="inline-flex h-9 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Vazgeç</button>
            <button type="button" disabled={yukleniyor} onClick={handleOnayla} className="inline-flex h-9 items-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700">{yukleniyor ? "..." : "Evet, Sil"}</button>
          </div>
        </div>
      </div>
    </ModalKatmani>
  );
}

function LoginSayfasi({ setKullanici, beniHatirla, lisansAc }: { setKullanici: (k: Kullanici) => void; beniHatirla: boolean; lisansAc: () => void }) {
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const girisYap = async () => {
    if (!kullaniciAdi || !sifre) { setHata("Kullanıcı adı ve şifre girin."); return; }
    setYukleniyor(true); setHata("");
    try {
      const k = await api.kullaniciGiris(kullaniciAdi, sifre);
      if (beniHatirla) localStorage.setItem("oturum", JSON.stringify(k));
      else localStorage.removeItem("oturum");
      setKullanici(k);
    } catch { setHata("Hatalı kullanıcı adı veya şifre."); }
    setYukleniyor(false);
  };
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(244,114,182,0.12),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.8)_0%,_rgba(255,255,255,0.3)_100%)]" />
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl" />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-14 pt-4">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/90 p-8 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <img src={openBookLogo} alt="" aria-hidden="true" className="mx-auto mb-4 h-24 w-24 object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,0.16)]" />
            <div className="mx-auto h-1.5 w-24 rounded-full bg-[linear-gradient(90deg,#38bdf8,#2563eb,#f472b6)]" />
            <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Müşteri Defteri</h1>
            <p className="mt-2 text-sm text-slate-500">Hesabınıza giriş yapın ve iş akışınızı tek merkezden yönetin</p>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-600">Kullanıcı Adı</label><input type="text" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} onKeyDown={(e) => e.key === "Enter" && girisYap()} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10" placeholder="Kullanıcı adınızı girin" /></div>
            <div><label className="block text-sm font-medium text-slate-600">Şifre</label><input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && girisYap()} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10" placeholder="Şifrenizi girin" /></div>
            {hata && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{hata}</p>}
            <button type="button" disabled={yukleniyor} onClick={girisYap} className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] px-4 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50">{yukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
          </div>
        </div>
      </div>
        <p className="absolute bottom-4 left-0 right-0 text-center text-[13px] text-slate-500"><button onClick={lisansAc} className="cursor-pointer transition hover:text-slate-800 focus:outline-none focus:underline">Müşteri Defteri {import.meta.env.VITE_APP_VERSION || "v0.4.5"} — GNU Genel Kamu Lisansı v3 ile lisanslanmıştır (GNU GPLv3). Hakan Bakır ©2026</button></p>
    </div>
  );
}

export default function App() {
  const [girisYapanKullanici, setGirisYapanKullanici] = useState<Kullanici | null>(null);
  const [authHazir, setAuthHazir] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(true);
  // Otomatik girişte backend currentUser'ı ayarla
  useEffect(() => {
    (async () => {
      try {
        const ayar = await api.ayarGetir("beni_hatirla");
        const aktif = ayar === "" ? true : ayar === "true";
        setBeniHatirla(aktif);
        if (!aktif) {
          localStorage.removeItem("oturum");
          setGirisYapanKullanici(null);
        } else {
          try {
            const o = localStorage.getItem("oturum");
            if (o) setGirisYapanKullanici(JSON.parse(o));
          } catch {}
        }
      } finally {
        setAuthHazir(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!authHazir || !girisYapanKullanici) return;
    (async () => {
      try {
        const adi = await api.ayarGetir("isletme_adi");
        if (adi) { setIsletmeAdi(adi); localStorage.setItem("isletme_adi", adi); }
        else { setIsletmeAdi(""); localStorage.removeItem("isletme_adi"); }
        const logo = await api.ayarGetir("isletme_logo");
        if (logo) { setIsletmeLogosu(logo); localStorage.setItem("isletme_logo", logo); }
        else { setIsletmeLogosu(""); localStorage.removeItem("isletme_logo"); }
      } catch {}
    })();
    api.kullaniciDogrula(girisYapanKullanici.kullaniciAdi).catch(() => {
      localStorage.removeItem("oturum");
      setGirisYapanKullanici(null);
    });
  }, [authHazir, girisYapanKullanici]);
  const [sayfa, setSayfa] = useState<Sayfa>("dashboard");
  const [seciliCariID, setSeciliCariID] = useState<number | null>(null);
  const [isletmeAdi, setIsletmeAdi] = useState(() => { try { return localStorage.getItem("isletme_adi") || ""; } catch { return ""; } });
  const [isletmeLogosu, setIsletmeLogosu] = useState(() => { try { return localStorage.getItem("isletme_logo") || ""; } catch { return ""; } });
  const [lisansAcik, setLisansAcik] = useState(false);

  useEffect(() => { document.documentElement.classList.remove("dark"); localStorage.removeItem("tema"); }, []);

  

  return (
    <>
    {!authHazir && <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] text-slate-500">Yükleniyor...</div>}
    {authHazir && !girisYapanKullanici && <LoginSayfasi setKullanici={(k) => { setGirisYapanKullanici(k); }} beniHatirla={beniHatirla} lisansAc={() => setLisansAcik(true)} />}
    {girisYapanKullanici && <div className="flex h-screen bg-[var(--ui-bg-body)] text-slate-900 dark:bg-[var(--ui-dark-bg-body)] dark:text-slate-100">
      <aside className={`flex w-72 shrink-0 flex-col border-r ${yanBarStil.border} ${yanBarStil.bg} ${yanBarStil.text} bg-gradient-to-b from-white via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800`}>
        <div className={`flex h-[72px] items-center gap-3 border-b px-[5px] ${yanBarStil.divider}`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300/20 ${yanBarStil.logoBg}`}>
            {isletmeLogosu ? <img src={isletmeLogosu} className="h-8 w-8 rounded object-contain" /> : <BarChart3 size={18} />}
          </div>
          <div>
            <h1 className={`text-base font-bold ${yanBarStil.logoText}`}>{isletmeAdi || "Müşteri Defteri"}</h1>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {menuler.map((menu) => {
            const Icon = menu.icon;
            const aktif = sayfa === menu.id && !seciliCariID;
            return (
              <button key={menu.id} onClick={() => { setSayfa(menu.id); setSeciliCariID(null); }} className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${aktif ? yanBarStil.aktif : yanBarStil.pasif}`}>
                <Icon size={18} />
                {menu.ad}
              </button>
            );
          })}
            {girisYapanKullanici?.rol === "admin" && (
              <button onClick={() => { setSayfa("loglar"); setSeciliCariID(null); }} className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${sayfa === "loglar" && !seciliCariID ? yanBarStil.aktif : yanBarStil.pasif}`}>
                <ClipboardList size={18} />
                Loglar
              </button>
            )}
        </nav>
        <div className={`border-t p-3 ${yanBarStil.divider}`}>
          <button onClick={() => { setSayfa("ayarlar"); setSeciliCariID(null); }} className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${sayfa === "ayarlar" && !seciliCariID ? yanBarStil.aktif : yanBarStil.pasif}`}>
            <Settings size={18} />
            Ayarlar
          </button>
          <button onClick={async () => { await api.kullaniciCikis(); localStorage.removeItem("oturum"); localStorage.removeItem("db"); localStorage.removeItem("cl"); setGirisYapanKullanici(null); }} className={`mt-1 flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${yanBarStil.pasif} text-red-500 hover:text-red-700 dark:hover:text-red-400`}>
            <X size={18} />
            Çıkış Yap
          </button>
        </div>
        <div className={`border-t p-3 text-[10px] ${yanBarStil.divider} ${yanBarStil.aciklama}`}><button onClick={() => setLisansAcik(true)} className="cursor-pointer text-left hover:text-slate-700 dark:hover:text-slate-300">Müşteri Defteri 2026© {import.meta.env.VITE_APP_VERSION || "v0.4.5"}</button></div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className={`flex h-[72px] items-center justify-between pl-5 pr-2 ${ustBarStil.bg} ${ustBarStil.border} ${ustBarStil.text}`}>
          <div className="space-y-0.5">
            <p className="text-base font-medium">Hoş Geldiniz <span className="font-semibold">{girisYapanKullanici?.kullaniciAdi}</span></p>
            <p className="text-xs opacity-50">{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}</p>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {seciliCariID ? (
            <CariDetaySayfasi cariID={seciliCariID} geriDon={() => setSeciliCariID(null)} />
          ) : (
            <>
              {sayfa === "dashboard" && <DashboardSayfasi onCariAc={setSeciliCariID} />}
              {sayfa === "cariler" && <CariSayfasi onCariAc={setSeciliCariID} />}
              
              {sayfa === "ayarlar" && <AyarlarSayfasi kullanici={girisYapanKullanici!} isletmeAdi={isletmeAdi} setIsletmeAdi={setIsletmeAdi} isletmeLogosu={isletmeLogosu} setIsletmeLogosu={setIsletmeLogosu} beniHatirla={beniHatirla} setBeniHatirla={setBeniHatirla} />}
              {sayfa === "loglar" && <LoglarSayfasi />}
            </>
          )}
        </div>
      </main>
    </div>}
      <LisansModal acik={lisansAcik} kapat={() => setLisansAcik(false)} />
    </>
  );
}

function DashboardSayfasi({ onCariAc }: { onCariAc: (id: number) => void }) {
  const [veri, setVeri] = useState<Dashboard | null>(null);
  const [baslangic, setBaslangic] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [bitis, setBitis] = useState(() => new Date().toISOString().slice(0, 10));
  const [filtre, setFiltre] = useState({ satis: true, tahsilat: true, iade: true });
  const [sonIslemler, setSonIslemler] = useState(false);
  const [dSayfa, setDSayfa] = useState(1);
  const [dLimit, setDLimit] = useState(30);
  const [dPreset, setDPreset] = useState("1hafta");
  const [dSiralama, setDSiralama] = useState<{ kolon: string; yon: "asc" | "desc" }>({ kolon: "tarih", yon: "desc" });
  const [ilk, setIlk] = useState(true);
  useEffect(() => {
    const s = localStorage.getItem("db");
    if (s) try {
      const o = JSON.parse(s);
      if (o.filtre) setFiltre(o.filtre);
      if (o.sonIslemler !== undefined) setSonIslemler(o.sonIslemler);
      if (o.dSayfa) setDSayfa(o.dSayfa);
      if (o.dLimit) setDLimit(o.dLimit);
      if (o.dPreset) setDPreset(o.dPreset);
      if (o.dSiralama) setDSiralama(o.dSiralama);
      if (o.baslangic) setBaslangic(o.baslangic);
      if (o.bitis) setBitis(o.bitis);
    } catch {}
    setIlk(false);
  }, []);
  useEffect(() => {
    if (ilk) return;
    localStorage.setItem("db", JSON.stringify({ baslangic, bitis, filtre, sonIslemler, dSayfa, dLimit, dPreset, dSiralama }));
  }, [baslangic, bitis, filtre, sonIslemler, dSayfa, dLimit, dPreset, dSiralama, ilk]);
  const yenile = () => api.dashboardGetir(baslangic, bitis).then(setVeri);
  useEffect(() => { yenile(); }, [baslangic, bitis]);
  const veriGuncellendiRef = useRef(() => {});
  veriGuncellendiRef.current = () => { yenile(); api.dashboardGetir("", "").then(setChartVeri); };
  const [chartVeri, setChartVeri] = useState<Dashboard | null>(null);
  useEffect(() => { api.dashboardGetir("", "").then(setChartVeri); const h = () => veriGuncellendiRef.current(); window.addEventListener("veri-guncellendi", h); return () => window.removeEventListener("veri-guncellendi", h); }, []);
  const [grafikTip, setGrafikTip] = useState<"gunluk" | "aylik">("gunluk");
  const [tahsilatGrafikTip, setTahsilatGrafikTip] = useState<"gunluk" | "aylik">("gunluk");
  const filtreliHam = veri?.sonIslemler?.filter(h =>
    (h.belgeTuru === "Satış" && filtre.satis) ||
    (h.belgeTuru === "Tahsilat" && filtre.tahsilat) ||
    (h.belgeTuru === "İade" && filtre.iade)
  ) ?? [];
  const filtreli = sonIslemler
    ? Object.values(filtreliHam.reduce((acc, h) => {
        if (!acc[h.cariId] || h.tarih > acc[h.cariId].tarih) acc[h.cariId] = h;
        return acc;
      }, {} as Record<number, (typeof filtreliHam)[0]>))
    : filtreliHam;
  const dSiralamaDegistir = (kolon: string) => setDSiralama(s => ({ kolon, yon: s.kolon === kolon && s.yon === "asc" ? "desc" : "asc" }));
  const sirali = [...filtreli].sort((a, b) => {
    let v = 0;
    if (dSiralama.kolon === "musteri") v = (a.cariUnvan || "").localeCompare(b.cariUnvan || "", "tr");
    else if (dSiralama.kolon === "tutar") v = a.tutar - b.tutar;
    else v = (a.tarih || "").localeCompare(b.tarih || "");
    return dSiralama.yon === "asc" ? v : -v;
  });
  const dToplamSayfa = Math.max(1, Math.ceil(filtreli.length / dLimit));
  const sayfaFiltreli = sirali.slice((dSayfa - 1) * dLimit, dSayfa * dLimit);
  const ozet = filtreli.reduce((a, h) => {
    if (h.belgeTuru === "Satış") { a.satis += h.tutar; a.satisSayi++; }
    else if (h.belgeTuru === "Tahsilat") { a.tahsilat += h.tutar; a.tahsilatSayi++; }
    else if (h.belgeTuru === "İade") { a.iade += h.tutar; a.iadeSayi++; }
    return a;
  }, { satis: 0, tahsilat: 0, iade: 0, satisSayi: 0, tahsilatSayi: 0, iadeSayi: 0 }) ?? { satis: 0, tahsilat: 0, iade: 0, satisSayi: 0, tahsilatSayi: 0, iadeSayi: 0 };
  const ia = () => { try { return localStorage.getItem("isletme_adi") || ""; } catch { return ""; } };
  const dashboardExcelExport = () => {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const gf = (tarih: string) => {
        const s = new Date(tarih.slice(0, 10) + "T00:00:00"), n = Date.now();
        const gf = Math.floor((n - s.getTime()) / 86400000);
        const y = Math.floor(gf / 365), k = gf % 365, a = Math.floor(k / 30), g = k % 30;
        const p: string[] = [];
        if (y > 0) p.push(y + ' yıl');
        if (a > 0) p.push(a + ' ay');
        p.push(g + ' gün');
        return p.join(' ');
      };
      const veri = [
        [ia()],
        [],
        ["#", "Müşteri", "İşlem", "Açıklama", "Tarih", "Kalan Borç"],
        ...filtreli.map((h, idx) => [
          String(idx + 1),
          h.cariUnvan,
          h.belgeTuru + " (" + (h.tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL)",
          h.aciklama || "-",
          h.tarih.replace("T", " ") + " (İşlemden bu yana " + gf(h.tarih) + " geçti)",
          h.cariBakiye != null ? (h.cariBakiye || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL" : "-"
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(veri);
      XLSX.utils.book_append_sheet(wb, ws, "İşlemler");
      XLSX.writeFile(wb, "islemler.xlsx");
    });
  };
  const dashboardPdfExport = () => {
    const sf = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL";
    const gf = (tarih: string) => {
      const s = new Date(tarih.slice(0, 10) + "T00:00:00"), n = Date.now();
      const gf = Math.floor((n - s.getTime()) / 86400000);
      const y = Math.floor(gf / 365), k = gf % 365, a = Math.floor(k / 30), g = k % 30;
      const p: string[] = [];
      if (y > 0) p.push(y + ' yıl');
      if (a > 0) p.push(a + ' ay');
      p.push(g + ' gün');
      return p.join(' ');
    };
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>İşlemler</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:20px}
.isletme{font-size:22px;font-weight:700;color:#222;margin-bottom:5px;text-align:center}
h2{color:#222;font-size:18px;margin:20px 0 15px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th,td{border:1px solid #aaa;padding:7px 10px;text-align:left}
th{background:#6366f1;color:#fff;font-size:12px;font-weight:700}
.sag{text-align:right}
@media print{@page{size:auto;margin:0}body{margin:0;padding:15px}}</style></head><body>
${ia() ? `<div class="isletme">${ia()}</div>` : ""}
<h2>İşlem Raporu</h2>
<table><thead><tr>${["#", "Müşteri", "İşlem", "Açıklama", "Tarih", "Kalan Borç"].map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
    for (const [idx, h] of filtreli.entries()) {
      html += `<tr><td>${idx + 1}</td><td>${h.cariUnvan}</td><td>${h.belgeTuru} (${sf(h.tutar)})</td><td>${h.aciklama || "-"}</td><td>${h.tarih.replace("T", " ")} (İşlemden bu yana ${gf(h.tarih)} geçti)</td><td class="sag">${h.cariBakiye != null ? sf(h.cariBakiye) : "-"}</td></tr>`;
    }
    html += `</tbody></table>
<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };
  const grafikVeri = (() => {
    const gruplar: Record<string, number> = {};
    for (const h of (chartVeri?.sonIslemler ?? [])) {
      if (h.belgeTuru === "Satış") {
        const anahtar = grafikTip === "gunluk" ? h.tarih.slice(0, 10) : h.tarih.slice(0, 7);
        gruplar[anahtar] = (gruplar[anahtar] || 0) + h.tutar;
      }
    }
    const keys = Object.keys(gruplar).sort();
    const max = Math.max(...Object.values(gruplar), 1) * 1.2;
    const CH = 160, CW = 40, barW = 34;
    return { keys, gruplar, max, CH, CW, barW };
  })();
  const grafikVeriTahsilat = (() => {
    const gruplar: Record<string, number> = {};
    for (const h of (chartVeri?.sonIslemler ?? [])) {
      if (h.belgeTuru === "Tahsilat") {
        const anahtar = tahsilatGrafikTip === "gunluk" ? h.tarih.slice(0, 10) : h.tarih.slice(0, 7);
        gruplar[anahtar] = (gruplar[anahtar] || 0) + h.tutar;
      }
    }
    const keys = Object.keys(gruplar).sort();
    const max = Math.max(...Object.values(gruplar), 1) * 1.2;
    const CH = 160, CW = 40, barW = 34;
    return { keys, gruplar, max, CH, CW, barW };
  })();
  return (
    <div className="space-y-6 pb-3">

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="relative overflow-hidden rounded-[28px] border border-sky-200/60 bg-[linear-gradient(135deg,#0f172a,#2563eb)] p-6 text-white shadow-[0_24px_60px_rgba(37,99,235,0.25)]">
            <div className="absolute right-3 top-3 text-3xl opacity-20">👤</div>
            <p className="text-sm font-medium text-white/70">Toplam Müşteri Sayısı</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{veri?.toplamCari ?? 0}</p>
            <div className="absolute -bottom-2 -right-2 h-20 w-20 rounded-full bg-white/5" />
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-rose-200/60 bg-[linear-gradient(135deg,#991b1b,#fb7185)] p-6 text-white shadow-[0_24px_60px_rgba(244,63,94,0.22)]">
            <div className="absolute right-3 top-3 text-3xl opacity-20">💰</div>
            <p className="text-sm font-medium text-white/70">Toplam Alacak</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{para(veri?.toplamAlacak ?? 0)}</p>
            <div className="absolute -bottom-2 -right-2 h-20 w-20 rounded-full bg-white/5" />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-blue-100/60 via-white to-slate-100 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-slate-800 dark:to-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <select value={grafikTip} onChange={(e) => setGrafikTip(e.target.value as "gunluk" | "aylik")} className="h-10 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-rose-700 outline-none transition focus:border-rose-300 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-200">
                <option value="gunluk">Günlük Satış Grafiği</option>
                <option value="aylik">Aylık Satış Grafiği</option>
              </select>
            </div>
            {grafikVeri.keys.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Henüz satış verisi yok</p> : <div className="overflow-x-auto overflow-y-hidden pb-2">
              <svg className="block" width={Math.max(grafikVeri.keys.length * grafikVeri.CW, 200)} height={grafikVeri.CH + 40}>
                {[0, 0.25, 0.5, 0.75, 1].map(r => {
                  const y = grafikVeri.CH - grafikVeri.CH * r;
                  return <g key={r}><line x1={0} y1={y} x2={grafikVeri.keys.length * grafikVeri.CW} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" strokeWidth={1} /><text x={-6} y={y + 4} textAnchor="end" fill="#64748b" fontSize={10}>{(grafikVeri.max * r).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</text></g>;
                })}
                {grafikVeri.keys.map((ay, i) => {
                  const cx = i * grafikVeri.CW + grafikVeri.CW / 2;
                  const h = (grafikVeri.gruplar[ay] / grafikVeri.max) * grafikVeri.CH;
                  const topY = Math.max(grafikVeri.CH - h - 16, 2);
                  return <g key={ay}><rect x={cx - grafikVeri.barW / 2} y={grafikVeri.CH - h} width={grafikVeri.barW} height={h} rx={10} fill="#fb7185" /><text x={cx} y={topY} textAnchor="middle" fill="#0f172a" fontSize={9} fontFamily="sans-serif" fontWeight="bold">{grafikVeri.gruplar[ay].toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</text><text x={cx} y={topY + 12} textAnchor="middle" fill="#64748b" fontSize={8} fontFamily="sans-serif">{grafikTip === "gunluk" ? new Date(ay + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : new Date(ay + "-01T12:00:00").toLocaleDateString("tr-TR", { month: "short", year: "numeric" })}</text></g>;
                })}
              </svg>
            </div>}
          </div>
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-blue-100/60 via-white to-slate-100 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-slate-800 dark:to-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <select value={tahsilatGrafikTip} onChange={(e) => setTahsilatGrafikTip(e.target.value as "gunluk" | "aylik")} className="h-10 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-emerald-700 outline-none transition focus:border-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-200">
                <option value="gunluk">Günlük Tahsilat Grafiği</option>
                <option value="aylik">Aylık Tahsilat Grafiği</option>
              </select>
            </div>
            {grafikVeriTahsilat.keys.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Henüz tahsilat verisi yok</p> : <div className="overflow-x-auto overflow-y-hidden pb-2">
              <svg className="block" width={Math.max(grafikVeriTahsilat.keys.length * grafikVeriTahsilat.CW, 200)} height={grafikVeriTahsilat.CH + 40}>
                {[0, 0.25, 0.5, 0.75, 1].map(r => {
                  const y = grafikVeriTahsilat.CH - grafikVeriTahsilat.CH * r;
                  return <g key={r}><line x1={0} y1={y} x2={grafikVeriTahsilat.keys.length * grafikVeriTahsilat.CW} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" strokeWidth={1} /><text x={-6} y={y + 4} textAnchor="end" fill="#64748b" fontSize={10}>{(grafikVeriTahsilat.max * r).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</text></g>;
                })}
                {grafikVeriTahsilat.keys.map((ay, i) => {
                  const cx = i * grafikVeriTahsilat.CW + grafikVeriTahsilat.CW / 2;
                  const h = (grafikVeriTahsilat.gruplar[ay] / grafikVeriTahsilat.max) * grafikVeriTahsilat.CH;
                  const topY = Math.max(grafikVeriTahsilat.CH - h - 16, 2);
                  return <g key={ay}><rect x={cx - grafikVeriTahsilat.barW / 2} y={grafikVeriTahsilat.CH - h} width={grafikVeriTahsilat.barW} height={h} rx={10} fill="#34d399" /><text x={cx} y={topY} textAnchor="middle" fill="#0f172a" fontSize={9} fontFamily="sans-serif" fontWeight="bold">{grafikVeriTahsilat.gruplar[ay].toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</text><text x={cx} y={topY + 12} textAnchor="middle" fill="#64748b" fontSize={8} fontFamily="sans-serif">{tahsilatGrafikTip === "gunluk" ? new Date(ay + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : new Date(ay + "-01T12:00:00").toLocaleDateString("tr-TR", { month: "short", year: "numeric" })}</text></g>;
                })}
              </svg>
            </div>}
          </div>
        </div>
      </div>
      <Panel aksiyon={<div className="flex items-center gap-2"><button type="button" onClick={dashboardExcelExport} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"><FileSpreadsheet size={16} /> Excel</button><button type="button" onClick={dashboardPdfExport} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"><FileText size={16} /> Yazdır</button></div>} baslik={<div className="flex w-full flex-col gap-2"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><ClipboardList size={16} className="text-slate-500 dark:text-slate-400" /></div><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">İşlemler</p></div><input type="date" value={baslangic} onChange={(e) => { setBaslangic(e.target.value); setDPreset(""); }} className="h-8 rounded-lg border border-slate-200 bg-white/80 px-3 text-xs shadow-sm backdrop-blur transition-colors hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-sky-400" /><span className="text-xs text-slate-300">-</span><input type="date" value={bitis} onChange={(e) => { setBitis(e.target.value); setDPreset(""); }} className="h-8 rounded-lg border border-slate-200 bg-white/80 px-3 text-xs shadow-sm backdrop-blur transition-colors hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-sky-400" /><div className="flex items-center gap-1"><button type="button" onClick={() => { const d=new Date(); setBaslangic(d.toISOString().slice(0,10)); setBitis(d.toISOString().slice(0,10)); setDPreset("bugun"); }} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${dPreset==="bugun"?"border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300":"border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"}`}>Bugün</button><button type="button" onClick={() => { const d=new Date(); d.setDate(d.getDate()-7); setBaslangic(d.toISOString().slice(0,10)); setBitis(new Date().toISOString().slice(0,10)); setDPreset("1hafta"); }} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${dPreset==="1hafta"?"border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300":"border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"}`}>1 Hafta</button><button type="button" onClick={() => { const d=new Date(); d.setMonth(d.getMonth()-1); setBaslangic(d.toISOString().slice(0,10)); setBitis(new Date().toISOString().slice(0,10)); setDPreset("1ay"); }} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${dPreset==="1ay"?"border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300":"border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"}`}>1 Ay</button><button type="button" onClick={() => { const d=new Date(); d.setMonth(d.getMonth()-3); setBaslangic(d.toISOString().slice(0,10)); setBitis(new Date().toISOString().slice(0,10)); setDPreset("3ay"); }} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${dPreset==="3ay"?"border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300":"border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"}`}>3 Ay</button><button type="button" onClick={() => { const d=new Date(); d.setMonth(d.getMonth()-6); setBaslangic(d.toISOString().slice(0,10)); setBitis(new Date().toISOString().slice(0,10)); setDPreset("6ay"); }} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${dPreset==="6ay"?"border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300":"border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"}`}>6 Ay</button><button type="button" onClick={() => { const d=new Date(); d.setFullYear(d.getFullYear()-1); setBaslangic(d.toISOString().slice(0,10)); setBitis(new Date().toISOString().slice(0,10)); setDPreset("1yil"); }} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${dPreset==="1yil"?"border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300":"border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"}`}>1 Yıl</button></div></div><div className="mb-2 flex items-center gap-4 text-sm text-slate-500"><label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><input type="checkbox" checked={filtre.satis} onChange={(e) => setFiltre(f => ({ ...f, satis: e.target.checked }))} className="accent-red-500" />Toplam Satış: <strong className="ml-0.5">{para(ozet.satis)}</strong> <span className="text-red-400">({ozet.satisSayi})</span></label><label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-all hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"><input type="checkbox" checked={filtre.tahsilat} onChange={(e) => setFiltre(f => ({ ...f, tahsilat: e.target.checked }))} className="accent-emerald-500" />Toplam Tahsilat: <strong className="ml-0.5">{para(ozet.tahsilat)}</strong> <span className="text-emerald-400">({ozet.tahsilatSayi})</span></label><label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><input type="checkbox" checked={filtre.iade} onChange={(e) => setFiltre(f => ({ ...f, iade: e.target.checked }))} className="accent-red-500" />Toplam İade: <strong className="ml-0.5">{para(ozet.iade)}</strong> <span className="text-red-400">({ozet.iadeSayi})</span></label><label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-all hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400"><input type="checkbox" checked={sonIslemler} onChange={(e) => setSonIslemler(e.target.checked)} className="accent-sky-500" />Son Tek İşlem</label></div></div>}>
        <div className="-mx-5 border-t border-slate-100 dark:border-slate-800" />
        <div className="-mx-5 overflow-x-auto rounded-b-xl">
          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <p className="text-[11px] text-slate-400">{filtreli.length} kayıt</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button disabled={dSayfa <= 1} onClick={() => setDSayfa(dSayfa - 1)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={14} /></button>
                <span className="min-w-16 text-center text-xs text-slate-500">{dSayfa} / {dToplamSayfa}</span>
                <button disabled={dSayfa >= dToplamSayfa} onClick={() => setDSayfa(dSayfa + 1)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronRight size={14} /></button>
              </div>
              <span className="text-xs text-slate-300">|</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Sayfa başı:</span>
                <select value={dLimit} onChange={(e) => { setDLimit(Number(e.target.value)); setDSayfa(1); }} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950">
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={70}>70</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
          <div className={tabloStil.kapsayici}>
          <table className="w-full text-sm">
            <thead>
              <tr className={tabloStil.baslikSatiri}>
                <th className={`${tabloStil.hucreMerkez} w-10`}>#</th>
                <th className={tabloStil.hucre}><button onClick={() => dSiralamaDegistir("musteri")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{dSiralama.kolon === "musteri" ? (dSiralama.yon === "asc" ? "▲" : "▼") : <span className="text-slate-300">⇅</span>} Müşteri</button></th>
                <th className={tabloStil.hucre}>İşlem</th>
                <th className={tabloStil.hucre}>Açıklama</th>
                <th className={tabloStil.hucre}><button onClick={() => dSiralamaDegistir("tarih")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{dSiralama.kolon === "tarih" ? (dSiralama.yon === "asc" ? "▲" : "▼") : <span className="text-slate-300">⇅</span>} Tarih</button></th>
                <th className={tabloStil.hucreSag}>Kalan Borç</th>
              </tr>
            </thead>
            <tbody className={tabloStil.govde}>
              {sayfaFiltreli.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-sm text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]"><span className="text-2xl">📭</span><p className="mt-2">Henüz işlem yok</p></td></tr>}
              {sayfaFiltreli.map((h, idx) => (
                <tr key={h.id} onClick={() => onCariAc(h.cariId)} className={`${tabloStil.satir} cursor-pointer`}>
                  <td className={`${tabloStil.hucreMerkez} text-xs font-medium ${tabloStil.metin}`}>{String((dSayfa - 1) * dLimit + idx + 1).padStart(2, "0")}</td>
                  <td className={`${tabloStil.hucre} font-medium text-slate-800 dark:text-slate-200`}>{h.cariUnvan}</td>
                  <td className={tabloStil.hucre}><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${h.belgeTuru === "Tahsilat" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"}`}>{h.belgeTuru}<span className="opacity-70">({para(h.tutar)})</span></span></td>
                  <td className={`${tabloStil.hucre} max-w-[200px] truncate ${tabloStil.metin}`}>{h.aciklama || <span className="italic text-slate-300">—</span>}</td>
                  <td className={`${tabloStil.hucre} whitespace-nowrap ${tabloStil.metin}`}>{tarihFormatla(h.tarih)} {(() => { const s=new Date(h.tarih.slice(0,10)+"T00:00:00"), t=Date.now(); const gf=Math.floor((t-s.getTime())/86400000); const y=Math.floor(gf/365), k=gf%365, a=Math.floor(k/30), g=k%30; const p=[]; if(y>0)p.push(y+' yıl'); if(a>0)p.push(a+' ay'); p.push(g+' gün'); const renk=gf>180?'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300':gf>60?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300':gf>30?'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300':'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'; return <span className={'ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold '+renk}>(İşlemden bu yana {p.join(' ')} geçti)</span>; })()}</td>
                  <td className={`${tabloStil.hucreSag} whitespace-nowrap text-sm font-semibold tabular-nums tracking-tight text-red-600 dark:text-red-400`}>{h.cariBakiye != null ? para(h.cariBakiye) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <p className="text-[11px] text-slate-400">{filtreli.length} kayıt</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button disabled={dSayfa <= 1} onClick={() => setDSayfa(dSayfa - 1)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={14} /></button>
                <span className="min-w-16 text-center text-xs text-slate-500">{dSayfa} / {dToplamSayfa}</span>
                <button disabled={dSayfa >= dToplamSayfa} onClick={() => setDSayfa(dSayfa + 1)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronRight size={14} /></button>
              </div>
              <span className="text-xs text-slate-300">|</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Sayfa başı:</span>
                <select value={dLimit} onChange={(e) => { setDLimit(Number(e.target.value)); setDSayfa(1); }} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950">
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={70}>70</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CariSayfasi({ onCariAc }: { onCariAc: (id: number) => void }) {
  const [arama, setArama] = useState("");
  const [sayfa, setSayfa] = useState(1);
  const [limit, setLimit] = useState(30);
  const [clilk, setClIlk] = useState(true);
  useEffect(() => {
    const s = localStorage.getItem("cl");
    if (s) try {
      const o = JSON.parse(s);
      if (o.sayfa) setSayfa(o.sayfa);
      if (o.limit) setLimit(o.limit);
    } catch {}
    setClIlk(false);
  }, []);
  useEffect(() => {
    if (clilk) return;
    localStorage.setItem("cl", JSON.stringify({ sayfa, limit }));
  }, [sayfa, limit, clilk]);
  const [duzenlenen, setDuzenlenen] = useState<CariHesap>({ ...bosCari });
  const [formAcik, setFormAcik] = useState(false);
  const [sonuc, setSonuc] = useState<SayfaliSonuc<CariHesap>>({ veriler: [], toplam: 0, sayfa: 1, limit: 30 });
  useEffect(() => { setSayfa(1); }, [arama, limit]);
  const listele = () => api.carileriListele({ arama, sayfa, limit }).then(setSonuc);
  useEffect(() => { listele(); }, [arama, sayfa, limit]);
  const yeniCariAc = () => {
    setDuzenlenen({ ...bosCari });
    setFormAcik(true);
  };
  const duzenle = (kayit: CariHesap) => {
    setDuzenlenen(kayit);
    setFormAcik(true);
  };
  const formKapat = () => {
    setFormAcik(false);
    setDuzenlenen({ ...bosCari });
  };
  const kaydet = async () => {
    await api.cariKaydet(duzenlenen);
    formKapat();
    listele();
  };
  const [silOnayCariId, setSilOnayCariId] = useState<number | null>(null);
  const silOnayla = async () => {
    if (silOnayCariId == null) return;
    try {
      await api.cariSil(silOnayCariId);
      setSilOnayCariId(null);
      listele();
    } catch {
      alert("Silme işlemi başarısız.");
    }
  };
  return (
    <div className="space-y-4">
      <OnayModal acik={silOnayCariId != null} baslik="Cari Sil" mesaj="Silmek istediğinizden emin misiniz? Yaptığınız işlem geri döndürülemez.!!" onayla={silOnayla} iptal={() => setSilOnayCariId(null)} />
      <Panel
        baslik={<div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><Users size={16} className="text-slate-500 dark:text-slate-400" /></div><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Müşteriler</p></div></div>}
        aksiyon={
          <div className="flex items-center gap-3">
            <AramaKutusu value={arama} onChange={setArama} placeholder="Unvan veya telefon ara" />
            <BirincilButon onClick={yeniCariAc}>Yeni Müşteri</BirincilButon>
          </div>
        }
      >
        <div className="-mx-5 border-t border-slate-100 dark:border-slate-800" />
        <div className="flex items-center justify-between pt-4 pb-3">
          <p className="text-[11px] text-slate-400">{sonuc.toplam} kayıt</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button disabled={sayfa <= 1} onClick={() => setSayfa(sayfa - 1)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={14} /></button>
              <span className="min-w-16 text-center text-xs text-slate-500">{sayfa} / {Math.max(1, Math.ceil(sonuc.toplam / limit))}</span>
              <button disabled={sayfa >= Math.max(1, Math.ceil(sonuc.toplam / limit))} onClick={() => setSayfa(sayfa + 1)} className="rounded-md border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronRight size={14} /></button>
            </div>
            <span className="text-xs text-slate-300">|</span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sayfa başı:</span>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setSayfa(1); }} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950">
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={70}>70</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
        <div className={tabloStil.kapsayici}>
        <table className="w-full text-sm">
          <thead>
              <tr className={tabloStil.baslikSatiri}>
              <th className={tabloStil.hucre}>Ad Soyad / Ünvan</th>
              <th className={tabloStil.hucre}>Telefon</th>
              <th className={tabloStil.hucre}>E-posta</th>
              <th className={`${tabloStil.hucreSag}`}>Kalan Borç</th>
              <th className={`${tabloStil.hucreSag} w-24`}>İşlem</th>
            </tr>
          </thead>
          <tbody className={tabloStil.govde}>
            {sonuc.veriler.map((kayit) => (
              <tr key={kayit.id} onClick={() => onCariAc(kayit.id)} className={`${tabloStil.satir} cursor-pointer`}>
                <td className={`${tabloStil.hucre} font-medium text-slate-800 dark:text-slate-200`}>{kayit.unvan}</td>
                <td className={`${tabloStil.hucre} ${tabloStil.metin}`}>{kayit.telefon || <span className="text-slate-300">—</span>}</td>
                <td className={`${tabloStil.hucre} ${tabloStil.metin}`}>{kayit.eposta || <span className="text-slate-300">—</span>}</td>
                <td className={`${tabloStil.hucreSag} font-semibold text-red-600 dark:text-red-400`}>{para(kayit.bakiye)}</td>
                <td className={tabloStil.hucreSag}>
                  <span className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}><IkonButon title="Düzenle" onClick={() => duzenle(kayit)} /><IkonButon title="Sil" tur="sil" onClick={() => setSilOnayCariId(kayit.id)} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="flex items-center justify-between px-1 pt-3">
          <p className="text-[11px] text-slate-400">{sonuc.toplam} kayıt</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button disabled={sayfa <= 1} onClick={() => setSayfa(sayfa - 1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={16} /></button>
              <span className="min-w-16 text-center text-sm text-slate-500">{sayfa} / {Math.max(1, Math.ceil(sonuc.toplam / limit))}</span>
              <button disabled={sayfa >= Math.max(1, Math.ceil(sonuc.toplam / limit))} onClick={() => setSayfa(sayfa + 1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRight size={16} /></button>
            </div>
            <span className="text-xs text-slate-300">|</span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sayfa başı:</span>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setSayfa(1); }} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-950">
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={70}>70</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </Panel>
      {formAcik && (
        <ModalKatmani>
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-xl dark:border-slate-700 dark:from-blue-950 dark:via-slate-900 dark:to-blue-900">
            <div className="flex h-16 items-center justify-between px-5" style={{ borderBottom: "1px solid var(--ui-border)" }}>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{duzenlenen.id ? "Kaydı Düzenle" : "Yeni Müşteri"}</h2>
               <button onClick={formKapat} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Kapat">
                <X size={17} />
              </button>
            </div>
            <div className="p-5">
              <CariForm deger={duzenlenen} setDeger={setDuzenlenen} kaydet={kaydet} iptal={formKapat} />
            </div>
          </div>
        </ModalKatmani>
      )}
    </div>
  );
}

function CariForm({ deger, setDeger, kaydet, iptal }: { deger: CariHesap; setDeger: (m: CariHesap) => void; kaydet: () => void; iptal: () => void }) {
  const [telefonHata, setTelefonHata] = useState("");
  const alan = (ad: keyof CariHesap, etiket: string) => (
    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
      {etiket}
      <input value={String(deger[ad] ?? "")} onChange={(e) => setDeger({ ...deger, [ad]: e.target.value })} className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 outline-none hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" />
    </label>
  );
  const telefonDegis = (v: string) => {
    const temiz = v.replace(/[^0-9\s]/g, "");
    setDeger({ ...deger, telefon: temiz });
    setTelefonHata("");
  };
  const telefonKontrol = () => {
    const rakamSayisi = (deger.telefon ?? "").replace(/\s/g, "").length;
    if (rakamSayisi > 0 && (rakamSayisi < 10 || rakamSayisi > 11)) {
      setTelefonHata("Telefon 10-11 haneli olmalıdır");
    } else {
      setTelefonHata("");
    }
  };
  const kaydetVeKontrol = () => {
    const rakamSayisi = (deger.telefon ?? "").replace(/\s/g, "").length;
    if (rakamSayisi > 0 && (rakamSayisi < 10 || rakamSayisi > 11)) {
      setTelefonHata("Telefon 10-11 haneli olmalıdır");
      return;
    }
    kaydet();
  };
  return (
    <div className="space-y-4">
      {alan("unvan", "Ad Soyad / Ünvan")}
      {alan("eposta", "E-posta")}
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
        Telefon
        <input value={deger.telefon ?? ""} onChange={(e) => telefonDegis(e.target.value)} onBlur={telefonKontrol} className={`mt-2 h-10 w-full rounded-md border bg-white px-3 outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:bg-slate-950 ${telefonHata ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700"}`} />
        {telefonHata && <p className="mt-1 text-xs text-red-500">{telefonHata}</p>}
      </label>
      {alan("vergiNo", "Vergi No")}
      {alan("adres", "Adres")}
      <div className="pt-2">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
          Notlar / Açıklamalar
          <textarea value={String(deger.notlar ?? "")} onChange={(e) => setDeger({ ...deger, notlar: e.target.value })} className="mt-2 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none focus:border-[var(--renk-marka-500)] dark:border-slate-700 dark:bg-slate-950" />
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={iptal} className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Vazgeç</button>
        <BirincilButon onClick={kaydetVeKontrol}>{deger.id ? "Güncelle" : "Ekle"}</BirincilButon>
      </div>
    </div>
  );
}

function CariDetaySayfasi({ cariID, geriDon }: { cariID: number; geriDon: () => void }) {
  const [cari, setCari] = useState<CariHesap | null>(null);
  const [hareketler, setHareketler] = useState<CariHareket[]>([]);
  const [islemTuru, setIslemTuru] = useState<IslemTuru>("Satış");
  const [islemFormAcik, setIslemFormAcik] = useState(false);
  const [filtreArama, setFiltreArama] = useState("");
  const [tarih, setTarih] = useState(yerelTarihStr());
  const [aciklama, setAciklama] = useState("");
  const [islemTuruTip, setIslemTuruTip] = useState<IslemTuruTipi>("Nakit");
  const [tutar, setTutar] = useState(0);
  const [islemHata, setIslemHata] = useState("");
  const [duzenlenenHareket, setDuzenlenenHareket] = useState<CariHareket | null>(null);
  const [silOnayId, setSilOnayId] = useState<number | null>(null);
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false);
  const [duzenlenenCari, setDuzenlenenCari] = useState<CariHesap>({ ...bosCari });

  const yenile = async () => {
    const [cariVeri, hareketVeri] = await Promise.all([
      api.cariGetir(cariID),
      api.cariHareketleriListele(cariID)
    ]);
    setCari(cariVeri);
    setHareketler(hareketVeri);
  };

  useEffect(() => { yenile(); }, [cariID]);
  const hareketFiltreli = useMemo(() => hareketler.filter((h) => !filtreArama || (h.aciklama ?? "").toLocaleLowerCase("tr-TR").includes(filtreArama.toLocaleLowerCase("tr-TR"))), [hareketler, filtreArama]);
  const sonHareket = useMemo(() => {
    if (hareketler.length === 0) return null;
    return hareketler[0];
  }, [hareketler]);
  const kartOzet = useMemo(() => {
    return hareketler.reduce(
      (ozet, h) => {
        if (h.belgeTuru === "Tahsilat" || h.belgeTuru === "İade") ozet.tahsilatIade += h.tutar;
        return ozet;
      },
      { tahsilatIade: 0 }
    );
  }, [hareketler]);
  const bakiyePozitif = (cari?.bakiye ?? 0) > 0;

  const islemAc = (tur: IslemTuru) => {
    setDuzenlenenHareket(null);
    setIslemTuru(tur);
    setTarih(yerelTarihStr());
    setAciklama("");
    setIslemTuruTip("Nakit");
    setTutar(0);
    setIslemHata("");
    setIslemFormAcik(true);
  };

  const hareketDuzenle = (h: CariHareket) => {
    setDuzenlenenHareket(h);
    setIslemTuru(h.belgeTuru as IslemTuru);
    setTarih(h.tarih);
    setAciklama(h.aciklama);
    setIslemTuruTip((h.islemTuru || "Nakit") as IslemTuruTipi);
    setTutar(h.tutar);
    setIslemHata("");
    setIslemFormAcik(true);
  };

  const hareketSil = async (id: number) => {
    try {
      await api.cariHareketSil(id);
      setSilOnayId(null);
      yenile();
    } catch {
      alert("Silme işlemi başarısız.");
    }
  };

  const cariKaydet = async () => {
    try {
      await api.cariKaydet(duzenlenenCari);
      setDuzenlemeAcik(false);
      yenile();
    } catch (e) {
      alert("Kaydetme başarısız: " + ((e as any)?.message || e));
    }
  };

  const islemKapat = () => {
    setIslemFormAcik(false);
    setDuzenlenenHareket(null);
    setAciklama("");
    setIslemTuruTip("Nakit");
    setTutar(0);
    setIslemHata("");
  };

  const kaydet = async () => {
    if (tutar <= 0) {
      setIslemHata("Tutar 0'dan büyük olmalı.");
      return;
    }
    const mevcutBorc = hareketler.reduce((t, h) => {
      if (h.id === duzenlenenHareket?.id) return t;
      if (h.belgeTuru === "Satış") return t + h.tutar;
      if (h.belgeTuru === "Tahsilat" || h.belgeTuru === "İade") return t - h.tutar;
      return t;
    }, 0);
    if ((islemTuru === "Tahsilat" || islemTuru === "İade") && tutar > mevcutBorc) {
      setIslemHata(`Mevcut borç (${(mevcutBorc || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL). Borçtan fazla tahsilat ya da iade yapılamaz`);
      return;
    }
    try {
      setIslemHata("");
      if (duzenlenenHareket) {
        await api.cariHareketGuncelle({ ...duzenlenenHareket, tarih, aciklama, tutar, islemTuru: islemTuruTip });
      } else if (islemTuru === "Satış") {
        await api.satisOlustur({ id: 0, cariId: cariID, tarih, aciklama, toplam: tutar, durum: "Aktif" } as Satis);
      } else if (islemTuru === "İade") {
        await api.alisOlustur({ id: 0, cariId: cariID, tarih, aciklama, toplam: tutar, durum: "Aktif", islemTuru: islemTuruTip } as Alis);
      } else {
        await api.cariHareketOlustur({ id: 0, cariId: cariID, belgeTuru: islemTuru, belgeId: 0, tutar, tarih, aciklama, islemTuru: islemTuruTip });
      }
      setIslemFormAcik(false);
      setDuzenlenenHareket(null);
      yenile();
      window.dispatchEvent(new Event("veri-guncellendi"));
    } catch (e) {
      setIslemHata((e as any)?.message || (e as any)?.toString() || "İşlem kaydedilemedi.");
    }
  };

  const islemAciklamaPlaceholder = {
    "Satış": "Satılan ürün veya hizmetleri yazın",
    "İade": "İade edilen ürünleri yazın",
    "Tahsilat": "Alınan tahsilat açıklaması"
  }[islemTuru];

  const excelExport = () => {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      // Cari bilgileri
      const cariVeri = [
        [(() => { try { return localStorage.getItem("isletme_adi") || ""; } catch { return ""; } })()],
        [],
        ["Alan", "Değer"],
        ["Ad Soyad / Ünvan", cari?.unvan ?? ""],
        ["Telefon", cari?.telefon ?? ""],
        ["E-posta", cari?.eposta ?? ""],
        ["Adres", cari?.adres ?? ""],
        ["Vergi No", cari?.vergiNo ?? ""],
        ["Notlar", cari?.notlar ?? ""],
        ["Bakiye", (cari?.bakiye || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + "₺"]
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(cariVeri);
      XLSX.utils.book_append_sheet(wb, ws1, "Müşteri Kartı");
      // Hareketler
      const hareketVeri = [
        ["Tarih/Saat", "İşlem", "İşlem Türü", "Açıklama", "Tutar"],
        ...hareketler.slice().reverse().map((h) => [
          h.tarih.replace("T", " "),
          h.belgeTuru,
          h.islemTuru,
          h.aciklama || "-",
          (h.tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + "₺"
        ])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(hareketVeri);
      XLSX.utils.book_append_sheet(wb, ws2, "Hareketler");
      XLSX.writeFile(wb, `${cari?.unvan ?? "cari"}_hareketler.xlsx`);
    });
  };

  const pdfExport = () => {
    const sf = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + "₺";
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cari?.unvan ?? "Cari"}</title>
<style>
body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:20px}
.isletme{font-size:22px;font-weight:700;color:#222;margin-bottom:5px;text-align:center}
h2{color:#222;font-size:20px;margin:20px 0 10px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th,td{border:1px solid #aaa;padding:7px 10px;text-align:left}
th{background:#10b981;color:#fff;font-size:12px;font-weight:700}
.sag{text-align:right}
@media print{@page{size:auto;margin:0}body{margin:0;padding:15px}}
</style></head><body>
${(() => { try { const a = localStorage.getItem("isletme_adi") || ""; return a ? `<div class="isletme">${a}</div>` : ""; } catch { return ""; } })()}
<h2>Müşteri Kartı</h2>
<table><thead><tr><th>Alan</th><th>Değer</th></tr></thead><tbody>`;
    for (const [a, d] of [["Ad Soyad / Ünvan", cari?.unvan ?? ""], ["Telefon", cari?.telefon ?? ""], ["E-posta", cari?.eposta ?? ""], ["Adres", cari?.adres ?? ""], ["Vergi No", cari?.vergiNo ?? ""], ["Notlar", cari?.notlar ?? "-"], ["Toplam Borç", sf(cari?.bakiye ?? 0)]]) {
      html += `<tr><td><strong>${a}</strong></td><td>${d}</td></tr>`;
    }
    html += `</tbody></table>
<h2>Hareketler</h2>
<table><thead><tr>${["Tarih/Saat", "İşlem", "İşlem Türü", "Açıklama", "Tutar"].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
    for (const h of hareketler.slice().reverse()) {
      html += `<tr><td>${h.tarih.replace("T", " ")}</td><td>${h.belgeTuru}</td><td>${h.islemTuru}</td><td>${h.aciklama || "-"}</td><td class="sag">${sf(h.tutar)}</td></tr>`;
    }
    html += `<tr style="font-weight:700;border-top:2px solid #222"><td colspan="4" style="text-align:right">Toplam Borç:</td><td class="sag">${sf(cari?.bakiye ?? 0)}</td></tr></tbody></table>
<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cari?.unvan ?? "cari"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const geriDonButonu = (
    <button onClick={geriDon} className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--ui-border)] px-3 text-sm font-medium transition hover:bg-slate-100 dark:border-[var(--ui-dark-border)] dark:hover:bg-slate-800">
      <ArrowLeft size={17} /> Geri Dön
    </button>
  );

  if (!cari) {
    return (
      <div className="space-y-2">
        <Panel baslik="Cari Detay" aksiyon={geriDonButonu}><div className="py-8 text-center text-sm text-slate-500">Cari yükleniyor</div></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-2">

      <div className="relative rounded-none border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-100/60 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/40">
        <div className="pointer-events-none absolute -bottom-8 -right-8 select-none opacity-[0.07] dark:opacity-[0.1]">
          <Users size={320} className="text-slate-400 dark:text-slate-500" />
        </div>

        <div className="flex items-start justify-between gap-5 px-6 pt-4 pb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-200 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-300">Müşteri Kartı</span>
                <button type="button" onClick={() => { setDuzenlenenCari({ ...cari! }); setDuzenlemeAcik(true); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-400 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300" title="Düzenle"><Pencil size={12} /></button>
              </div>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{cari.unvan}</h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                {cari.telefon && <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {cari.telefon}</span>}
                {cari.eposta && <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {cari.eposta}</span>}
                {cari.vergiNo && <span className="inline-flex items-center gap-1.5"><Landmark size={13} /> {cari.vergiNo}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {cari.adres && <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {cari.adres}</span>}
                {cari.notlar && <span className="inline-flex items-center gap-1.5"><FileText size={12} /> {cari.notlar}</span>}
              </div>
            </div>
          </div>
          {geriDonButonu}
        </div>

        <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-5 py-4">
          <div className="rounded-none border border-rose-200 bg-gradient-to-br from-rose-50/80 to-white p-4 shadow-sm dark:border-rose-900/40 dark:from-rose-950/30 dark:to-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">Kalan Borç</p>
                <p className={`mt-1 text-xl font-bold ${bakiyePozitif ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{para(cari.bakiye)}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bakiyePozitif ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
                <CreditCard size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-none border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Tahsilat / İade</p>
                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">{para(kartOzet.tahsilatIade)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Wallet size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-none border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Hareket</p>
                <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-200">{hareketler.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <Activity size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-none border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Son İşlem</p>
                {sonHareket ? (
                  <p className={`mt-1 text-sm font-bold ${sonHareket.belgeTuru === "Tahsilat" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {sonHareket.belgeTuru} · {para(sonHareket.tutar)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-300">—</p>
                )}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                <Clock size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

        <div className="flex items-center gap-3 px-5 py-4">
          {(["Satış", "Tahsilat", "İade"] as IslemTuru[]).map((tur) => (
            <button
              key={tur}
              type="button"
              onClick={() => islemAc(tur)}
              className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold shadow-sm transition-colors duration-200 ${
                tur === "Satış"
                  ? "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
                  : tur === "Tahsilat"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              }`}
            >
              <span className="flex items-center gap-2">
                {tur === "Satış" && <TrendingUp size={15} />}
                {tur === "Tahsilat" && <CreditCard size={15} />}
                {tur === "İade" && <RotateCcw size={15} />}
                {tur}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={tabloStil.kapsayici}>
        <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-5 py-4 dark:border-[var(--ui-dark-border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <ClipboardList size={16} className={tabloStil.metin} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hesap Hareketleri</p>
              <p className={`text-[11px] ${tabloStil.metin}`}>{hareketFiltreli.length} kayıt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={filtreArama} onChange={(e) => setFiltreArama(e.target.value)} placeholder="Açıklama ara..." className="h-9 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <button type="button" onClick={excelExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" onClick={pdfExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"><FileText size={15} /> Yazdır</button>
          </div>
        </div>
        {cari && cari.bakiye !== 0 && sonHareket ? (() => { const s=new Date(sonHareket.tarih.slice(0,10)+"T00:00:00"), t=Date.now(); const gf=Math.floor((t-s.getTime())/86400000); const y=Math.floor(gf/365), k=gf%365, a=Math.floor(k/30), g=k%30; const p=[]; if(y>0)p.push(y+' yıl'); if(a>0)p.push(a+' ay'); if(g>0||p.length>0)p.push(g+' gün'); const sure=p.length>0?p.join(' '):'bugün'; const renk=gf>180?'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300':gf>60?'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300':gf>30?'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300':'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'; return <div className="mx-5 mt-4 mb-2"><span className={'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold '+renk}><Clock size={14} /> Son {sonHareket.belgeTuru.toLocaleLowerCase("tr-TR")} işleminden bu yana <strong>{sure}</strong> geçmiştir</span></div>; })() : null}
        <table className="w-full text-sm">
          <thead>
            <tr className={tabloStil.baslikSatiri}>
              <th className={tabloStil.hucre}>Tarih/Saat</th>
              <th className={tabloStil.hucre}>İşlem</th>
              <th className={tabloStil.hucre}>İşlem Türü</th>
              <th className={tabloStil.hucre}>Açıklama</th>
              <th className={`${tabloStil.hucreSag}`}>Tutar</th>
              <th className={`${tabloStil.hucreMerkez}`}>İşlem</th>
            </tr>
          </thead>
          <tbody className={tabloStil.govde}>
            {hareketFiltreli.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Henüz hareket yok</td></tr>}
            {hareketFiltreli.map((hareket) => (
              <tr key={hareket.id} className={tabloStil.satir}>
                <td className={`${tabloStil.hucre} ${tabloStil.metin}`}>{tarihFormatla(hareket.tarih)}</td>
                <td className={tabloStil.hucre}>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${hareket.belgeTuru === "Tahsilat" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300"}`}>{hareket.belgeTuru}</span>
                </td>
                <td className={tabloStil.hucre}>
                  <span className={`text-xs font-medium ${tabloStil.metin}`}>{hareket.islemTuru}</span>
                </td>
                <td className={`${tabloStil.hucre} ${tabloStil.metin}`}>{hareket.aciklama || <span className="italic text-slate-300">—</span>}</td>
                <td className={`${tabloStil.hucreSag} font-semibold ${hareket.belgeTuru === "Tahsilat" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500 dark:text-rose-300"}`}>{para(hareket.tutar)}</td>
                <td className={tabloStil.hucreMerkez}>
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={() => hareketDuzenle(hareket)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500" title="Düzenle"><Pencil size={13} /></button>
                    <button type="button" onClick={() => setSilOnayId(hareket.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500" title="Sil"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OnayModal acik={silOnayId != null} baslik="Hareket Sil" mesaj="Silmek istediğinizden emin misiniz? Yaptığınız işlem geri döndürülemez.!!" onayla={() => hareketSil(silOnayId!)} iptal={() => setSilOnayId(null)} />
      {islemFormAcik && (
        <ModalKatmani>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-xl dark:border-slate-700 dark:from-blue-950 dark:via-slate-900 dark:to-blue-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{cari?.unvan} için {duzenlenenHareket ? `${islemTuru} Düzenle` : `${islemTuru} İşlemi`}</h2>
              <button type="button" onClick={islemKapat} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800" aria-label="Kapat">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Tarih<input type="datetime-local" value={tarih} onChange={(e) => setTarih(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" /></label>
               {(islemTuru === "Tahsilat" || islemTuru === "İade") && <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">İşlem Türü<select value={islemTuruTip} onChange={(e) => setIslemTuruTip(e.target.value as IslemTuruTipi)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950"><option value="Nakit">Nakit</option><option value="Çek">Çek</option><option value="Banka Hesabı">Banka Hesabı</option><option value="Kredi Kartı">Kredi Kartı</option></select></label>}
               <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Açıklama<textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={islemAciklamaPlaceholder} className="mt-1.5 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Tutar<input type="text" inputMode="numeric" value={tutar || ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."); setTutar(v === "" ? 0 : Number(v)); }} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-right outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" /></label>
              {islemHata && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{islemHata}</p>}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800"><span className="text-slate-500">İşlem Tutarı</span><strong className="text-lg text-slate-900 dark:text-slate-100">{para(tutar)}</strong></div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={islemKapat} className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Vazgeç</button>
                <BirincilButon onClick={kaydet}>{duzenlenenHareket ? "Güncelle" : `${islemTuru} Kaydet`}</BirincilButon>
              </div>
            </div>
          </div>
        </ModalKatmani>
      )}
      {duzenlemeAcik && (
        <ModalKatmani>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 shadow-xl dark:border-slate-700 dark:from-blue-950 dark:via-slate-900 dark:to-blue-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Müşteri Düzenle</h2>
              <button type="button" onClick={() => setDuzenlemeAcik(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800" aria-label="Kapat">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <CariForm deger={duzenlenenCari} setDeger={setDuzenlenenCari} kaydet={cariKaydet} iptal={() => setDuzenlemeAcik(false)} />
            </div>
          </div>
        </ModalKatmani>
      )}
    </div>
  );
}

function AyarlarSayfasi({
  kullanici, isletmeAdi, setIsletmeAdi, isletmeLogosu, setIsletmeLogosu, beniHatirla, setBeniHatirla
}: {
  kullanici: Kullanici; isletmeAdi: string; setIsletmeAdi: (d: string) => void; isletmeLogosu: string; setIsletmeLogosu: (d: string) => void; beniHatirla: boolean; setBeniHatirla: (d: boolean) => void;
}) {
  const [silmeKodu, setSilmeKodu] = useState("");
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [yeniKullaniciAdi, setYeniKullaniciAdi] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniRol, setYeniRol] = useState<"admin" | "kullanici">("kullanici");
  const [sifreDegistirId, setSifreDegistirId] = useState<number | null>(null);
  const [sifreDegistirDeger, setSifreDegistirDeger] = useState("");
  const [yedekSayi, setYedekSayi] = useState("10");
  const [yedekSon, setYedekSon] = useState("");
  const [yedekSayisi, setYedekSayisi] = useState(0);
  const [excelYedekSayisi, setExcelYedekSayisi] = useState(0);
  const [toastMesaj, setToastMesaj] = useState("");
  const [yedekKlasor, setYedekKlasor] = useState("");
  const [yedekOtomatik, setYedekOtomatik] = useState(false);
  const [yedekAralik, setYedekAralik] = useState("24");
  const [kullaniciHata, setKullaniciHata] = useState("");
  const [kullaniciBasarili, setKullaniciBasarili] = useState("");
  useEffect(() => {
    api.silmeKoduGetir().then(setSilmeKodu);
    api.ayarGetir("yedek_sayi").then((v) => v && setYedekSayi(v));
    api.yedekSonGetir().then((v) => setYedekSon(v));
    api.yedekSayisiGetir().then((v) => setYedekSayisi(v));
    api.excelYedekSayisiGetir().then((v) => setExcelYedekSayisi(v));
    api.ayarGetir("yedek_klasor").then((v) => v && setYedekKlasor(v));
    api.ayarGetir("yedek_al").then((v) => setYedekOtomatik(v === "true"));
    api.ayarGetir("yedek_aralik").then((v) => v && setYedekAralik(v));
    if (kullanici.rol === "admin") api.kullaniciListele().then(setKullanicilar);
  }, [kullanici.rol]);
  const kodKaydet = (v: string) => { setSilmeKodu(v); api.silmeKoduKaydet(v); };
  const kullaniciEkle = async () => {
    if (!yeniKullaniciAdi || yeniSifre.length < 3) { setKullaniciHata("Kullanıcı adı ve en az 3 karakter şifre girin."); return; }
    try { const yeni = await api.kullaniciEkle({ id: 0, kullaniciAdi: yeniKullaniciAdi, rol: yeniRol }); await api.kullaniciSifreDegistir(yeni.id, yeniSifre); setYeniKullaniciAdi(""); setYeniSifre(""); setKullaniciHata(""); setKullaniciBasarili("Kullanıcı eklendi."); api.kullaniciListele().then(setKullanicilar); } catch { setKullaniciHata("Bu kullanıcı adı zaten var."); }
  };
  const kullaniciSil = async (id: number) => {
    try { await api.kullaniciSil(id); api.kullaniciListele().then(setKullanicilar); } catch { setKullaniciHata("Silme başarısız."); }
  };
  const sifreDegistir = async () => {
    if (!sifreDegistirId || sifreDegistirDeger.length < 3) return;
    try { await api.kullaniciSifreDegistir(sifreDegistirId, sifreDegistirDeger); setSifreDegistirId(null); setSifreDegistirDeger(""); setKullaniciBasarili("Şifre değiştirildi."); } catch { setKullaniciHata("Şifre değiştirilemedi."); }
  };

  const excelYedekAl = async () => {
    try {
      const base64 = await api.excelExportAl();
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `ihracat_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToastMesaj("Excel export başarıyla indirildi");
      setTimeout(() => setToastMesaj(""), 3000);
    } catch (e: any) {
      setToastMesaj("Excel export hatası: " + (e?.message || e));
      setTimeout(() => setToastMesaj(""), 5000);
    }
  };

  const excelImportAl = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const sonuc = await api.excelImportBase64Kontrol(base64);
        if (sonuc.mevcutMu > 0 && !window.confirm(`${sonuc.toplam} müşteriden ${sonuc.mevcutMu} tanesi zaten var. Çift kayıt oluşabilir. Devam etmek istiyor musunuz?`)) {
          return;
        }
        await api.excelImportBase64Import(base64);
        setToastMesaj("Excel import başarıyla tamamlandı");
        setTimeout(() => setToastMesaj(""), 3000);
      } catch (e: any) {
        setToastMesaj("Excel import hatası: " + (e?.message || e));
        setTimeout(() => setToastMesaj(""), 5000);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-5">
      <Panel baslik="Ayarlar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${kullanici.rol === "admin" ? "lg:col-span-2 col-span-1" : "lg:col-span-3 col-span-1"} space-y-5`}>
            <div className="rounded-xl border border-[var(--ui-border)] bg-gradient-to-br from-slate-100 via-white to-blue-100/60 p-5 shadow-sm dark:border-[var(--ui-dark-border)] dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Settings size={16} className="text-slate-500 dark:text-slate-400" /><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Kullanıcı Ayarları</p></div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{kullanici.rol === "admin" ? "Admin" : "Kullanıcı"}</span>
              </div>

              <div className="mt-5 flex items-start gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700"><Landmark size={16} className="text-slate-500 dark:text-slate-400" /></div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">İşletme Adı</label>
                    <input type="text" value={isletmeAdi} onChange={(e) => { setIsletmeAdi(e.target.value); localStorage.setItem("isletme_adi", e.target.value); api.ayarKaydet("isletme_adi", e.target.value); }} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="Müşteri Defteri" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Logo</label>
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { const d = r.result as string; setIsletmeLogosu(d); localStorage.setItem("isletme_logo", d); api.ayarKaydet("isletme_logo", d); }; r.readAsDataURL(f); } }} className="mt-1 text-sm file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-50 dark:file:border-slate-700 dark:file:bg-slate-950 dark:file:text-slate-300" />
                    {isletmeLogosu && <div className="mt-2 flex items-center gap-2"><img src={isletmeLogosu} alt="logo" className="h-10 w-10 rounded-lg border border-slate-200 object-contain dark:border-slate-700" /><button type="button" onClick={() => { setIsletmeLogosu(""); localStorage.setItem("isletme_logo", ""); api.ayarKaydet("isletme_logo", ""); }} className="text-xs text-red-500 hover:text-red-700">Kaldır</button></div>}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700"><Pencil size={16} className="text-slate-500 dark:text-slate-400" /></div>
                <div className="min-w-0 flex-1">
                  {sifreDegistirId === kullanici.id ? (
                    <div className="flex items-center gap-2">
                      <input type="password" placeholder="Yeni şifre" value={sifreDegistirDeger} onChange={(e) => setSifreDegistirDeger(e.target.value)} className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950" />
                      <button type="button" onClick={sifreDegistir} className="inline-flex h-9 items-center rounded-lg bg-[var(--renk-marka-600)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--renk-marka-700)]">Kaydet</button>
                      <button type="button" onClick={() => { setSifreDegistirId(null); setSifreDegistirDeger(""); }} className="text-xs text-slate-400 hover:text-slate-600">İptal</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setSifreDegistirId(kullanici.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><Pencil size={14} />Şifre Değiştir</button>
                  )}
                </div>
              </div>

              {kullanici.rol === "admin" && (
                <div className="mt-4 flex items-start gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700"><Users size={16} className="text-slate-500 dark:text-slate-400" /></div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="text" placeholder="Kullanıcı adı" value={yeniKullaniciAdi} onChange={(e) => setYeniKullaniciAdi(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950" />
                      <input type="password" placeholder="Şifre" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950" />
                      <select value={yeniRol} onChange={(e) => setYeniRol(e.target.value as "admin" | "kullanici")} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="kullanici">Kullanıcı</option><option value="admin">Admin</option></select>
                      <button type="button" onClick={kullaniciEkle} className="inline-flex h-9 items-center rounded-lg bg-[var(--renk-marka-600)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--renk-marka-700)]">Ekle</button>
                    </div>
                    <div className="space-y-1">
                      {kullanicilar.map((k) => (
                        <div key={k.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{k.kullaniciAdi}</span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{k.rol}</span>
                          </div>
                          {k.kullaniciAdi !== "admin" && <button type="button" onClick={() => kullaniciSil(k.id)} className="text-xs text-red-500 hover:text-red-700">Sil</button>}
                        </div>
                      ))}
                    </div>
                    {kullaniciHata && <p className="text-xs text-red-500">{kullaniciHata}</p>}
                    {kullaniciBasarili && <p className="text-xs text-emerald-600">{kullaniciBasarili}</p>}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-start gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700"><ClipboardList size={16} className="text-slate-500 dark:text-slate-400" /></div>
                <div className="min-w-0 flex-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Silme Onay Kodu (4 haneli)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="text" inputMode="numeric" maxLength={4} value={silmeKodu} onChange={(e) => kodKaydet(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-center text-lg font-bold tracking-[0.5em] transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="****" />
                    {silmeKodu && <button type="button" onClick={() => kodKaydet("")} className="text-xs text-slate-400 hover:text-red-500">Temizle</button>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Boş bırakılırsa kod sorulmaz.</p>
                </div>
              </div>

              {kullanici.rol === "admin" && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Beni Hatırla</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Açıkken uygulama yeniden açıldığında oturum korunur.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={beniHatirla}
                    onClick={() => {
                      const yeniDeger = !beniHatirla;
                      setBeniHatirla(yeniDeger);
                      api.ayarKaydet("beni_hatirla", yeniDeger ? "true" : "false");
                    }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                      beniHatirla
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                        beniHatirla ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {kullanici.rol === "admin" && <div className="space-y-5">
            <div className="rounded-xl border border-[var(--ui-border)] bg-gradient-to-br from-slate-100 via-white to-blue-100/60 p-5 shadow-sm dark:border-[var(--ui-dark-border)] dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/40">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-700"><HardDrive size={16} className="text-slate-500 dark:text-slate-400" /></div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Yedek Ayarları</p>
              </div>
              <div className="mt-5 space-y-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={yedekOtomatik} onChange={(e) => { setYedekOtomatik(e.target.checked); api.ayarKaydet("yedek_al", e.target.checked ? "true" : ""); }} className="h-4 w-4 rounded border-slate-300 accent-[var(--renk-marka-600)]" />
                  <span className="text-slate-700 dark:text-slate-300">Otomatik Yedek Al</span>
                </label>
                {yedekOtomatik && <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Sıklık</label>
                  <select value={yedekAralik} onChange={(e) => { setYedekAralik(e.target.value); api.ayarKaydet("yedek_aralik", e.target.value); }} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950">
                    <option value="1">1 Saat</option>
                    <option value="24">24 Saat</option>
                    <option value="168">1 Hafta</option>
                  </select>
                </div>}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Klasör</label>
                  <div className="mt-1 flex gap-1.5">
                    <input type="text" value={yedekKlasor} onChange={(e) => { setYedekKlasor(e.target.value); api.ayarKaydet("yedek_klasor", e.target.value); }} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="Varsayılan: yedek/" />

                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Saklama</label>
                  <select value={yedekSayi} onChange={(e) => { setYedekSayi(e.target.value); api.ayarKaydet("yedek_sayi", e.target.value); }} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-950">
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                    <option value="sinirsiz">Sınırsız</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={async () => { try { await api.yedekAl(); api.yedekSonGetir().then(setYedekSon); api.yedekSayisiGetir().then(setYedekSayisi); api.excelYedekSayisiGetir().then(setExcelYedekSayisi); setToastMesaj("Yedek başarıyla alındı"); setTimeout(() => setToastMesaj(""), 3000); } catch {} }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--renk-marka-600)] text-xs font-semibold text-white transition hover:bg-[var(--renk-marka-700)]"><RotateCcw size={13} />Yedek Al</button>
                  <button type="button" onClick={excelYedekAl} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><FileSpreadsheet size={13} />Export</button>
                  <button type="button" onClick={excelImportAl} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"><FileText size={13} />Import</button>
                  <button type="button" onClick={() => { api.yedekKlasoruAc(); }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><ChevronRight size={13} />Aç</button>
                </div>
                <p className="text-[11px] text-slate-400">{yedekSayisi} DB, {excelYedekSayisi} Excel</p>
                <p className="text-[11px] text-slate-400">{yedekSon ? "Son: " + new Date(yedekSon).toLocaleString("tr-TR") : yedekSayisi > 0 || excelYedekSayisi > 0 ? "(son yedek bilinmiyor)" : "(henüz yedek alınmamış)"}</p>
              </div>
            </div>
          </div>}
        </div>
      </Panel>
      {toastMesaj && <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition">{toastMesaj}</div>}
    </div>
  );
}

function LoglarSayfasi() {
  const [loglar, setLoglar] = useState<Log[]>([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(1);
  const [limit, setLimit] = useState(50);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [siliyor, setSiliyor] = useState(false);
  const [arama, setArama] = useState("");
  const [logSaklamaAy, setLogSaklamaAy] = useState("3");
  const yenile = async () => {
    setYukleniyor(true);
    try {
      const s = await api.loglariListele(sayfa, limit);
      setLoglar(s.veriler || []);
      setToplam(s.toplam || 0);
    } catch (e) {
      console.error("Loglar yüklenirken hata:", e);
    } finally {
      setYukleniyor(false);
    }
  };
  useEffect(() => { yenile(); }, [sayfa, limit]);
  useEffect(() => { api.ayarGetir("log_saklama_ay").then((v) => v && setLogSaklamaAy(v)); }, []);
  const silTumunu = async () => {
    if (!confirm("Tüm log kayıtları silinecek. Emin misiniz?")) return;
    setSiliyor(true);
    try {
      await api.loglariSil();
      setLoglar([]);
      setToplam(0);
      setSayfa(1);
    } catch (e) {
      console.error("Loglar silinirken hata:", e);
    } finally {
      setSiliyor(false);
    }
  };
  const filtrelenmis = arama ? loglar.filter((l) => `${l.kullanici} ${l.islem} ${l.detay}`.toLocaleLowerCase("tr-TR").includes(arama.toLocaleLowerCase("tr-TR"))) : loglar;
  return (
    <Panel baslik={<div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"><Clock size={16} className="text-slate-500 dark:text-slate-400" /></div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Loglar</p></div>} aksiyon={toplam > 0 ? <button onClick={silTumunu} disabled={siliyor} className="inline-flex h-7 items-center gap-1 rounded-md bg-red-50/40 px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50">{siliyor ? "Siliniyor..." : "Tüm Logları Sil"}</button> : undefined}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">{toplam} kayıt</p>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ara..." className="h-7 w-48 rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs outline-none transition hover:border-sky-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Saklama:</label>
            <select value={logSaklamaAy} onChange={(e) => { setLogSaklamaAy(e.target.value); api.ayarKaydet("log_saklama_ay", e.target.value); }} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950">
              <option value="1">1 Ay</option>
              <option value="3">3 Ay</option>
              <option value="6">6 Ay</option>
            </select>
            <label className="text-xs text-slate-400">Sayfa başı:</label>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setSayfa(1); }} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950">
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--ui-border)] dark:border-[var(--ui-dark-border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--ui-bg-table-header)] dark:bg-[var(--ui-dark-bg-table-header)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]">Tarih</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]">Kullanıcı</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]">İşlem</th>
                <th className="px-3 py-2 text-left font-medium text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]">Detay</th>
              </tr>
            </thead>
            <tbody>
              {filtrelenmis.map((l) => (
                <tr key={l.id} className="border-t text-[var(--ui-text-muted)] dark:text-[var(--ui-dark-text-muted)]" style={{ borderTop: "1px solid var(--ui-border)" }}>
                  <td className="whitespace-nowrap px-3 py-2">{l.tarih}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{l.kullanici}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">{l.islem}</td>
                  <td className="px-3 py-2">{l.detay}</td>
                </tr>
              ))}
              {filtrelenmis.length === 0 && !yukleniyor && <tr><td colSpan={4} className="px-3 py-8 text-center text-[var(--ui-text-muted)]">{arama ? "Aramanızla eşleşen log kaydı bulunamadı." : "Henüz log kaydı yok."}</td></tr>}
            </tbody>
          </table>
        </div>
        <Sayfalama sayfa={sayfa} toplam={toplam} limit={limit} onSayfa={(s) => setSayfa(s)} />
      </div>
    </Panel>
  );
}



