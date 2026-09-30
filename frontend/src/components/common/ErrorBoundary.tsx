import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { removeAuthToken, clearApiCache } from '../../services/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('LECASU ERP - Erro de renderização capturado:', error, errorInfo);
  }

  private handleReset = () => {
    clearApiCache();
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleFullReset = () => {
    removeAuthToken();
    clearApiCache();
    localStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#101010] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-[#FF8000]/10 border border-[#FF8000]/30 rounded-full flex items-center justify-center mx-auto text-[#FF8000]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-heading text-white">Recuperação do Sistema</h2>
              <p className="text-sm text-neutral-400">
                Ocorreu uma oscilação na renderização dos dados. O sistema capturou o evento para impedir ecrã em branco.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-left text-xs text-red-300 font-mono overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-[#FF8000] hover:bg-[#e67300] text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar Dados e Recarregar
              </button>

              <button
                onClick={this.handleFullReset}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-medium rounded-xl transition border border-neutral-700 cursor-pointer"
              >
                Voltar à Pág. de Início de Sessão
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
