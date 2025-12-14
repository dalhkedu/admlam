import React, { useState } from 'react';
import { AuthService } from '../services/auth';
import { HeartHandshake, Loader2, Mail, Lock, AlertCircle, ArrowRight, Settings } from 'lucide-react';

export const Login: React.FC = () => {
  // isRegistering fixo em false para desabilitar novos cadastros
  const [isRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [detailedError, setDetailedError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDetailedError('');

    // Validação Client-Side para evitar chamadas desnecessárias e erros no console
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      // Como o registro está desabilitado na UI, chamamos apenas o login
      await AuthService.login(email, password);
    } catch (err: any) {
      console.error("Firebase Auth Error:", err); // Log para debug
      let msg = "Ocorreu um erro ao tentar acessar. Verifique seus dados.";
      
      // Mapeamento de códigos de erro do Firebase Auth
      const errorCode = err.code;

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-login-credentials') {
        msg = "E-mail ou senha incorretos.";
      } else if (errorCode === 'auth/email-already-in-use') {
        msg = "Este e-mail já está cadastrado.";
      } else if (errorCode === 'auth/weak-password') {
        msg = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (errorCode === 'auth/invalid-email') {
        msg = "O formato do e-mail é inválido.";
      } else if (errorCode === 'auth/configuration-not-found') {
        msg = "Configuração de Autenticação não encontrada.";
        setDetailedError("O provedor de E-mail/Senha não está ativado no Firebase Console ou a API Key é inválida.");
      } else if (errorCode === 'auth/operation-not-allowed') {
        msg = "Operação não permitida.";
        setDetailedError("O provedor de login por E-mail/Senha não está habilitado no Firebase Console.");
      } else if (errorCode === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
          msg = "Chave de API inválida.";
          setDetailedError("Verifique as configurações do Firebase no arquivo .env");
      } else if (errorCode === 'auth/network-request-failed') {
          msg = "Erro de conexão.";
          setDetailedError("Verifique sua conexão com a internet.");
      } else if (errorCode === 'auth/too-many-requests') {
          msg = "Muitas tentativas falhas.";
          setDetailedError("O acesso a esta conta foi temporariamente desativado devido a muitas tentativas de login malsucedidas. Tente novamente mais tarde.");
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-600 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                <HeartHandshake size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Lar Assistencial Matilde</h1>
            <p className="text-emerald-100 text-sm">Sistema de Gestão para ONGs</p>
        </div>

        {/* Form */}
        <div className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                Acesse o Painel
            </h2>

            {error && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2 font-medium">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                    {detailedError && (
                        <p className="mt-1 text-xs text-red-500 pl-6 border-l-2 border-red-200 ml-1">
                            {detailedError}
                        </p>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 ml-1">E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="email"
                            required
                            placeholder="seu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 ml-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="password"
                            required
                            placeholder="******"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            Entrar
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-400 italic">
                    Novos cadastros estão temporariamente suspensos.
                </p>
            </div>
            
            {/* Developer/Config Hint */}
            {(error.includes('Configuração') || error.includes('API')) && (
                 <div className="mt-6 bg-slate-100 p-3 rounded-lg text-xs text-slate-500 border border-slate-200">
                    <div className="flex items-center gap-2 font-bold text-slate-700 mb-1">
                        <Settings size={12} /> Configuração Necessária
                    </div>
                    <p>
                        Para corrigir este erro, certifique-se de que o <strong>Firebase Auth</strong> está ativado no console e que o provedor <strong>E-mail/Senha</strong> está habilitado.
                        <br/>
                        Verifique também se as chaves no arquivo <code className="bg-white px-1 rounded">.env</code> correspondem ao seu projeto.
                    </p>
                 </div>
            )}
        </div>
      </div>
      
      <div className="fixed bottom-4 text-center w-full text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} Lar Assistencial Matilde - Versão Multi-ONG
      </div>
    </div>
  );
};