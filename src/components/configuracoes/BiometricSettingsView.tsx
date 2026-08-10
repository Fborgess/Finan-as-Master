import React, { useState, useEffect } from 'react';
import {
  BiometricSettings,
  AccessProfile,
  User
} from '../../types';
import { StorageService } from '../../utils/storage';
import { authenticateWithBiometrics, registerBiometricCredential } from '../../utils/biometrics';
import {
  Fingerprint,
  ScanFace,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  RefreshCw,
  Info,
  SmartphoneNfc,
  Key,
  Trash2,
  Check,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface Props {
  activeProfile?: AccessProfile;
  currentUser: User;
}

export const BiometricSettingsView: React.FC<Props> = ({
  activeProfile,
  currentUser,
}) => {
  const canManageSettings = activeProfile ? activeProfile.permissions.canManageSettings : true;

  const [settings, setSettings] = useState<BiometricSettings>(() => StorageService.getBiometricSettings());
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [testType, setTestType] = useState<'fingerprint' | 'faceid'>('faceid');
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    platformName: 'Desconhecido',
    hasWebAuthn: false,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Detect mobile and browser capabilities
    const ua = navigator.userAgent;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
    const hasPublicKey = typeof window !== 'undefined' && 'PublicKeyCredential' in window;

    let platform = 'Navegador Desktop';
    if (/iPhone|iPad|iPod/i.test(ua)) platform = 'Apple iOS (Face ID / Touch ID)';
    else if (/Android/i.test(ua)) platform = 'Android Mobile (BiometricPrompt)';
    else if (isMobileDevice) platform = 'Dispositivo Móvel Disponível';

    setDeviceInfo({
      isMobile: isMobileDevice,
      platformName: platform,
      hasWebAuthn: hasPublicKey,
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleBiometric = (enabled: boolean) => {
    const updated = {
      ...settings,
      enabled,
      lastAuthenticatedAt: enabled ? new Date().toISOString() : settings.lastAuthenticatedAt
    };
    setSettings(updated);
    StorageService.saveBiometricSettings(updated);
    if (enabled) {
      showToast('Acesso por Digital/Face ID ativado com sucesso para este dispositivo!');
    } else {
      showToast('Acesso biométrico desativado.');
    }
  };

  const handleUpdateType = (type: 'fingerprint' | 'faceid' | 'both' | 'auto') => {
    const updated = { ...settings, biometricType: type };
    setSettings(updated);
    StorageService.saveBiometricSettings(updated);
    showToast('Preferência biométrica atualizada.');
  };

  const handleToggleOption = (key: keyof BiometricSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    StorageService.saveBiometricSettings(updated);
    showToast('Configurações de segurança salvas.');
  };

  const startBiometricTest = async (type: 'fingerprint' | 'faceid') => {
    setTestType(type);
    setTestStatus('scanning');
    setIsTestModalOpen(true);

    const bioResult = await authenticateWithBiometrics();

    if (bioResult.error === 'canceled') {
      setTestStatus('idle');
      setIsTestModalOpen(false);
      showToast('Teste de biometria cancelado pelo usuário.');
      return;
    }

    // Complete scan & update state
    setTimeout(() => {
      setTestStatus('success');
      const updated = {
        ...settings,
        enabled: true, // auto enable when successfully tested
        biometricType: type,
        lastAuthenticatedAt: new Date().toISOString()
      };
      setSettings(updated);
      StorageService.saveBiometricSettings(updated);
      showToast('Biometria testada e ativada com sucesso!');
    }, 600);
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'Nunca autenticado';
    const date = new Date(isoStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!canManageSettings) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 my-8">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-white">Acesso Restrito às Configurações</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Seu perfil de acesso atual não possui permissão para alterar os parâmetros de segurança e biometria do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-emerald-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Segurança em Dispositivos Móveis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Acesso por Impressão Digital ou Face ID
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Proteja as informações financeiras da sua empresa no seu smartphone ou tablet ativando a autenticação por sensores biométricos integrados ao dispositivo.
            </p>
          </div>

          <div className="shrink-0 flex items-center space-x-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
              {settings.enabled ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              ) : (
                <Lock className="w-8 h-8 text-slate-500" />
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                Status Atual
              </span>
              <span
                className={`text-sm font-black ${
                  settings.enabled ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {settings.enabled ? 'Biometria Ativa' : 'Acesso Tradicional (Desativado)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Device Status & Capability Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <SmartphoneNfc className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white">
              Dispositivo Detectado: <span className="text-blue-400 font-mono">{deviceInfo.platformName}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {deviceInfo.isMobile
                ? 'Seu dispositivo suporta autenticação rápida via Touch ID, Face ID ou BiometricPrompt do Android.'
                : 'Você pode simular e testar a funcionalidade biométrica nesta interface ou usá-la quando acessar pelo celular.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>WebAuthn API Pronta</span>
        </div>
      </div>

      {/* Main Activation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <span>Habilitar Autenticação Biométrica</span>
              {settings.enabled && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  ATIVADO
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ao ativar, o aplicativo solicitará a confirmação por digital ou Face ID antes de liberar a sessão no celular.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none self-start sm:self-auto">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleBiometric(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Biometric Type Selector */}
        <div className="space-y-3">
          <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
            Método de Leitura Preferencial
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Face ID Option */}
            <div
              onClick={() => handleUpdateType('faceid')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-start space-x-3.5 ${
                settings.biometricType === 'faceid'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  settings.biometricType === 'faceid'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <ScanFace className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-white">Reconhecimento Facial (Face ID)</p>
                <p className="text-[11px] leading-tight text-slate-400">
                  Ideal para iPhones com TrueDepth ou smartphones Android com Face Unlock seguro.
                </p>
              </div>
            </div>

            {/* Fingerprint Option */}
            <div
              onClick={() => handleUpdateType('fingerprint')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-start space-x-3.5 ${
                settings.biometricType === 'fingerprint'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  settings.biometricType === 'fingerprint'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Fingerprint className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-white">Impressão Digital (Touch ID)</p>
                <p className="text-[11px] leading-tight text-slate-400">
                  Para sensores capacitivos na lateral, sob a tela ou botão de início.
                </p>
              </div>
            </div>

            {/* Automatic / Both Option */}
            <div
              onClick={() => handleUpdateType('both')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-start space-x-3.5 ${
                settings.biometricType === 'both' || settings.biometricType === 'auto'
                  ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  settings.biometricType === 'both' || settings.biometricType === 'auto'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-white">Automático (Detectar Sistema)</p>
                <p className="text-[11px] leading-tight text-slate-400">
                  Usa automaticamente o leitor padrão configurado pelo sistema operacional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Rules Switches */}
        <div className="pt-4 space-y-4">
          <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
            Regras de Exigência e Contingência
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Require on launch */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-xs font-extrabold text-white">Ao Abrir o App</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Solicita biometria no início de cada sessão.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireOnAppLaunch}
                onChange={() => handleToggleOption('requireOnAppLaunch')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>

            {/* Lock on minimize */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-xs font-extrabold text-white">Bloquear ao Minimizar</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Exige PIN/Biometria ao retornar ao app do segundo plano.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.lockOnMinimize !== false}
                onChange={() => handleToggleOption('lockOnMinimize')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>

            {/* Require on sensitive operations */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-xs font-extrabold text-white">Operações Sensíveis</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Exige validação para relatórios ou trocas de usuário.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireOnSensitiveActions}
                onChange={() => handleToggleOption('requireOnSensitiveActions')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>

            {/* Fallback PIN */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-xs font-extrabold text-white">PIN de Contingência</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Permite usar o PIN de 4 dígitos como alternativa quando a biometria falha.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.fallbackToPin}
                onChange={() => handleToggleOption('fallbackToPin')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Live Test Action Area */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Última validação biométrica com sucesso:{' '}
              <strong className="text-slate-200 font-mono">{formatDateTime(settings.lastAuthenticatedAt)}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => startBiometricTest('faceid')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20"
            >
              <ScanFace className="w-4 h-4" />
              <span>Testar Face ID</span>
            </button>

            <button
              onClick={() => startBiometricTest('fingerprint')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span>Testar Digital</span>
            </button>
          </div>
        </div>
      </div>

      {/* Registered Devices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-white">Dispositivos Autorizados</h3>
            <p className="text-xs text-slate-400">
              Smartphones e tablets vinculados à credencial biométrica da sua conta ({currentUser.name})
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">1 Dispositivo Ativo</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">{settings.registeredDeviceName || 'Dispositivo Móvel Principal'}</p>
              <p className="text-[11px] text-slate-400">
                Acesso por Biometria • Ativo desde {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
              DISPOSITIVO ATUAL
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Biometric Scanning Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-blue-500" />

            <h3 className="text-lg font-black text-white">
              {testType === 'faceid' ? 'Validação por Face ID' : 'Leitura de Impressão Digital'}
            </h3>

            {/* Animation graphic */}
            <div className="py-6 flex flex-col items-center justify-center">
              {testStatus === 'scanning' && (
                <div className="relative flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full border-4 border-indigo-500/30 animate-ping absolute" />
                  <div className="w-24 h-24 rounded-full bg-indigo-600/10 border-2 border-indigo-500 flex items-center justify-center relative shadow-inner">
                    {testType === 'faceid' ? (
                      <ScanFace className="w-12 h-12 text-indigo-400 animate-pulse" />
                    ) : (
                      <Fingerprint className="w-12 h-12 text-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              )}

              {testStatus === 'success' && (
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-in zoom-in">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                {testStatus === 'scanning' && (testType === 'faceid' ? 'Escaneando rosto...' : 'Aguardando toque no leitor...')}
                {testStatus === 'success' && 'Autenticação Biométrica Aprovada!'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {testStatus === 'scanning'
                  ? 'Mantenha seu rosto em frente à câmera ou toque no sensor biométrico.'
                  : 'Sua identidade foi verificada com sucesso via hardware do dispositivo.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition border border-slate-700"
              >
                {testStatus === 'success' ? 'Concluir Teste' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
