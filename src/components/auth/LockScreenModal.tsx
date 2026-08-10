import React, { useState, useEffect } from 'react';
import { User, AccessProfile, BiometricSettings } from '../../types';
import { authenticateWithBiometrics } from '../../utils/biometrics';
import {
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Fingerprint,
  ScanFace,
  Delete,
  LogOut,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface Props {
  user: User;
  profile?: AccessProfile;
  biometricSettings: BiometricSettings;
  onUnlockSuccess: () => void;
  onLogout: () => void;
}

export const LockScreenModal: React.FC<Props> = ({
  user,
  profile,
  biometricSettings,
  onUnlockSuccess,
  onLogout,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Auto-trigger biometric prompt on mount if biometric is enabled
  useEffect(() => {
    if (biometricSettings.enabled) {
      handleBiometricUnlock();
    }
  }, []);

  // Keyboard support for lock screen PIN input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        setPinInput('');
        setErrorMessage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput, user]);

  const handleDigitClick = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setErrorMessage(null);

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
      setErrorMessage(null);
    }
  };

  const verifyPin = (pinToTest: string) => {
    if (pinToTest === user.pin || (user.password && pinToTest === user.password)) {
      setScanSuccess(true);
      setTimeout(() => {
        onUnlockSuccess();
      }, 400);
    } else {
      setErrorMessage('PIN incorreto. Tente novamente.');
      setPinInput('');
    }
  };

  const handleBiometricUnlock = async () => {
    setIsScanning(true);
    setErrorMessage(null);

    const result = await authenticateWithBiometrics();

    if (result.success) {
      setIsScanning(false);
      setScanSuccess(true);
      setTimeout(() => {
        onUnlockSuccess();
      }, 400);
      return;
    }

    setIsScanning(false);
    if (result.error === 'canceled') {
      setErrorMessage('Autenticação biométrica cancelada.');
    } else if (result.error === 'unsupported') {
      setErrorMessage('Biometria não disponível neste navegador/dispositivo. Use seu PIN.');
    } else {
      setErrorMessage('Não foi possível autenticar por biometria. Use seu PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 text-center">
        {/* Header Icon */}
        <div className="relative inline-block">
          <button
            type="button"
            onClick={handleBiometricUnlock}
            title="Toque para verificar biometria"
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-900/30 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            {scanSuccess ? (
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            ) : isScanning ? (
              <Sparkles className="w-10 h-10 animate-spin text-purple-200" />
            ) : biometricSettings.enabled && biometricSettings.biometricType === 'faceid' ? (
              <ScanFace className="w-10 h-10" />
            ) : (
              <Fingerprint className="w-10 h-10" />
            )}
          </button>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 border border-slate-700 text-purple-400 pointer-events-none">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Lock Info */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Aplicativo Bloqueado por Segurança</span>
          </div>
          <h2 className="text-xl font-black text-white pt-2">{user.name}</h2>
          <p className="text-xs text-slate-400 font-medium">
            {profile?.name || 'Acesso Protegido'} • {user.email}
          </p>
        </div>

        {/* Biometric Scan Overlay or Status */}
        {isScanning && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold animate-pulse flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Lendo sensor biométrico (Digital / Face ID)...</span>
          </div>
        )}

        {/* PIN Digit Boxes Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="font-extrabold uppercase tracking-wider text-slate-400">
              Digite seu PIN de 4 dígitos
            </span>
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition"
              title={showPin ? 'Ocultar PIN' : 'Visualizar números digitados'}
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5 text-purple-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showPin ? 'Ocultar' : 'Ver PIN'}</span>
            </button>
          </div>

          <div className="flex justify-center items-center space-x-3 py-1">
            {[0, 1, 2, 3].map((index) => {
              const char = pinInput[index];
              const isFilled = char !== undefined;
              return (
                <div
                  key={index}
                  className={`w-12 h-13 rounded-2xl border-2 flex items-center justify-center font-mono text-xl font-extrabold transition-all duration-200 ${
                    errorMessage && pinInput.length === 4
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                      : isFilled
                      ? 'bg-purple-600/30 border-purple-400 text-purple-100 scale-105 shadow-lg shadow-purple-500/20'
                      : 'border-slate-700 bg-slate-800/80 text-slate-600'
                  }`}
                >
                  {isFilled ? (showPin ? char : '•') : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Keypad 0-9 */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-purple-600 text-white text-lg font-black border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <div className="h-14 flex items-center justify-center">
            {biometricSettings.enabled && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                title="Desbloquear por Biometria"
                className="w-full h-full rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition flex items-center justify-center"
              >
                {biometricSettings.biometricType === 'faceid' ? (
                  <ScanFace className="w-6 h-6" />
                ) : (
                  <Fingerprint className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-purple-600 text-white text-lg font-black border border-slate-700/80 transition shadow-sm active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            title="Apagar digito"
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition flex items-center justify-center active:scale-95"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={onLogout}
            className="hover:text-rose-400 transition flex items-center space-x-1.5 font-bold"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sair / Trocar Usuário</span>
          </button>

          {biometricSettings.enabled && (
            <button
              type="button"
              onClick={handleBiometricUnlock}
              className="text-purple-400 hover:text-purple-300 font-extrabold flex items-center space-x-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Usar Biometria</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
