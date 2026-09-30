import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Users,
  DoorClosed,
  GraduationCap,
  LayoutGrid,
  Split,
  BarChart3,
  Keyboard,
  ShieldCheck,
  ChevronRight,
  Zap,
  Award,
} from 'lucide-react';

interface HelpTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: number;
  onSelectTab: (tabId: number) => void;
}

export const HelpTipsModal: React.FC<HelpTipsModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  const [activeCategory, setActiveCategory] = useState<'STEPS' | 'TIPS' | 'FAQ' | 'SHORTCUTS'>('STEPS');

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: '1. Sınav Tanımlama',
      icon: BookOpen,
      badge: 'Başlangıç',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      desc: 'Sınavın adını, tarihini, uygulanacağı ders saatini ve sınava katılacak sınıf seviyelerini (ör. 9, 10, 11, 12) belirleyin.',
      tips: [
        'Kelebek algoritmasının verimli çalışması için en az 2 farklı sınıf kademesi (ör. 9 ve 11. sınıflar) seçilmelidir.',
        'Her sınıf kademesinin o oturumda gireceği dersi tanımlayın (ör. 9. Sınıf Matematik, 10. Sınıf Kimya).',
        'Birden fazla sınav tanımlayabilir ve üst bardaki "Aktif Sınav" menüsünden aralarında geçiş yapabilirsiniz.',
      ],
    },
    {
      id: 2,
      title: '2. Öğrenci Listesi',
      icon: Users,
      badge: 'Veri Girişi',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      desc: 'Öğrenci listesini Excel/CSV formatından içe aktarın, manuel öğrenci ekleyin veya Google E-Tablolar ile eşitleyin.',
      tips: [
        'Excel yüklerken ilk satırda "Okul No, Ad, Soyad, Sınıf/Şube" sütunlarının olması yeterlidir.',
        'BEP (Bireyselleştirilmiş Eğitim Programı) kapsamındaki öğrencileri "BEP" olarak işaretleyin; sistem onları öncelikli ve ön sıralara yerleştirir.',
        'Örnek verilerle denemek için "Veri Yönetimi > Örnek Demo Okul Verisi Yükle" seçeneğini kullanabilirsiniz.',
      ],
    },
    {
      id: 3,
      title: '3. Salon Yönetimi',
      icon: DoorClosed,
      badge: 'Kapasite',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      desc: 'Sınavda kullanılacak derslikleri seçin, sıra düzenlerini (2\'li sıra, 3\'lü sıra, tekli sıra) ve toplam kapasiteleri yapılandırın.',
      tips: [
        'Kapasite Kuralı: Toplam salon kapasitesi, sınava girecek toplam öğrenci mevcudundan %5-10 fazla olmalıdır.',
        'Sıra yerleşim krokisi standart sütun ve satır mantığıyla otomatik hesaplanır.',
        'Kullanılmayacak sınıfların yanındaki onay işaretini kaldırarak dağıtım dışı bırakabilirsiniz.',
      ],
    },
    {
      id: 4,
      title: '4. Gözetmen Programı',
      icon: GraduationCap,
      badge: 'Görevlendirme',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      desc: 'Öğretmen listenizi yükleyin ve sınav salonlarına adil, branş çakışmasını engelleyen gözetmen ataması yapın.',
      tips: [
        'Kural: Kendi branş dersi olan öğretmenler o sınavda kendi branş salonlarına gözetmen olarak verilmez.',
        '"Otomatik Dağıt" butonu salon başına 1 asil (isteğe bağlı 1 yedek) gözetmeni adil görev sayısına göre dağıtır.',
        'Görevli öğretmen listesini tek tıkla resmi imza sirküsü formatında yazdırabilirsiniz.',
      ],
    },
    {
      id: 5,
      title: '5. Oturma Düzeni (Kelebek Motoru)',
      icon: LayoutGrid,
      badge: 'Algoritma',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      desc: 'Akıllı Kelebek Algoritmasını tek tuşla çalıştırarak öğrencileri salonlara yan yana ve ardışık çakışma olmadan yerleştirin.',
      tips: [
        '"Kelebek Dağıtımını Başlat" butonuna tıklayın; sistem milisaniyeler içinde binlerce permutasyonu değerlendirir.',
        'Algoritma, aynı kademedeki öğrencilerin yan yana, arka arkaya veya çapraz temas etmesini engeller.',
        'Salon kartlarına tıklayarak interaktif oturma planı krokisini inceleyebilir, koltukları kontrol edebilirsiniz.',
      ],
    },
    {
      id: 6,
      title: '6. Sınıf Dağılımları (Kapı Listeleri)',
      icon: Split,
      badge: 'Çıktı & Ası',
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      desc: 'Her şubenin kendi sınıf kapısına asılacak, öğrencilerin hangi salonda ve hangi sırada sınava gireceğini gösteren listeler.',
      tips: [
        'Şube bazında (Örn: 9-A, 10-B) listeler öğrencilerin sınav sabahı salonlarını kolayca bulmalarını sağlar.',
        '"Tüm Şubeleri Yazdır" seçeneğiyle her sınıf için ayrı sayfaya sayfa sonu (page-break) eklenmiş resmi çıktı alınır.',
      ],
    },
    {
      id: 7,
      title: '7. Sınav Analizi & Raporlama',
      icon: BarChart3,
      badge: 'Denetim',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      desc: 'Salon doluluk haritaları, sınıf karışım yüzdeleri ve salon yoklama/tutanak listeleri.',
      tips: [
        'Salon doluluk renkleri: Yeşil (%80+ yüksek verim), Mavi (%50-79 dengeli), Kırmızı (<%50 düşük doluluk).',
        'Salon Yoklama Listesi & İmzalı Tutanaklar tek tıkla A4 formatında basıma hazırdır.',
        'Sayfada tek ekranda çalışma için üstteki sekme anahtarlarını (Harita / Grafikler / Tablo) kullanabilirsiniz.',
      ],
    },
    {
      id: 8,
      title: '8. Yazdır & PDF Al (Evrak Merkezi)',
      icon: Printer,
      badge: 'Resmi Baskı',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      desc: 'Ortak sınav salon krokileri, gözetmen görev tebliğleri, BEP listeleri ve kapı evrakları.',
      tips: [
        'Tüm resmi evraklar MEB sınav yönergelerine tam uygun dikey ve yatay A4 standartlarındadır.',
        'Toplu veya tek tek salon bazında yazdırma ve PDF indirme seçeneklerini kullanabilirsiniz.',
      ],
    },
    {
      id: 9,
      title: '9. Sorumluluk Sınavları',
      icon: Award,
      badge: 'MEB Modülü',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      desc: 'Hangi dersten sınav yapılacağı, komisyon üyeleri öğretmenler, sınav salonu, girecek öğrenciler ve okul müdürü (komisyon başkanı) ayarlanır.',
      tips: [
        'MEB Sorumluluk Sınavı Yönetmeliğine tam uyumludur: Sınav Takvim Çizelgesi, Yoklama & Not Tutanağı, Kapı İlanı ve Teslim-Tesellüm Tutanağı hazırlanır.',
        'Okul Müdürü otomatik olarak Sınav Komisyon Başkanı olarak evraklarda mühür/imza yetkilisi olarak yer alır.',
        'Öğrenciler tek tek veya toplu olarak sınavlara atanabilir, sınav notları ve durumları (Geçti/Kaldı/Girmedi) işlenebilir.',
      ],
    },
  ];

  const goldenRules = [
    {
      title: 'Kelebek (Butterfly) Mantığı Nasıl Çalışır?',
      icon: Sparkles,
      color: 'text-amber-500 bg-amber-50 border-amber-200',
      content:
        'Kelebek sistemi; farklı sınıf kademelerindeki (ör. 9. sınıf ile 11. sınıf) öğrencilerin aynı salonda ardışık ve çapraz sıralarda oturtulması prensibine dayanır. Bu sayede yan yana veya arka arkaya oturan iki öğrenci asla aynı dersten sınava girmez ve kopya çekme ihtimali sıfıra iner.',
    },
    {
      title: 'Kapasite ve Koltuk Sayısı Dengesi',
      icon: DoorClosed,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
      content:
        'Algoritmanın mükemmel yerleşim yapabilmesi için tanımlanan toplam salon koltuk sayısı, sınava girecek öğrenci sayısından %5 ile %10 daha fazla olmalıdır. Sıfıra sıfır kapasitelerde köşelerde aynı kademeden öğrencilerin karşılaşma riski artabilir.',
    },
    {
      title: 'BEP (Kaynaştırma / Özel Eğitim) Önceliği',
      icon: ShieldCheck,
      color: 'text-purple-500 bg-purple-50 border-purple-200',
      content:
        'Sistem, BEP öğrencilerini öncelikli olarak tanımlar. Dağıtım motoru bu öğrencileri kapıya yakın, ön sıralarda ve gözetmen öğretmen masasına yakın noktalara yerleştirerek özel eğitim ve BEP ilkelerine tam uyum sağlar.',
    },
    {
      title: 'Resmi Yazdırma ve Çıktı Püf Noktası',
      icon: Printer,
      color: 'text-blue-500 bg-blue-50 border-blue-200',
      content:
        'Tarayıcınızda yazdır (Ctrl + P / Cmd + P) yaparken "Diğer Ayarlar > Arka Plan Grafikleri" (Background Graphics) seçeneğini mutlaka AÇIK tutun. Bu sayede sınıf renk kodları, sıra çizgileri ve tablo kenarlıkları resmi formata tam uygun basılır.',
    },
    {
      title: 'Veri Güvenliği ve Yerel Depolama',
      icon: CheckCircle2,
      color: 'text-indigo-500 bg-indigo-50 border-indigo-200',
      content:
        'Tüm öğrenci ve sınav verileriniz KVKK kapsamında sunucuya gitmeden tamamen kendi tarayıcınızın güvenli yerel hafızasında (LocalStorage) saklanır. Farklı bir bilgisayara geçmek için "Veri Yönetimi > Tüm Verileri Yedekle (JSON)" seçeneğiyle tek tıkla dosya aktarabilirsiniz.',
    },
  ];

  const faqs = [
    {
      q: 'Bazı öğrenciler salonlara yerleşemedi (Kapasite Uyarısı) uyarısı alıyorum, ne yapmalıyım?',
      a: 'Bu durum sınava katılan öğrenci mevcudunun, aktif seçilen salonların toplam koltuk kapasitesinden fazla olduğunu gösterir. "3. Salon Yönetimi" sekmesine giderek yeni bir salon ekleyin veya mevcut salonların sıra/koltuk sayılarını güncelleyip "Oturma Düzeni" sekmesinden dağıtımı yeniden başlatın.',
    },
    {
      q: 'Tek bir sınıf kademesi için (örneğin yalnızca 9. sınıflar) kelebek yapılır mı?',
      a: 'Kelebek sistemi doğası gereği en az 2 farklı kademenin (ör. 9 ve 10, veya 9 ve 11) birbirine çapraz örülmesiyle çalışır. Tek kademe seçildiğinde sistem öğrencileri şube bazında karıştırarak dağıtır, ancak en yüksek güvenlik için iki farklı kademe önerilir.',
    },
    {
      q: 'Öğrencileri e-Okul veya Excel\'den nasıl yükleyebilirim?',
      a: '"2. Öğrenci Listesi" sekmesine girip "Excel/CSV Yükle" butonuna tıklayın. e-Okul\'dan aldığınız sınıf listelerini Excel olarak doğrudan yükleyebilirsiniz. Başlıkta Numara, Ad, Soyad, Sınıf olması yeterlidir.',
    },
    {
      q: 'Gözetmen öğretmenler kendi branş sınavlarına atanır mı?',
      a: 'Hayır. Gözetmen dağıtım motoru öğretmenin branşı ile salonun sınav dersi arasında otomatik çapraz kontrol yapar. Matematik öğretmeni kendi sınavında gözetmen yapılmaz.',
    },
    {
      q: 'Yazıcı çıktılarında her salonun ayrı sayfaya çıkması nasıl sağlanır?',
      a: 'Yazdırma modülü standart A4 sayfa sonu (page-break-after: always) ile kodlanmıştır. Tek tıkla 50 salonluk bir sınavın tüm çıktılarını sayfalar karışmadan alabilirsiniz.',
    },
  ];

  const shortcuts = [
    { key: '1 - 7', desc: 'İlgili çalışma sekmesine (1: Sınav Tanımlama ... 7: Analiz) anında geçiş' },
    { key: '?', desc: 'Bu Yardımcı İpuçları ve Rehber panelini açar / kapatır' },
    { key: 'Esc', desc: 'Açık olan pencereyi, modalı veya yazdırma önizlemesini kapatır' },
    { key: 'Ctrl + P', desc: 'O anki salon veya sınıf raporunu doğrudan yazdırma penceresine gönderir' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Yardımcı İpuçları & Kullanım Rehberi
                </h2>
                <span className="text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Kelebek Asistanı
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Okul Ortak Sınav Kelebek Dağıtım Sistemi adım adım uygulama kılavuzu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveCategory('STEPS')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition cursor-pointer ${
              activeCategory === 'STEPS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>7 Adımda Sınav Hazırlığı</span>
          </button>

          <button
            onClick={() => setActiveCategory('TIPS')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition cursor-pointer ${
              activeCategory === 'TIPS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Kelebek Püf Noktaları</span>
          </button>

          <button
            onClick={() => setActiveCategory('FAQ')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition cursor-pointer ${
              activeCategory === 'FAQ'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <span>Sıkça Sorulanlar (SSS)</span>
          </button>

          <button
            onClick={() => setActiveCategory('SHORTCUTS')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition cursor-pointer ${
              activeCategory === 'SHORTCUTS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-4 h-4 text-purple-500" />
            <span>Kısayollar</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-700">
          {/* CATEGORY 1: STEPS */}
          {activeCategory === 'STEPS' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Kelebek sınav süreci <strong>1'den 7'ye kadar</strong> sırayla ilerler. İstediğiniz adıma tıklayarak doğrudan o sekmeye geçebilirsiniz.
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {steps.map(step => {
                  const Icon = step.icon;
                  const isCurrent = activeTab === step.id;
                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${step.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                {step.badge}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-600 text-white rounded-md">
                                  Şu Anki Sekme
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectTab(step.id);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition cursor-pointer self-start sm:self-auto"
                        >
                          <span>Bu Sekmeye Git</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 mb-2.5">{step.desc}</p>

                      <ul className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                        {step.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATEGORY 2: GOLDEN TIPS */}
          {activeCategory === 'TIPS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goldenRules.map((rule, idx) => {
                const Icon = rule.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-shadow shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${rule.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{rule.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rule.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CATEGORY 3: FAQ */}
          {activeCategory === 'FAQ' && (
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      S
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{faq.q}</h4>
                  </div>
                  <div className="flex items-start gap-2 pl-7 text-xs text-slate-600">
                    <p className="leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-full">
                      {faq.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CATEGORY 4: SHORTCUTS */}
          {activeCategory === 'SHORTCUTS' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs text-purple-900 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  Hızlı işlem yapmak için klavyenizdeki rakam ve harf kısayollarını kullanabilirsiniz.
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
                {shortcuts.map((sc, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{sc.desc}</span>
                    <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 shadow-2xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kelebek Dağıtım Algoritması Okul Sınav Standartlarına Uygundur</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-xs"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
