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
    <div className="flex flex-col h-full bg-black border-r border-line-strong p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-12 px-2">
        <Logo showText={!collapsed} />
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveView(item.id);
              setIsMobileOpen(false);
            }}
            className={`flex items-center h-12 rounded-xl transition-all relative group ${
              activeView === item.id 
                ? 'bg-gold text-black italic font-black shadow-lg shadow-gold/20' 
                : 'text-gray-500 hover:text-white hover:bg-white/5 font-bold uppercase text-[11px] tracking-widest'
            } ${collapsed ? 'justify-center' : 'px-4 gap-4'}`}
          >
            <item.icon size={20} className={activeView === item.id ? '' : 'text-gray-600 group-hover:text-gold transition-colors'} />
            {!collapsed && <span>{item.label}</span>}
            {activeView === item.id && !collapsed && (
              <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-black rounded-r-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 border-t border-line/30 pt-6">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
          <div className="w-10 h-10 rounded-full bg-gold-soft border border-gold/20 text-gold flex items-center justify-center font-black overflow-hidden shrink-0">
             {settings.profilePhoto ? <img src={settings.profilePhoto} className="w-full h-full object-cover" /> : settings.userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-white text-xs font-black truncate">{settings.userName}</span>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {settings.userRole && (
                  <span className="text-[9px] text-gold/90 font-bold uppercase truncate tracking-wider">{settings.userRole}</span>
                )}
                {settings.userFunction && (
                  <span className="text-[9px] text-gray-400 font-bold uppercase truncate tracking-wider">{settings.userFunction}</span>
                )}
                {settings.userEmail && (
                  <span className="text-[8.5px] text-gray-500 font-medium truncate mt-0.5 lower-case select-all">{settings.userEmail}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onLogout}
          className={`flex items-center h-12 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-black uppercase text-[10px] tracking-widest ${collapsed ? 'justify-center' : 'px-4 gap-4'}`}
        >
          <LogOut size={20} />
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
