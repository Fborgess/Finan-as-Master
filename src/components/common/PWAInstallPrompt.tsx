import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share2, PlusSquare, X, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed app)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // Detect iOS
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect In-App Browsers (WhatsApp, Instagram, Facebook, LinkedIn, Gmail, Messenger)
    const isInApp = /fban|fbav|instagram|line|wv|whatsapp|gsa|micromessenger|linkedin/i.test(userAgent);
    setIsInAppBrowser(isInApp);

    // Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Top Banner for PWA Install */}
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-3.5 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Smartphone className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center space-x-2">
              <span>Instalar Finança Master</span>
              <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                App Standalone
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instale o aplicativo na sua tela inicial para rodar em tela cheia sem barra de navegador.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstallClick}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{deferredPrompt ? 'Instalar App Nativo' : 'Como Instalar'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Instalação Completa do App</h3>
                  <p className="text-xs text-slate-400">Transforme em aplicativo sem barra de navegação</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-app Browser Warning */}
            {isInAppBrowser && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-100">Você está no navegador interno (WhatsApp/Instagram)</p>
                  <p className="mt-1 text-amber-200/80">
                    Para instalar o aplicativo de verdade (e não apenas criar um atalho), toque nos 3 pontinhos no canto superior e selecione <strong>"Abrir no Chrome"</strong> ou <strong>"Abrir no Safari"</strong>.
                  </p>
                </div>
              </div>
            )}

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-300">
                <p className="font-bold text-slate-100 text-sm">
                  iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2.5">
                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-white flex items-center">
                        Abra o link no navegador Safari
                        <ExternalLink className="w-3.5 h-3.5 ml-1 text-purple-400" />
                      </p>
                      <p className="text-slate-400 text-[11px]">Certifique-se de que não está no navegador do WhatsApp.</p>
                    </div>
                  </li>

                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-white flex items-center">
                        Toque no botão Compartilhar
                        <Share2 className="w-4 h-4 text-blue-400 ml-1.5" />
                      </p>
                      <p className="text-slate-400 text-[11px]">Fica na barra de navegação inferior do Safari.</p>
                    </div>
                  </li>

                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-white flex items-center">
                        Selecione "Adicionar à Tela de Início"
                        <PlusSquare className="w-4 h-4 text-emerald-400 ml-1.5" />
                      </p>
                      <p className="text-slate-400 text-[11px]">Role a lista para baixo até ver o ícone (+).</p>
                    </div>
                  </li>

                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <p className="font-bold text-white flex items-center">
                        Toque em "Adicionar" no canto superior
                        <CheckCircle className="w-4 h-4 text-purple-400 ml-1.5" />
                      </p>
                      <p className="text-slate-400 text-[11px]">O app aparecerá na tela inicial e abrirá em tela cheia como um aplicativo nativo!</p>
                    </div>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <p className="font-bold text-slate-100 text-sm">
                  Android (Google Chrome):
                </p>

                <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-3 text-[11px] text-purple-200 space-y-1">
                  <p className="font-bold text-white flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400 inline shrink-0" />
                    <span>Passo a passo testado e aprovado no Android:</span>
                  </p>
                  <p className="text-purple-300/90">
                    O Android/Chrome realiza a instalação nativa do WebAPK em 2 etapas de confirmação para garantir a criação do app completo sem barras do navegador.
                  </p>
                </div>

                <ol className="space-y-2.5">
                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-white">Abra no Google Chrome</p>
                      <p className="text-slate-400 text-[11px]">Certifique-se de estar usando o navegador Chrome no celular.</p>
                    </div>
                  </li>

                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-white">Toque em (⋮) &gt; "Instalar e criar atalho"</p>
                      <p className="text-slate-400 text-[11px]">Isso criará o primeiro ícone do Finança Master na sua tela inicial.</p>
                    </div>
                  </li>

                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-white">Clique no Atalho criado na Tela Inicial</p>
                      <p className="text-slate-400 text-[11px]">Ao abrir pelo atalho, o aplicativo ativará o modo PWA Standalone.</p>
                    </div>
                  </li>

                  <li className="flex items-start space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <p className="font-bold text-emerald-400">Confirme "Instalar aplicativo"</p>
                      <p className="text-slate-400 text-[11px]">Pronto! O Android compila o WebAPK nativo e o Finança Master passa a rodar em tela cheia sem nenhuma barra do navegador!</p>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

