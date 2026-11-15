import { LayoutDashboard, Boxes, ShoppingBag, User, Calculator, LogOut, Settings, X, Receipt, BarChart3 } from 'lucide-react';
import { Settings as SettingsType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './CommonUI';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  settings: SettingsType;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  desktopSidebarOpen: boolean;
  setDesktopSidebarOpen: (open: boolean) => void;
}

export function Sidebar({
  activeView,
  setActiveView,
  collapsed = false,
  settings,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
  desktopSidebarOpen,
}: SidebarProps) {
  const menuGroups = [
    {
      label: 'Principal',
      items: [
        { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
        { id: 'sales', label: 'Vendas & Recebíveis', icon: ShoppingBag },
        { id: 'stock', label: 'Estoque', icon: Boxes },
        { id: 'clients', label: 'Clientes', icon: User },
      ],
    },
    {
      label: 'Financeiro & Ferramentas',
      items: [
        { id: 'transactions', label: 'Transações', icon: Receipt },
        { id: 'reports', label: 'Relatório & Caixa', icon: BarChart3 },
        { id: 'simulation', label: 'Simulador', icon: Calculator },
        { id: 'settings', label: 'Configurações', icon: Settings },
      ],
    },
  ];

  const renderContent = (isDrawer = false) => {
    const isCollapsed = collapsed && !isDrawer;
    return (
      <div className="flex flex-col h-full bg-[#090c13]/95 backdrop-blur-2xl border-r border-white/[0.08] p-4 sm:p-5 overflow-hidden select-none">
        <div className="flex items-center justify-between mb-6 px-1 pt-0.5">
          <Logo showText={!isCollapsed} />
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Fechar menu"
            >
              <X size={17} />
            </button>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-0.5">
          {menuGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              {!isCollapsed && (
                <span className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {group.label}
                </span>
              )}
              {group.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex items-center h-11 rounded-xl transition-colors duration-150 relative group cursor-pointer ${
                      isActive
                        ? 'bg-gold/[0.12] text-gold border border-gold/25 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent font-medium'
                    } ${isCollapsed ? 'justify-center px-2' : 'px-3.5 gap-3'}`}
                  >
                    <item.icon
                      size={18}
                      className={`shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-gold' : 'text-zinc-500 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate text-left text-[13px] tracking-tight whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                    {isActive && !isCollapsed && (
                      <motion.div
                        layoutId="active-sidebar-pill"
                        className="absolute left-0 w-[3px] h-5 bg-gold rounded-r-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 border-t border-white/[0.08] pt-4">
          {/* User Card */}
          <button
            type="button"
            onClick={() => {
              setActiveView('settings');
              setIsMobileOpen(false);
            }}
            className={`flex items-center gap-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors text-left cursor-pointer ${
              isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'
            }`}
            title="Configurar perfil do operador"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/15 border border-gold/30 text-gold flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
              {settings.profilePhoto ? (
                <img src={settings.profilePhoto} alt={settings.userName || 'Operador'} className="w-full h-full object-cover" />
              ) : (
                (settings.userName?.charAt(0) || 'U').toUpperCase()
              )}
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-zinc-100 text-xs font-semibold truncate">{settings.userName || 'Operador'}</span>
                {(settings.userRole || settings.userFunction) && (
                  <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {[settings.userRole, settings.userFunction].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`flex items-center h-10 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/[0.08] border border-transparent hover:border-red-500/20 transition-all font-medium text-xs cursor-pointer ${
              isCollapsed ? 'justify-center' : 'px-3.5 gap-2.5'
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Encerrar Sessão</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden ${
          desktopSidebarOpen ? 'sm:block' : 'sm:hidden'
        } transition-all duration-300 sticky top-0 h-screen shrink-0 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[90] sm:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-[100] sm:hidden shadow-2xl"
            >
              {renderContent(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
