import React, { useState } from 'react';
import {
  Calendar,
  Printer,
  Share2,
  Copy,
  Check,
  Download,
  X,
  FileSpreadsheet,
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApplyPreset: (preset: 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear' | 'all') => void;
  activePreset: string;
  onPrint: () => void;
  reportTextSummary: string;
  csvData?: string;
  csvFilename?: string;
}

export const ReportHeaderFilter: React.FC<Props> = ({
  title,
  subtitle,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyPreset,
  activePreset,
  onPrint,
  reportTextSummary,
  csvData,
  csvFilename = 'relatorio.csv',
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyText = () => {
    navigator.clipboard.writeText(reportTextSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSV = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', csvFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FinançaMaster - ${title}`,
          text: reportTextSummary,
        });
      } catch (err) {
        console.log('Share canceled or error:', err);
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="space-y-4 print:hidden">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">{title}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Buttons: Print & Share */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={onPrint}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition shadow-sm active:scale-95"
            title="Imprimir ou Salvar como PDF"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition active:scale-95"
            title="Compartilhar Relatório"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Presets & Custom Date Pickers */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 [&::-webkit-scrollbar]:h-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Periodo:
            </span>
            {[
              { id: 'thisMonth', label: 'Este Mês' },
              { id: 'lastMonth', label: 'Mês Anterior' },
              { id: 'last30', label: 'Últimos 30d' },
              { id: 'last90', label: 'Últimos 90d' },
              { id: 'thisYear', label: 'Este Ano' },
              { id: 'all', label: 'Todo o Histórico' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onApplyPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activePreset === p.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Explicit Start and End Date Inputs */}
          <div className="flex items-center space-x-2 self-start lg:self-auto shrink-0">
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none text-xs [color-scheme:dark]"
              />
            </div>
            <span className="text-slate-500 font-bold text-xs">até</span>
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none text-xs [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Compartilhar Relatório</h3>
                  <p className="text-[11px] text-slate-400">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Resumo Formatado em Texto */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Resumo em Texto (WhatsApp / E-mail)</span>
                  </label>
                  <button
                    onClick={handleCopyText}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={6}
                  value={reportTextSummary}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed focus:outline-none resize-none"
                />
              </div>

              {/* Opções de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                {csvData && (
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Baixar Planilha CSV</span>
                  </button>
                )}

                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar via Aplicativo</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end shrink-0">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
