import { LayoutDashboard, Boxes, ShoppingBag, User, Calculator, LogOut, Settings, Menu, X, Receipt, BarChart3 } from 'lucide-react';
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

export function Sidebar({ activeView, setActiveView, collapsed = false, setCollapsed, settings, onLogout, isMobileOpen, setIsMobileOpen, desktopSidebarOpen, setDesktopSidebarOpen }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stock', label: 'Estoque', icon: Boxes },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'transactions', label: 'Transações', icon: Receipt },
    { id: 'clients', label: 'Clientes', icon: User },
    { id: 'reports', label: 'Relatório', icon: BarChart3 },
    { id: 'simulation', label: 'Simulador', icon: Calculator },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full bg-black/95 backdrop-blur-2xl border-r border-white/[0.08] p-4 sm:p-6 overflow-hidden select-none">
      <div className="flex items-center justify-between mb-8 px-2">
        <Logo showText={!collapsed} />
      </div>

      <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsMobileOpen(false);
              }}
              className={`flex items-center h-11 sm:h-12 rounded-xl transition-all duration-200 relative group cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-gold to-yellow-500 text-black font-black shadow-lg shadow-gold/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-bold uppercase text-[11px] tracking-wider'
              } ${collapsed ? 'justify-center' : 'px-3.5 gap-3.5'}`}
            >
              <item.icon 
                size={19} 
                className={`shrink-0 transition-transform duration-200 ${
                  isActive ? 'text-black' : 'text-zinc-400 group-hover:text-gold group-hover:scale-110'
                }`} 
              />
              {!collapsed && (
                <span className="truncate text-left">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-5 bg-black rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3.5 border-t border-white/[0.08] pt-5">
        {/* User Card */}
        <div className={`flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] ${collapsed ? 'justify-center p-2' : 'px-3 py-2.5'}`}>
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gold-soft border border-gold/30 text-gold flex items-center justify-center font-black overflow-hidden shadow-[0_0_12px_rgba(255,215,0,0.15)]">
               {settings.profilePhoto ? <img src={settings.profilePhoto} className="w-full h-full object-cover" /> : (settings.userName?.charAt(0) || 'U').toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-white text-xs font-black truncate">{settings.userName || 'Operador'}</span>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {settings.userRole && (
                  <span className="text-[9px] text-gold font-bold uppercase truncate tracking-wider">{settings.userRole}</span>
                )}
                {settings.userFunction && (
                  <span className="text-[8.5px] text-zinc-400 font-medium uppercase truncate tracking-wider">{settings.userFunction}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onLogout}
          className={`flex items-center h-10 sm:h-11 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-black uppercase text-[10px] tracking-widest cursor-pointer ${collapsed ? 'justify-center' : 'px-3.5 gap-3'}`}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Encerrar Sessão</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden ${desktopSidebarOpen ? 'sm:block' : 'sm:hidden'} transition-all duration-300 sticky top-0 h-screen shrink-0 ${collapsed ? 'w-24' : 'w-72'}`}>
        {content}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] sm:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 z-[100] sm:hidden shadow-2xl"
            >
              {content}
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-[-50px] w-10 h-10 bg-black border border-line rounded-xl flex items-center justify-center text-white"
              >
                <X size={20} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
