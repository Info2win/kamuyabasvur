import { parseApplicationMethods, parseIlan } from "./parse";
import type { JobRecord } from "./types";

type DemoSeed = {
  key: string;
  title: string;
  institution: string;
  category: string;
  kadroCount: number;
  cities: string[];
  publishedDaysAgo: number;
  endInDays: number;
  startInDays: number;
  text: string;
};

/**
 * Canlı kaynaklara (kamuilan.sbb.gov.tr / Kariyer Kapısı) erişilemediğinde
 * uygulamanın tüm özelliklerini göstermek için kullanılan gerçekçi örnek ilanlar.
 * Kayıtlar `isDemo = true` olarak işaretlenir ve arayüzde "Örnek veri" rozeti taşır.
 */
const SEEDS: DemoSeed[] = [
  {
    key: "demo-milli-saraylar",
    title: "MİLLİ SARAYLAR İDARESİ BAŞKANLIĞI - 158 Sözleşmeli Personel Alımı İlanı",
    institution: "Milli Saraylar İdaresi Başkanlığı",
    category: "Sözleşmeli Personel İlanları",
    kadroCount: 158,
    cities: ["İstanbul", "Ankara"],
    publishedDaysAgo: 2,
    startInDays: -2,
    endInDays: 9,
    text: `Milli Saraylar İdaresi Başkanlığı merkez ve taşra teşkilatı birimlerinde 657 sayılı Kanunun 4/B maddesi kapsamında istihdam edilmek üzere 158 sözleşmeli personel alınacaktır.
Başvurular 15 gün boyunca Kariyer Kapısı (https://kariyerkapisi.gov.tr) üzerinden e-Devlet şifresi ile elektronik ortamda yapılacaktır. Şahsen veya posta yoluyla yapılan başvurular kabul edilmeyecektir.
GENEL ŞARTLAR: 657 sayılı Kanunun 48 inci maddesindeki şartları taşımak, 2024 yılı KPSS (B) grubu sınavına girmiş olmak, lisans mezunları için KPSSP3, ön lisans mezunları için KPSSP93, ortaöğretim mezunları için KPSSP94 puan türünden en az 60 puan almış olmak. Başvuru tarihinin son günü itibarıyla 35 yaşını doldurmamış olmak. Herhangi bir sosyal güvenlik kurumundan emeklilik veya yaşlılık aylığı almıyor olmak. Güvenlik soruşturması ve arşiv araştırması sonucu olumlu olmak.
KADROLAR:
Büro Personeli (İnsan Kaynakları) 24 P3
Büro Personeli (Maliye) 18 P3
Koruma ve Güvenlik Görevlisi 40 P93
Destek Personeli (Temizlik) 46 P94
Müze Görevlisi 16 P93
Tekniker (Elektrik) 8 P93
Restoratör 6 P3
ARANAN NİTELİKLER: Büro Personeli (İnsan Kaynakları) için üniversitelerin İnsan Kaynakları Yönetimi Bölümü, Kamu Yönetimi Bölümü veya İşletme Bölümü mezunu olmak. Büro Personeli (Maliye) için Maliye Bölümü, İktisat Bölümü veya Muhasebe Bölümü mezunu olmak. Koruma ve Güvenlik Görevlisi için özel güvenlik görevlisi kimlik kartına sahip olmak, 5188 sayılı Kanundaki şartları taşımak, vardiyalı çalışmaya engel durumu olmamak. Restoratör için Taşınabilir Kültür Varlıklarını Koruma ve Onarım Bölümü mezunu olmak.
Kontenjanlar: İstanbul Kontenjan (98), Ankara Kontenjan (60).
Görev yeri Başkanlığımızca ihtiyaç durumuna göre belirlenecek olup adaylar görev yerini kabul etmiş sayılır. Seyahat engeli bulunmamak şartı aranmaktadır.`,
  },
  {
    key: "demo-saglik-bakanligi",
    title: "SAĞLIK BAKANLIĞI - 4.958 Sözleşmeli Sağlık Personeli Alımı (KPSS ile merkezi yerleştirme)",
    institution: "T.C. Sağlık Bakanlığı",
    category: "Sözleşmeli Personel İlanları",
    kadroCount: 4958,
    cities: ["Ankara", "İstanbul", "İzmir", "Bursa", "Konya", "Gaziantep", "Erzurum", "Samsun", "Diyarbakır", "Adana"],
    publishedDaysAgo: 5,
    startInDays: -5,
    endInDays: 4,
    text: `Sağlık Bakanlığı taşra teşkilatı hizmet birimlerinde istihdam edilmek üzere 657 sayılı Kanunun 4/B maddesi kapsamında 4.958 sözleşmeli sağlık personeli alınacaktır.
Yerleştirme işlemleri ÖSYM tarafından KPSS-2026/4 tercih kılavuzu ile merkezi olarak yapılacaktır. Adaylar tercihlerini ÖSYM'nin https://ais.osym.gov.tr adresinden T.C. kimlik numarası ve şifresi ile kendileri yapacaklardır. Mülakat veya sözlü sınav yapılmayacaktır.
ŞARTLAR: 2024 KPSS sınavına girmiş olmak. Lisans mezunları için KPSSP3, ön lisans mezunları için KPSSP93 puan türü kullanılacaktır. Taban puan şartı aranmamaktadır ancak kontenjanların sınırlı olması nedeniyle yüksek puanlı adaylar yerleşmektedir. Tercih edilecek pozisyon için aranan öğrenim şartını taşımak.
POZİSYONLAR:
Hemşire 2200 P3
Ebe 380 P3
Anestezi Teknikeri 240 P93
İlk ve Acil Yardım Teknikeri 300 P93
Röntgen Teknikeri 260 P93
Laboratuvar Teknikeri 180 P93
Fizyoterapist 120 P3
Diyetisyen 90 P3
Psikolog 80 P3
Çocuk Gelişimcisi 60 P3
Aranan bölümler: Hemşirelik Bölümü, Ebelik Bölümü, Anestezi Bölümü, İlk ve Acil Yardım Bölümü, Tıbbi Görüntüleme Teknikleri Bölümü, Tıbbi Laboratuvar Teknikleri Bölümü, Fizyoterapi ve Rehabilitasyon Bölümü, Beslenme ve Diyetetik Bölümü, Psikoloji Bölümü, Çocuk Gelişimi Bölümü.
Adayların görev yapacağı il kontenjan listesi kılavuz ekinde yer almaktadır. Görevini devamlı yapmasına engel olabilecek akıl hastalığı bulunmamak.`,
  },
  {
    key: "demo-tcdd",
    title: "TCDD TAŞIMACILIK A.Ş. - 166 Sürekli İşçi İstihdamı",
    institution: "TCDD Taşımacılık A.Ş. Genel Müdürlüğü",
    category: "Sürekli İşçi",
    kadroCount: 166,
    cities: ["Ankara", "İzmir", "Sivas", "Malatya", "Eskişehir", "Kayseri"],
    publishedDaysAgo: 1,
    startInDays: -1,
    endInDays: 6,
    text: `Teşekkülümüzün işyerlerine 166 sürekli işçi alınacaktır. Başvurular Türkiye İş Kurumu (İŞKUR) internet sitesi üzerinden (https://esube.iskur.gov.tr) ilan tarihleri arasında yapılacaktır. İŞKUR tarafından bildirilen nihai listedeki adaylar sözlü sınava tabi tutulacaktır.
GENEL ŞARTLAR: Türk vatandaşı olmak, 18 yaşını tamamlamış ve 35 yaşını doldurmamış olmak, kamu haklarından mahrum bulunmamak, askerlikle ilişiği bulunmamak (yapmış olmak, tecilli veya muaf olmak), görevini devamlı yapmasına engel sağlık sorunu bulunmamak.
KPSS ŞARTI: Bu alımda KPSS puan şartı aranmamaktadır. Adaylar İŞKUR üzerinden başvuru yapacak olup noter huzurunda kura çekimi ve sözlü sınav ile yerleştirme yapılacaktır.
KADROLAR:
Demiryolu Yol Yapım Bakım ve Onarım Makinesi Operatörü 48
Tren Teşkil İşçisi 52
Elektrik İşçisi 18
Mekanik Vasıta Tesis Cihaz Vinç Operatörü 24
Kaynakçı 14
Lokomotif Bakım Onarım İşçisi 10
ARANAN ÖĞRENİM: Meslek yüksekokullarının Raylı Sistemler Makine Teknolojisi Bölümü, Raylı Sistemler Elektrik ve Elektronik Bölümü, Elektrik Bölümü, Makine Bölümü veya ortaöğretim (lise) mezunu olmak. İlgili meslek kolunda en az 2 yıl deneyim sahibi olmak tercih sebebidir.
Sağlık durumu: Demiryolu işlerinde çalışmaya uygun olduğuna dair sağlık kurulu raporu istenecektir. Erkek adaylar için askerlik görevini yapmış olmak. B sınıfı sürücü belgesi sahibi olmak (Mekanik Vasıta kadroları için C sınıfı ehliyet aranmaktadır).
Kontenjan illeri: Ankara Kontenjan (46), İzmir Kontenjan (32), Sivas Kontenjan (24), Malatya Kontenjan (20), Eskişehir Kontenjan (24), Kayseri Kontenjan (20).`,
  },
  {
    key: "demo-vakif-uzman",
    title: "VAKIFLAR GENEL MÜDÜRLÜĞÜ - Vakıf Uzman Yardımcılığı Giriş Sınavı (15 kişi)",
    institution: "Vakıflar Genel Müdürlüğü",
    category: "A Grubu Memur (Kariyer Meslek)",
    kadroCount: 15,
    cities: ["Ankara"],
    publishedDaysAgo: 3,
    startInDays: -3,
    endInDays: 14,
    text: `Genel Müdürlüğümüz merkez teşkilatında görevlendirilmek üzere 15 (on beş) Vakıf Uzman Yardımcısı alınacaktır. Giriş sınavı yazılı ve sözlü olmak üzere iki aşamalı yapılacaktır.
BAŞVURU ŞARTLARI: En az dört yıllık lisans eğitimi veren hukuk, siyasal bilgiler, iktisat, işletme, iktisadi ve idari bilimler fakülteleri ile sanat tarihi, arkeoloji, mimarlık, inşaat mühendisliği, bilgisayar mühendisliği bölümlerinden veya bunlara denkliği kabul edilen yurt dışındaki yükseköğretim kurumlarından mezun olmak.
2024 yılı KPSS lisans sınavından KPSSP3 puan türünden en az 80 puan almış olmak ve başvuru yapanlar arasında en yüksek puanlı 300 kişi içinde bulunmak.
Sınavın yapıldığı yılın ocak ayının birinci günü itibarıyla 35 yaşını doldurmamış olmak.
Başvurular e-Devlet üzerinden Vakıflar Genel Müdürlüğü Kariyer Kapısı Kamu İşe Alım hizmeti ile yapılacaktır. Posta ile veya şahsen başvuru kabul edilmeyecektir.
ARANAN BELGELER: Diploma veya mezuniyet belgesi, KPSS sonuç belgesi, özgeçmiş, vesikalık fotoğraf. Yazılı sınav Ankara'da yapılacaktır. Seyahat engeli bulunmamak. Erkek adaylar için askerlikle ilişiği bulunmamak.`,
  },
  {
    key: "demo-universite-hemsire",
    title: "GAZİ ÜNİVERSİTESİ REKTÖRLÜĞÜ - 78 Sözleşmeli Personel (Hemşire, Sağlık Teknikeri, Büro Personeli)",
    institution: "Gazi Üniversitesi Rektörlüğü",
    category: "Sözleşmeli Personel İlanları",
    kadroCount: 78,
    cities: ["Ankara"],
    publishedDaysAgo: 4,
    startInDays: -4,
    endInDays: 11,
    text: `Üniversitemiz Hastanesi Başmüdürlüğü ve merkez birimlerinde 657 sayılı Kanunun 4/B maddesi uyarınca 78 sözleşmeli personel alınacaktır. Başvurular ilanın Resmî Gazete'de yayımlandığı tarihten itibaren 15 gün içinde https://personelbasvuru.gazi.edu.tr adresinden çevrimiçi olarak yapılacaktır. Şahsen ve posta ile başvuru kabul edilmeyecektir.
GENEL ŞARTLAR: 657 sayılı Kanunun 48/A maddesindeki şartları taşımak, 2024 KPSS (B) grubu sınavına girmiş olmak, lisans mezunları için KPSSP3, ön lisans mezunları için KPSSP93 puan türünden en az 65 puan almış olmak, son başvuru tarihi itibarıyla 30 yaşını doldurmamış olmak, nöbet usulü çalışmaya engel hali bulunmamak.
KADROLAR:
Hemşire 30 P3
Sağlık Teknikeri (Anestezi) 12 P93
Röntgen Teknikeri 10 P93
Laborant 8 P93
Büro Personeli 10 P3
Destek Personeli (Hasta Bakımı) 8 P94
ARANAN NİTELİKLER: Hemşire kadrosu için Hemşirelik Bölümü veya Sağlık Memurluğu Bölümü lisans mezunu olmak. Sağlık Teknikeri kadroları için ilgili ön lisans programlarından mezun olmak. Büro Personeli için İktisat Bölümü, İşletme Bölümü, Maliye Bölümü veya İnsan Kaynakları Yönetimi Bölümü mezunu olmak. Tercihen hastane deneyimi olan adaylar önceliklidir.
Güvenlik soruşturması ve arşiv araştırması yapılacak olup sonucu olumlu olan adaylarla sözleşme imzalanacaktır. Erkek adayların askerlik hizmetini fiilen tamamlamış veya muaf olması gerekmektedir.`,
  },
  {
    key: "demo-belediye-zabita",
    title: "KONYA BÜYÜKŞEHİR BELEDİYESİ - 60 Zabıta Memuru Alımı (Kadrolu)",
    institution: "Konya Büyükşehir Belediyesi",
    category: "Kamu Personeli Alım İlanları",
    kadroCount: 60,
    cities: ["Konya"],
    publishedDaysAgo: 6,
    startInDays: -6,
    endInDays: 8,
    text: `Belediyemizde münhal bulunan 60 adet Zabıta Memuru kadrosuna 657 sayılı Kanuna tabi olarak açıktan atama yapılacaktır. Başvurular şahsen Konya Büyükşehir Belediyesi İnsan Kaynakları ve Eğitim Dairesi Başkanlığına yapılacaktır. Posta ve e-posta ile başvuru kabul edilmeyecektir.
ÖZEL ŞARTLAR: En az ön lisans düzeyinde eğitim veren yüksekokulların herhangi bir bölümünden mezun olmak. 2024 KPSS ön lisans sınavından KPSSP93 puan türünden en az 70 puan almış olmak. Sınav tarihinde 30 yaşını doldurmamış olmak. Erkeklerde en az 1.67 metre, kadınlarda en az 1.60 metre boyunda olmak ve boyun 1 metreden fazla olan kısmı ile kilosu arasında (+,-) 10 kilogramdan fazla fark olmamak. Boy ve kilo ölçümü belediyemizce yapılacaktır.
B sınıfı sürücü belgesine sahip olmak. Daha önce çalıştığı kamu kurum ve kuruluşlarından disiplinsizlik veya ahlaki nedenlerle çıkarılmış olmamak. Görevini devamlı yapmasına engel olabilecek akıl hastalığı bulunmamak.
DEĞERLENDİRME: Yazılı ve uygulamalı sınav yapılacaktır. Başarı puanı KPSS puanı ile sınav puanının ortalaması alınarak belirlenir. Adayların sınava giriş belgeleri belediyemiz internet sitesinde ilan edilecektir.
Kontenjan: Konya Kontenjan (60). Zabıta memurları belediyemiz sınırları içinde görev yapacaktır, seyahat engeli bulunmamak.`,
  },
  {
    key: "demo-bilisim",
    title: "TÜRK PATENT VE MARKA KURUMU - Sözleşmeli Bilişim Personeli Alım İlanı (6 kişi)",
    institution: "Türk Patent ve Marka Kurumu",
    category: "Sözleşmeli Personel İlanları",
    kadroCount: 6,
    cities: ["Ankara"],
    publishedDaysAgo: 8,
    startInDays: -8,
    endInDays: 3,
    text: `Kurumumuz Bilgi İşlem Dairesi Başkanlığında istihdam edilmek üzere 375 sayılı KHK'nin ek 6 ncı maddesi kapsamında 6 sözleşmeli bilişim personeli alınacaktır.
BAŞVURU ŞARTLARI: Fakültelerin dört yıllık bilgisayar mühendisliği, yazılım mühendisliği, elektrik mühendisliği, elektronik mühendisliği, elektrik ve elektronik mühendisliği veya endüstri mühendisliği bölümlerinden mezun olmak. Yazılım, yazılım tasarımı ve geliştirilmesi ile bu sürecin yönetimi veya büyük ölçekli ağ sistemlerinin kurulumu ve yönetimi konusunda en az 3 yıl mesleki tecrübeye sahip olmak. Bilgisayar çevre birimlerinin donanımı ve kurulan ağ yönetimi güvenliği hakkında bilgi sahibi olmak. Erkek adaylar için askerliğini yapmış olmak veya muaf bulunmak.
2024 KPSS lisans sınavından KPSSP3 puan türünden alınan puanın %70'i ile yabancı dil puanının %30'unun toplamı esas alınarak sıralama yapılacaktır. KPSS puanı olmayan veya belge ibraz etmeyen adayların KPSS puanı 70 olarak değerlendirilecektir.
POZİSYONLAR:
Kıdemli Yazılım Geliştirici 2
Ağ ve Sistem Uzmanı 2
Bilgi Güvenliği Uzmanı 1
Veri Tabanı Uzmanı 1
Başvurular Kariyer Kapısı Kamu İşe Alım Platformu üzerinden (https://kariyerkapisi.gov.tr) elektronik ortamda yapılacaktır. Sözlü/uygulamalı sınav Ankara'da gerçekleştirilecektir.
TERCİH SEBEPLERİ: .NET veya Java teknolojilerinde sertifika sahibi olmak, Microsoft SQL Server veya PostgreSQL veritabanı yönetim sistemi konusunda belge sahibi olmak, C sınıfı ehliyet zorunlu değildir.`,
  },
  {
    key: "demo-kyem",
    title: "KIYI EMNİYETİ GENEL MÜDÜRLÜĞÜ - Personel Alım İlanı (9 Kişilik)",
    institution: "Kıyı Emniyeti Genel Müdürlüğü",
    category: "Sözleşmeli Personel İlanları",
    kadroCount: 9,
    cities: ["İstanbul", "İzmir", "Çanakkale", "Samsun"],
    publishedDaysAgo: 10,
    startInDays: -10,
    endInDays: 1,
    text: `Kuruluşumuz taşra teşkilatında görevlendirilmek üzere 9 personel alınacaktır. Başvurular ilan tarihinden itibaren 15 gün içinde Genel Müdürlüğümüz İnsan Kaynakları Dairesi Başkanlığına şahsen veya iadeli taahhütlü posta ile yapılacaktır.
GENEL ŞARTLAR: Türk vatandaşı olmak, kamu haklarından mahrum bulunmamak, 2024 KPSS lisans sınavından KPSSP3 puan türünden en az 75 puan almış olmak, başvuru tarihi itibarıyla 40 yaşını doldurmamış olmak, askerlikle ilişiği bulunmamak.
KADROLAR:
Gemi Trafik Operatörü 3 P3
Elektronik Mühendisi 2 P3
Makine Mühendisi 2 P3
Avukat 1 P3
Memur 1 P3
ARANAN NİTELİKLER: Gemi Trafik Operatörü için Deniz Ulaştırma İşletme Mühendisliği Bölümü mezunu olmak ve GMDSS telsiz operatörü yeterlik belgesine sahip olmak. Mühendis kadroları için ilgili mühendislik bölümlerinden mezun olmak. Avukat kadrosu için Hukuk Fakültesi mezunu olmak ve avukatlık ruhsatnamesine sahip olmak.
Gemi Trafik Operatörleri vardiyalı olarak çalışacak olup deniz trafiğinin yoğun olduğu istasyonlarda görevlendirilecektir. Sağlık durumu deniz hizmetine elverişli olmak ve seyahat engeli bulunmamak. B sınıfı sürücü belgesi sahibi olmak tercih sebebidir.
Kontenjan illeri: İstanbul Kontenjan (3), İzmir Kontenjan (2), Çanakkale Kontenjan (2), Samsun Kontenjan (2).`,
  },
  {
    key: "demo-adalet-zabit",
    title: "ADALET BAKANLIĞI - 1.500 Sözleşmeli Zabıt Kâtibi ve Mübaşir Alımı",
    institution: "T.C. Adalet Bakanlığı",
    category: "Sözleşmeli Personel İlanları",
    kadroCount: 1500,
    cities: ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Kocaeli", "Gaziantep", "Trabzon", "Van", "Adana", "Mersin", "Kayseri"],
    publishedDaysAgo: 12,
    startInDays: -12,
    endInDays: 2,
    text: `Bakanlığımız taşra teşkilatı adliyelerinde görevlendirilmek üzere 1.500 sözleşmeli zabıt kâtibi ve mübaşir alınacaktır. Başvurular adalet komisyon başkanlıklarına şahsen yapılacaktır.
GENEL ŞARTLAR: En az lise veya dengi okul mezunu olmak, 2024 KPSS ortaöğretim sınavından KPSSP94 veya ön lisans sınavından KPSSP93 puan türünden en az 70 puan almış olmak, son başvuru tarihi itibarıyla 35 yaşını doldurmamış olmak, askerlikle ilişiği bulunmamak.
KADROLAR:
Sözleşmeli Zabıt Kâtibi 1000 P94
Sözleşmeli Mübaşir 300 P93
Sözleşmeli Şoför 100 P94
Sözleşmeli Teknisyen 100 P94
ZABIT KÂTİPLİĞİ İÇİN: Uygulamalı sınavda üç dakikada yanlışsız en az doksan kelime yazmak. Klavye (F veya Q) kullanabilmek. Bilgisayar dersini başarıyla tamamladığını belgelemek veya MEB onaylı bilgisayar işletmenliği sertifikası sahibi olmak.
MÜBAŞİRLİK İÇİN: Herhangi bir lise veya ön lisans programından mezun olmak, görevini devamlı yapmasına engel sağlık sorunu bulunmamak.
Şoför kadrosu için en az B sınıfı sürücü belgesine sahip olmak ve 5 yıllık ehliyeti bulunmak.
Sözlü sınav ilgili adalet komisyonlarınca yapılacaktır. Güvenlik soruşturması ve arşiv araştırması sonucu olumlu olmak şarttır. Adaylar yalnızca bir adalet komisyonuna başvurabilir.`,
  },
  {
    key: "demo-jandarma",
    title: "JANDARMA GENEL KOMUTANLIĞI - 2026 Yılı Muvazzaf Subay/Astsubay Temini",
    institution: "Jandarma Genel Komutanlığı",
    category: "Askeri Personel İlanları",
    kadroCount: 320,
    cities: ["Ankara"],
    publishedDaysAgo: 7,
    startInDays: -7,
    endInDays: 18,
    text: `Jandarma Genel Komutanlığına 2026 yılında muvazzaf subay ve astsubay statüsünde 320 personel temin edilecektir. Başvurular https://vatandas.jandarma.gov.tr adresinden çevrimiçi olarak yapılacaktır.
TEMİN ŞARTLARI: Türkiye Cumhuriyeti vatandaşı olmak, lisans mezunları için 27 yaşını, ön lisans mezunları için 26 yaşını doldurmamış olmak (müracaat tarihi itibarıyla), düzeltilmemiş nüfus kaydına göre işlem yapılacaktır.
KPSS ŞARTI: Subay temininde 2024 KPSS lisans sınavından KPSSP3 puan türünden en az 60 puan, astsubay temininde KPSSP93 puan türünden en az 60 puan almış olmak. Şehit ve vazife malulü eş ve çocukları için bu puanların %80'i yeterli sayılır.
Boy ve kilo standartları Jandarma Genel Komutanlığı sağlık yeteneği yönetmeliğinde belirtilen şartlara uygun olmak. Erkeklerde en az 1.67 metre, kadınlarda en az 1.60 metre boyunda olmak.
SEÇİM AŞAMALARI: Yazılı sınav, fiziki yeterlilik sınavı, mülakat ve sağlık muayenesi. Başarılı olan adaylar Jandarma ve Sahil Güvenlik Akademisinde eğitime alınacaktır.
ARANAN BÖLÜMLER: Hukuk Fakültesi, Uluslararası İlişkiler Bölümü, Kamu Yönetimi Bölümü, İşletme Bölümü, İktisat Bölümü, Bilgisayar Mühendisliği Bölümü, Elektrik Elektronik Mühendisliği Bölümü, İnşaat Mühendisliği Bölümü, Makine Mühendisliği Bölümü, Rehberlik ve Psikolojik Danışmanlık Bölümü, Beden Eğitimi ve Spor Bölümü.
Güvenlik soruşturması ve arşiv araştırması olumlu olmak. Her türlü iklim ve arazi koşulunda görev yapmaya engel hali bulunmamak. Sağlık Bakanlığı onaylı sağlık kurulu raporu istenecektir.`,
  },
];

