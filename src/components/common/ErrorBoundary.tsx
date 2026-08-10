import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { safeLocalStorage, safeSessionStorage } from '../../utils/safeStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    safeLocalStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_app_locked');
    window.location.reload();
  };

  private handleResetAll = () => {
    if (window.confirm('Deseja limpar as preferências locais e recarregar o sistema? Seus dados principais não serão perdidos.')) {
      safeLocalStorage.removeItem('fm_app_locked');
      safeSessionStorage.removeItem('fm_app_locked');
      safeLocalStorage.removeItem('fm_biometric_settings');
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight">Ocorreu um imprevisto</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                O aplicativo encontrou um erro inesperado ao carregar. Clique no botão abaixo para restaurar e recarregar.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                <p className="text-[10px] font-mono text-rose-300 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicativo</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAll}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Resetar Estado Local & Recarregar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
