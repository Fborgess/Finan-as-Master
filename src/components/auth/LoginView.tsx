import React, { useState, useEffect } from 'react';
import { User, AccessProfile } from '../../types';
import { StorageService } from '../../utils/storage';
import { safeLocalStorage, safeSessionStorage } from '../../utils/safeStorage';
import { authenticateWithBiometrics, isBiometricAvailable } from '../../utils/biometrics';
import { verifyUserPin, verifyUserPassword } from '../../utils/credentials';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  Fingerprint,
  ScanFace,
  UserCheck,
  AlertCircle,
  Smartphone,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface Props {
  users: User[];
  profiles: AccessProfile[];
  onLoginSuccess: (user: User) => void;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 60 * 1000;

const getLoginAttempts = (): number => {
  const raw = safeLocalStorage.getItem('fm_login_attempts');
  const value = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(value) ? value : 0;
};

const getLoginLockRemainingMs = (): number => {
  const raw = safeLocalStorage.getItem('fm_login_lock_until');
  const until = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(until) ? Math.max(0, until - Date.now()) : 0;
};

const recordFailedLoginAttempt = (): void => {
  const attempts = getLoginAttempts() + 1;
  safeLocalStorage.setItem('fm_login_attempts', String(attempts));
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    safeLocalStorage.setItem('fm_login_lock_until', String(Date.now() + LOGIN_LOCK_DURATION_MS));
  }
};

const clearLoginAttempts = (): void => {
  safeLocalStorage.removeItem('fm_login_attempts');
  safeLocalStorage.removeItem('fm_login_lock_until');
};

