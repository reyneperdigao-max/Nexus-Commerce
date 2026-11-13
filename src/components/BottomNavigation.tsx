import { LayoutDashboard, ShoppingBag, Boxes, User, Menu } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function BottomNavigation({ activeView, setActiveView, isMobileOpen, setIsMobileOpen }: BottomNavigationProps) {
  const items = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'stock', label: 'Estoque', icon: Boxes },
    { id: 'clients', label: 'Clientes', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0d14]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 pb-safe sm:hidden select-none">
      <div className="h-16 flex items-center justify-around relative">
        {items.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveView(item.id);
                setIsMobileOpen(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full relative text-center py-1 transition-colors duration-150 cursor-pointer ${
                isActive ? 'text-gold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-bottom-indicator"
                  className="absolute top-0 w-8 h-[2px] bg-gold rounded-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              <item.icon size={18} className={`mb-1 ${isActive ? 'text-gold' : ''}`} />
              <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More/Collapse Trigger */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`flex flex-col items-center justify-center flex-1 h-full text-center py-1 transition-colors duration-150 cursor-pointer ${
            isMobileOpen ? 'text-gold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Menu size={18} className={`mb-1 transition-transform duration-150 ${isMobileOpen ? 'rotate-90 text-gold' : ''}`} />
          <span className="text-[10px] font-semibold tracking-tight">Menu</span>
        </button>
      </div>
    </div>
  );
}