export function buildDemoJobs(now = new Date()): JobRecord[] {
  return SEEDS.map((seed) => {
    const published = new Date(now);
    published.setUTCDate(published.getUTCDate() - seed.publishedDaysAgo);
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() + seed.startInDays);
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() + seed.endInDays);
    end.setUTCHours(20, 59, 0, 0);

    const parsed = parseIlan({ title: seed.title, text: seed.text, category: seed.category, parsedFrom: "detay" });
    const { methods, applyUrl } = parseApplicationMethods(`${seed.text}`);
    parsed.applicationMethods = methods;

    return {
      sourceKey: seed.key,
      source: "demo",
      title: seed.title,
      institution: seed.institution,
      unit: null,
      ilanNo: null,
      category: seed.category,
      ilanType: null,
      institutionType: null,
      publishedAt: published.toISOString(),
      applicationStart: start.toISOString(),
      applicationEnd: end.toISOString(),
      kadroCount: seed.kadroCount,
      cities: seed.cities,
      positions: parsed.positions,
      rawText: seed.text,
      parsed,
      detailUrl: `https://kamuilan.sbb.gov.tr/`,
      applyUrl: applyUrl ?? "https://kariyerkapisi.gov.tr/",
      logoUrl: null,
      isDemo: true,
      fetchedAt: now.toISOString(),
    } satisfies JobRecord;
  });
}