export const LoginView: React.FC<Props> = ({ users, profiles, onLoginSuccess }) => {
  const [loginMode, setLoginMode] = useState<'password' | 'pin_select'>('password');
  
  // Form fields for Password / Email login
  const [emailOrUser, setEmailOrUser] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Form fields for Quick PIN user selection
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [lockRemaining, setLockRemaining] = useState<number>(() => {
    const remaining = Math.ceil(getLoginLockRemainingMs() / 1000);
    return remaining > 0 ? remaining : 0;
  });

  // Check if the device actually supports native biometrics
  useEffect(() => {
    let mounted = true;
    isBiometricAvailable().then((supported) => {
      if (mounted) setIsBiometricSupported(supported);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Live countdown while the login is temporarily locked
  useEffect(() => {
    if (lockRemaining <= 0) return;

    const id = setInterval(() => {
      const remaining = Math.ceil(getLoginLockRemainingMs() / 1000);
      if (remaining <= 0) {
        setLockRemaining(0);
        setErrorMessage(null);
        clearLoginAttempts();
      } else {
        setLockRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [lockRemaining]);

  // Keyboard navigation for Quick PIN Pad mode
  useEffect(() => {
    if (loginMode !== 'pin_select') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing if user is in an input field
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handlePinDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPinInput((prev) => prev.slice(0, -1));
        setErrorMessage(null);
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        setPinInput('');
        setErrorMessage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, pinInput, selectedUserId, users]);

  // Handler for Email/User + Password/PIN login
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(async () => {
      if (getLoginLockRemainingMs() > 0) {
        setErrorMessage('Muitas tentativas de login. Aguarde para tentar novamente.');
        setIsLoading(false);
        return;
      }

      const trimmedEmailOrUser = emailOrUser.trim().toLowerCase();
      const trimmedSecret = passwordOrPin.trim();

      if (!trimmedEmailOrUser || !trimmedSecret) {
        setErrorMessage('Por favor, preencha o e-mail/usuário e a senha/PIN.');
        setIsLoading(false);
        return;
      }

      // Search matching user by exact email or exact name (no partial match)
      const matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === trimmedEmailOrUser ||
          u.name.toLowerCase() === trimmedEmailOrUser
      );

      if (!matchedUser) {
        recordFailedLoginAttempt();
        setErrorMessage('Usuário ou e-mail não encontrado no sistema.');
        setIsLoading(false);
        return;
      }

      if (matchedUser.status === 'inactive') {
        setErrorMessage('Sua conta de usuário está inativa. Solicite ao administrador.');
        setIsLoading(false);
        return;
      }

      // Check PIN or password (hashed or legacy plaintext)
      const [isPinValid, isPasswordValid] = await Promise.all([
        verifyUserPin(matchedUser, trimmedSecret),
        verifyUserPassword(matchedUser, trimmedSecret),
      ]);

      if (!isPinValid && !isPasswordValid) {
        recordFailedLoginAttempt();
        const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - getLoginAttempts());
        if (remainingAttempts > 0) {
          setErrorMessage(`Senha ou PIN de acesso incorreto. ${remainingAttempts} tentativa(s) restante(s).`);
        } else {
          setErrorMessage(`Muitas tentativas. Aguarde ${Math.ceil(getLoginLockRemainingMs() / 1000)} segundos.`);
          setLockRemaining(Math.ceil(getLoginLockRemainingMs() / 1000));
        }
        setIsLoading(false);
        return;
      }

      // Authentication successful
      clearLoginAttempts();

      if (rememberMe) {
        safeLocalStorage.setItem('fm_authenticated_user', matchedUser.id);
      } else {
        safeSessionStorage.setItem('fm_authenticated_user', matchedUser.id);
        safeLocalStorage.removeItem('fm_authenticated_user');
      }

      setIsLoading(false);
      onLoginSuccess(matchedUser);
    }, 400);
  };

  // Handler for Quick PIN Pad login
  const handlePinPadLogin = async (usr: User, enteredPin: string) => {
    setErrorMessage(null);
    if (getLoginLockRemainingMs() > 0) {
      setErrorMessage('Muitas tentativas de login. Aguarde para tentar novamente.');
      setPinInput('');
      return;
    }

    if (usr.status === 'inactive') {
      setErrorMessage('Este usuário está inativo.');
      setPinInput('');
      return;
    }

    const pinValid = await verifyUserPin(usr, enteredPin);

    if (pinValid) {
      clearLoginAttempts();
      if (rememberMe) {
        safeLocalStorage.setItem('fm_authenticated_user', usr.id);
      } else {
        safeSessionStorage.setItem('fm_authenticated_user', usr.id);
        safeLocalStorage.removeItem('fm_authenticated_user');
      }
      onLoginSuccess(usr);
    } else {
      recordFailedLoginAttempt();
      const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - getLoginAttempts());
      if (remainingAttempts > 0) {
        setErrorMessage(`PIN incorreto para ${usr.name}. ${remainingAttempts} tentativa(s) restante(s).`);
      } else {
        setErrorMessage(`Muitas tentativas. Aguarde ${Math.ceil(getLoginLockRemainingMs() / 1000)} segundos.`);
        setLockRemaining(Math.ceil(getLoginLockRemainingMs() / 1000));
      }
      setPinInput('');
    }
  };

  // Quick PIN pad number click
  const handlePinDigitClick = (digit: string) => {
    if (lockRemaining > 0) return;
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);

      if (newPin.length === 4) {
        const targetUser = users.find((u) => u.id === selectedUserId) || users[0];
        handlePinPadLogin(targetUser, newPin);
      }
    }
  };

  // Quick User Selection Helper (no auto-login: the user still types the PIN)
  const handleDemoQuickLogin = (usr: User) => {
    setEmailOrUser(usr.email);
    setSelectedUserId(usr.id);
    setPinInput('');
    setErrorMessage(null);
    setLoginMode('pin_select');
  };

  const activeSelectedUser = users.find((u) => u.id === selectedUserId) || users[0];
  const selectedProfile = profiles.find((p) => p.id === activeSelectedUser?.profileId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-purple-500/20 mb-2 ring-1 ring-white/20">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Finança<span className="text-blue-400">Master</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Acesse sua plataforma de gestão financeira com segurança
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Tabs: Usuário/Senha vs PIN Rápido */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${
                loginMode === 'password'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>E-mail e Senha</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('pin_select');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center space-x-1.5 ${
                loginMode === 'pin_select'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN / Biometria</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-xs text-red-300 flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* Temporary Lock Banner */}
          {lockRemaining > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-300 flex items-center justify-center space-x-2.5 animate-in fade-in duration-150">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-extrabold">
                Login temporariamente bloqueado. Tente novamente em {lockRemaining}s.
              </span>
            </div>
          )}

          {/* Mode 1: Email/Username + Password/PIN Form */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="fsborgess@gmail.com"
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Senha ou PIN (4 dígitos)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite sua senha ou PIN (ex: 1234)"
                    value={passwordOrPin}
                    onChange={(e) => setPasswordOrPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Lembrar meu acesso</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || lockRemaining > 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.98]"
              >
                {isLoading ? (
                  <span>Validando Credenciais...</span>
                ) : lockRemaining > 0 ? (
                  <span>Aguarde {lockRemaining}s...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mode 2: Quick User Selection + PIN Pad + Biometric Trigger */}
          {loginMode === 'pin_select' && (
            <div className="space-y-4">
              {/* Biometric Quick Login Button if enabled AND supported by the device */}
              {StorageService.getBiometricSettings().enabled && isBiometricSupported && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    setErrorMessage(null);

                    const bioResult = await authenticateWithBiometrics();

                    if (bioResult.error === 'canceled') {
                      setIsLoading(false);
                      setErrorMessage('Autenticação biométrica cancelada.');
                      return;
                    }

                    setTimeout(() => {
                      setIsLoading(false);
                      const userToLogin = users.find((u) => u.id === selectedUserId) || users[0];
                      if (userToLogin) {
                        if (rememberMe) {
                          safeLocalStorage.setItem('fm_authenticated_user', userToLogin.id);
                        } else {
                          safeSessionStorage.setItem('fm_authenticated_user', userToLogin.id);
                          safeLocalStorage.removeItem('fm_authenticated_user');
                        }
                        onLoginSuccess(userToLogin);
                      }
                    }, 400);
                  }}
                  disabled={isLoading || lockRemaining > 0}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/40 transition flex items-center justify-center space-x-2.5 active:scale-95 disabled:opacity-50"
                >
                  {StorageService.getBiometricSettings().biometricType === 'faceid' ? (
                    <ScanFace className="w-5 h-5 text-emerald-200" />
                  ) : (
                    <Fingerprint className="w-5 h-5 text-emerald-200" />
                  )}
                  <span>Entrar com Impressão Digital / Face ID</span>
                </button>
              )}

              {StorageService.getBiometricSettings().enabled && !isBiometricSupported && (
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-[11px] text-slate-400 font-semibold text-center">
                  Biometria não disponível neste navegador/dispositivo. Use o PIN abaixo.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Selecione seu Perfil de Usuário:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {users.map((usr) => {
                    const prof = profiles.find((p) => p.id === usr.profileId);
                    const isSelected = usr.id === selectedUserId;

                    return (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(usr.id);
                          setPinInput('');
                          setErrorMessage(null);
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-extrabold text-purple-300 text-sm">
                            {usr.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-white">{usr.name}</div>
                            <div className="text-[10px] text-slate-400">{prof?.name || 'Usuário'} &bull; {usr.email}</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Pad Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                  <span>
                    PIN de <strong className="text-purple-300">{activeSelectedUser?.name}</strong>:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg transition"
                    title={showPin ? 'Ocultar dígitos do PIN' : 'Visualizar números digitados'}
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5 text-purple-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{showPin ? 'Ocultar' : 'Ver PIN'}</span>
                  </button>
                </div>

                {/* PIN Digit Boxes / Dots */}
                <div className="flex justify-center items-center space-x-3 py-1.5">
                  {[0, 1, 2, 3].map((idx) => {
                    const char = pinInput[idx];
                    const isFilled = char !== undefined;
                    return (
                      <div
                        key={idx}
                        className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center font-mono text-xl font-extrabold transition-all ${
                          errorMessage && pinInput.length === 4
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                            : isFilled
                            ? 'border-purple-500 bg-purple-600/30 text-purple-100 shadow-lg shadow-purple-500/20 scale-105'
                            : 'border-slate-800 bg-slate-900/90 text-slate-600'
                        }`}
                      >
                        {isFilled ? (showPin ? char : '•') : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Numeric Keyboard */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinDigitClick(digit)}
                      className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-purple-600 border border-slate-800 text-white font-extrabold text-base transition active:scale-95 flex items-center justify-center"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPinInput('');
                      setErrorMessage(null);
                    }}
                    title="Limpar todos os dígitos"
                    className="h-11 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinDigitClick('0')}
                    className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-purple-600 border border-slate-800 text-white font-extrabold text-base transition active:scale-95 flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinInput(pinInput.slice(0, -1));
                      setErrorMessage(null);
                    }}
                    title="Voltar / Apagar último dígito"
                    className="h-11 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center space-x-1"
                  >
                    <span>⌫</span>
                    <span className="text-[10px]">Voltar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick User Selection Helper */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Usuários Cadastrados no Sistema:</span>
              <span className="text-purple-400">Selecionar</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleDemoQuickLogin(u)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 text-left text-xs transition group"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-purple-300">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-200">{u.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">Toque para selecionar e digitar o PIN</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Finança Master &bull; Ambiente Seguro e Criptografado</span>
        </div>
      </div>
    </div>
  );
};
