import { motion } from 'motion/react';
import {
  ArrowLeft,
  Image as ImageIcon,
  MessageCircle,
  ShieldCheck,
  User,
  Wallet,
  Zap,
} from 'lucide-react';
import { Settings } from '../../types';

interface SettingsViewProps {
  settings: Settings;
  setSettings: (newSettings: Settings) => void;
  activeSettingsTab: string | null;
  setActiveSettingsTab: (tab: string | null) => void;
  switchOperator: (op: 'operator1' | 'operator2') => void;
  currentUserUid?: string | null;
  onSyncAndReturn: () => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export function SettingsView({
  settings,
  setSettings,
  activeSettingsTab,
  setActiveSettingsTab,
  switchOperator,
  currentUserUid,
  onSyncAndReturn,
  openConfirm,
}: SettingsViewProps) {
  const categories = [
    {
      id: 'profile',
      label: 'Operador',
      icon: User,
      desc: 'Configure seus dados pessoais, foto de identificação e perfis de operação.',
      tag: 'Identidade',
    },
    {
      id: 'finance',
      label: 'Financeiro',
      icon: Wallet,
      desc: 'Cadastre favorecidos, tipos de chave e chaves PIX para recebimentos.',
      tag: 'Liquidez',
    },
    {
      id: 'templates',
      label: 'WhatsApp',
      icon: MessageCircle,
      desc: 'Personalize o template automático de mensagens de cobrança.',
      tag: 'Mensagens',
    },
    {
      id: 'system',
      label: 'Sistema',
      icon: ShieldCheck,
      desc: 'Controle cache local, integridade dos dados na nuvem e preferências.',
      tag: 'Segurança',
    },
  ];

  const renderOperatorSwitcher = () => (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#07090e]/70 border border-white/[0.08] flex flex-col gap-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-gold block">Operador Ativo no Sistema</span>
          <p className="text-xs text-zinc-400 mt-0.5">
            Alterne entre perfis. Cada operador mantém suas próprias chaves PIX e identificação.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-gold/10 border border-gold/25 text-gold text-xs font-semibold w-fit">
          {settings.currentOperator === 'operator2' ? 'Operador 2' : 'Operador 1'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0d111a] border border-white/[0.08]">
        <button
          type="button"
          onClick={() => switchOperator('operator1')}
          className={`h-10 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            (settings.currentOperator || 'operator1') === 'operator1'
              ? 'bg-gold text-[#07090e]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Operador 1 ({(settings.op1Name || 'Op 1').split(' ')[0]})
        </button>
        <button
          type="button"
          onClick={() => switchOperator('operator2')}
          className={`h-10 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            settings.currentOperator === 'operator2'
              ? 'bg-gold text-[#07090e]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Operador 2 ({(settings.op2Name || 'Op 2').split(' ')[0]})
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      {activeSettingsTab === null ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Ajustes da Conta</h1>
            <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
              Selecione uma categoria para configurar o sistema
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => setActiveSettingsTab(option.id)}
                className="glass-card hover:bg-[#131824] hover:border-gold/35 p-5 sm:p-6 text-left transition-colors group flex flex-col justify-between min-h-[195px] cursor-pointer"
              >
                <div className="flex justify-between items-start w-full">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 group-hover:text-gold group-hover:border-gold/30 group-hover:bg-gold/10 flex items-center justify-center transition-colors shrink-0">
                    <option.icon size={20} />
                  </div>
                  <span className="text-[11px] font-medium text-gold/85">{option.tag}</span>
                </div>

                <div className="mt-6 space-y-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">
                    {option.label}
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveSettingsTab(null)}
              className="group flex items-center gap-2.5 px-4 h-10 bg-[#0d111a] hover:bg-[#131824] border border-white/[0.08] hover:border-gold/30 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all w-fit cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Voltar aos Ajustes
            </button>

            <span className="px-3 py-1 rounded-lg bg-gold/10 border border-gold/25 text-gold text-xs font-semibold w-fit">
              Ajuste Ativo:{' '}
              {activeSettingsTab === 'profile'
                ? 'Operador'
                : activeSettingsTab === 'finance'
                  ? 'Financeiro'
                  : activeSettingsTab === 'templates'
                    ? 'WhatsApp'
                    : 'Sistema'}
            </span>
          </div>

          <div className="glass-card p-5 sm:p-8 relative overflow-hidden">
            {activeSettingsTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Dados de Operador</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Configure suas informações de identificação e assinatura</p>
                </div>

                {renderOperatorSwitcher()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-zinc-300">Nome Completo</label>
                    <input
                      value={settings.userName}
                      onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                      className="fintech-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">Cargo</label>
                    <input
                      value={settings.userRole || ''}
                      onChange={(e) => setSettings({ ...settings, userRole: e.target.value })}
                      className="fintech-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">Função</label>
                    <input
                      value={settings.userFunction || ''}
                      onChange={(e) => setSettings({ ...settings, userFunction: e.target.value })}
                      className="fintech-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">Empresa / Marca</label>
                    <input
                      value={settings.companyName || ''}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="fintech-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">E-mail de Contato</label>
                    <input
                      value={settings.userEmail || ''}
                      onChange={(e) => setSettings({ ...settings, userEmail: e.target.value })}
                      className="fintech-input"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2 pt-2">
                    <label className="text-xs font-medium text-zinc-300">Foto de Perfil</label>
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className="w-20 h-20 rounded-2xl bg-[#07090e] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0 relative group/avatar">
                        {settings.profilePhoto ? (
                          <img src={settings.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} className="text-zinc-600" />
                        )}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <ImageIcon size={18} className="text-white" />
                          <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSettings({ ...settings, profilePhoto: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-zinc-400">Escolha uma foto da galeria do seu dispositivo</p>
                        <button
                          type="button"
                          onClick={() => document.getElementById('profile-upload')?.click()}
                          className="h-9 px-4 bg-gold/10 border border-gold/25 text-gold rounded-xl text-xs font-semibold hover:bg-gold hover:text-[#07090e] transition-all w-fit cursor-pointer"
                        >
                          Escolher Foto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'finance' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Dados Financeiros & PIX</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configurações de recebimento instantâneo usadas em contratos e cobranças
                  </p>
                </div>

                {renderOperatorSwitcher()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">Nome do Favorecido</label>
                    <input
                      value={settings.pixName}
                      onChange={(e) => setSettings({ ...settings, pixName: e.target.value })}
                      className="fintech-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-300">Tipo de Chave</label>
                    <select
                      value={settings.pixType}
                      onChange={(e) => setSettings({ ...settings, pixType: e.target.value })}
                      className="fintech-select"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="E-mail">E-mail</option>
                      <option value="Telefone">Telefone</option>
                      <option value="Chave Aleatória">Chave Aleatória</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-zinc-300">Chave PIX Operacional</label>
                    <input
                      value={settings.pixKey}
                      onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
                      placeholder="Sua chave Pix para recebimento"
                      className="fintech-input"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'templates' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Template de Cobrança WhatsApp</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure o texto automático enviado aos clientes no vencimento de parcelas
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-300">Texto da Notificação</label>
                      <textarea
                        id="whatsappTemplateEditor"
                        value={settings.whatsappTemplate || ''}
                        onChange={(e) => setSettings({ ...settings, whatsappTemplate: e.target.value })}
                        className="h-56 bg-[#07090e] border border-white/[0.1] rounded-2xl p-4 font-medium text-zinc-200 outline-none focus:border-gold transition-colors text-sm resize-none custom-scrollbar"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-xs font-medium text-zinc-400 block">
                        Variáveis Dinâmicas (clique para inserir)
                      </span>
                      <div className="flex flex-wrap gap-2 bg-[#07090e]/70 border border-white/[0.08] rounded-xl p-3.5">
                        {[
                          { tag: '{cliente}', label: 'Cliente' },
                          { tag: '{produto}', label: 'Produto' },
                          { tag: '{parcela}', label: 'Parcela' },
                          { tag: '{valor}', label: 'Valor' },
                          { tag: '{vencimento}', label: 'Vencimento' },
                          { tag: '{chave_pix}', label: 'Chave PIX' },
                          { tag: '{nome_pix}', label: 'Favorecido' },
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => {
                              const textarea = document.getElementById(
                                'whatsappTemplateEditor'
                              ) as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = settings.whatsappTemplate || '';
                                const updated = text.substring(0, start) + v.tag + text.substring(end);
                                setSettings({ ...settings, whatsappTemplate: updated });
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(start + v.tag.length, start + v.tag.length);
                                }, 50);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-white/[0.04] hover:bg-gold/10 hover:text-gold border border-white/[0.08] hover:border-gold/30 rounded-lg text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                          >
                            {v.tag} <span className="text-[11px] text-zinc-500">({v.label})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="lg:col-span-5 flex flex-col gap-2">
                    <span className="text-xs font-medium text-zinc-400">Pré-visualização Dinâmica</span>
                    <div className="bg-[#0b141a] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col min-h-[340px] shadow-xl">
                      <div className="bg-[#1f2c34] h-13 px-4 flex items-center gap-3 border-b border-white/[0.06]">
                        <div className="w-8 h-8 rounded-full bg-gold/20 text-gold font-bold text-xs flex items-center justify-center">
                          NC
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white">Canal de Cobrança</span>
                          <span className="text-[10px] text-[#8696a0]">Online</span>
                        </div>
                      </div>

                      <div className="flex-1 p-4 flex flex-col justify-end bg-[#0b141a]">
                        <div className="max-w-[92%] self-end bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs shadow-md leading-relaxed whitespace-pre-wrap">
                          {(settings.whatsappTemplate || '')
                            .replace(/{cliente}/g, 'Fulano de Souza')
                            .replace(/{produto}/g, 'iPhone 15 Pro Max')
                            .replace(/{parcela}/g, '1/5')
                            .replace(/{valor}/g, 'R$ 1.250,00')
                            .replace(/{vencimento}/g, '15/10/2026')
                            .replace(/{chave_pix}/g, settings.pixKey || 'financeiro@nexus.com')
                            .replace(/{nome_pix}/g, settings.pixName || 'Nexus Commerce') ||
                            'Nenhum texto de template configurado.'}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                            <span>20:15</span>
                            <span className="text-[#53bdeb]">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSettingsTab === 'system' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Segurança e Dados</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Manutenção de cache local e integridade da conta</p>
                </div>

                <div className="space-y-4">
                  <div className="p-5 border border-white/[0.08] rounded-2xl bg-white/[0.02] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm font-semibold text-white block">Interface Nexus Fintech Dark</span>
                      <span className="text-xs text-zinc-400">Tema OLED otimizado com alto contraste e acessibilidade</span>
                    </div>
                    <div className="w-12 h-6 bg-gold rounded-full flex items-center px-1 shrink-0">
                      <div className="w-4 h-4 bg-[#07090e] rounded-full ml-auto" />
                    </div>
                  </div>

                  <div className="p-5 border border-red-500/20 rounded-2xl bg-red-500/[0.03] flex flex-col gap-4">
                    <div>
                      <span className="text-sm font-semibold text-red-400 block">Manutenção de Cache Local</span>
                      <span className="text-xs text-zinc-400">
                        Limpa os dados armazenados offline neste dispositivo. Seus registros na nuvem permanecem intactos.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        openConfirm(
                          'Limpar Cache Local',
                          'Deseja limpar o cache local desta conta neste navegador? Seus dados salvos na nuvem permanecem intactos.',
                          () => {
                            if (currentUserUid) {
                              Object.keys(localStorage).forEach((k) => {
                                if (k.startsWith(`nexus_cache_u_${currentUserUid}_`)) {
                                  localStorage.removeItem(k);
                                }
                              });
                            }
                            window.location.reload();
                          }
                        );
                      }}
                      type="button"
                      className="h-11 px-5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-xl font-semibold text-xs transition-colors cursor-pointer w-full sm:w-fit"
                    >
                      Limpar Cache Local da Conta
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSyncAndReturn}
          className="h-11 px-6 bg-gold text-[#07090e] rounded-xl font-bold text-xs shadow-[0_4px_16px_rgba(243,186,47,0.22)] hover:brightness-110 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Zap size={15} />
          Sincronizar e Ir ao Painel
        </button>
      </div>
    </div>
  );
}
