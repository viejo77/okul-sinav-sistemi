import React, { useState } from 'react';
import { Lightbulb, X, ArrowRight, HelpCircle, Sparkles, BookOpen } from 'lucide-react';

interface FloatingHelpWidgetProps {
  activeTab: number;
  onOpenFullGuide: () => void;
}

const TAB_QUICK_TIPS: Record<number, { title: string; tip: string; actionText?: string }> = {
  0: {
    title: 'Dashboard (Genel Bakış) İpucu',
    tip: 'Tüm sekmelerdeki kritik metrikleri, salon doluluklarını ve sınav hazırlık durumunu tek ekranda izleyin. Kartlara tıklayarak ilgili bölüme doğrudan geçebilirsiniz.',
  },
  1: {
    title: '1. Sınav Tanımlama İpucu',
    tip: 'Kelebek algoritmasının çakışmasız ve verimli çalışması için sınava en az iki farklı sınıf seviyesi (Örn: 9. ve 11. sınıflar) dahil edin.',
  },
  2: {
    title: '2. Öğrenci Listesi İpucu',
    tip: 'e-Okul veya Excel listenizi doğrudan yükleyin. BEP kapsamındaki öğrencileri listeden işaretleyin; sistem onları ön sıralara öncelikle yerleştirir.',
  },
  3: {
    title: '3. Salon Yönetimi İpucu',
    tip: 'Toplam salon koltuk kapasitesinin, sınava girecek öğrenci sayısından %5-10 fazla olması algoritmanın mükemmel dağıtım yapmasını sağlar.',
  },
  4: {
    title: '4. Gözetmen Programı İpucu',
    tip: '"Otomatik Dağıt" butonu öğretmenlerin kendi branş sınavlarına atanmasını otomatik engeller ve görevleri adil dağıtır.',
  },
  5: {
    title: '5. Oturma Düzeni İpucu',
    tip: '"Kelebek Dağıtımını Başlat" butonuna tıklayın. Algoritma yan yana ve arka arkaya aynı şubenin gelmesini otomatik önler. Salon krokilerini kartlara tıklayarak inceleyin.',
  },
  6: {
    title: '6. Sınıf Dağılımları İpucu',
    tip: 'Her şubenin kendi kapısına asılacak resmi listeleri buradan alabilirsiniz. "Tüm Şubeleri Yazdır" ile her sınıf ayrı A4 sayfasına basılır.',
  },
  7: {
    title: '7. Sınav Analizi İpucu',
    tip: 'Salon doluluk oranlarını ve salon sınav tutanaklarını tek ekranda inceleyin. Yeşil salonlar yüksek verimli, mavi dengeli, kırmızı düşük dolulukludur.',
  },
  8: {
    title: '8. Yazdır & PDF Al İpucu',
    tip: 'Sınav salon oturma planları, gözetmen listeleri, BEP raporları ve kapı ası evraklarını tek tıkla resmi A4 formatında yazdırabilir veya PDF olarak indirebilirsiniz.',
  },
  9: {
    title: '9. Sorumluluk Sınavları İpucu',
    tip: 'Sorumluluk sınavı dersi, komisyon üyeleri öğretmenler, salon ve öğrencileri yapılandırın. Okul Müdürü komisyon başkanı olarak MEB formatlı Yoklama, Not ve Teslim tutanaklarını anında yazdırın.',
  },
};

export const FloatingHelpWidget: React.FC<FloatingHelpWidgetProps> = ({
  activeTab,
  onOpenFullGuide,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentTip = TAB_QUICK_TIPS[activeTab] || {
    title: 'Kelebek Sınav Sistemi',
    tip: 'Ortak sınav dağıtım kurallarına uygun olarak salon ve gözetmen dağıtımı yapabilirsiniz.',
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 no-print flex flex-col items-end">
      {/* Expanded Quick-Tip Tooltip Popover */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4 animate-in slide-in-from-bottom-2 duration-200 text-slate-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{currentTip.title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            {currentTip.tip}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[10px] font-mono text-slate-400">Kısayol: ?</span>
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenFullGuide();
              }}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kullanım Rehberini Aç</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Trigger Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs shadow-lg transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'bg-slate-900 text-white shadow-slate-900/30'
              : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105'
          }`}
          title="Yardımcı İpuçları & Rehber (Kısayol: ?)"
        >
          <Lightbulb className="w-4 h-4 text-amber-300 animate-pulse" />
          <span className="font-extrabold tracking-tight">Yardımcı İpuçları</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-white/20 rounded text-[10px] font-mono font-bold">
            ?
          </kbd>
        </button>
      </div>
    </div>
  );
};
