import React, { ReactNode, Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill de segurança para 'process' no navegador
// Algumas bibliotecas (como SDKs do Google ou React antigo) podem tentar acessar process.env
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  (window as any).process = { env: {} };
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary Simples para capturar erros fatais (Tela Branca)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  // Explicitly declare props to avoid type errors in strict environments
  public readonly props: Readonly<ErrorBoundaryProps> = this.props;

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRITICAL APP ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 font-sans">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Algo deu errado na aplicação.</h1>
            <p className="text-slate-600 mb-4">
              Não foi possível carregar o painel. Abaixo estão os detalhes técnicos do erro:
            </p>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg overflow-auto text-sm font-mono mb-6 max-h-60">
              {this.state.error?.toString() || "Erro desconhecido"}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);