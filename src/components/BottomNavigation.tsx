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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-line-strong px-4 pb-safe sm:hidden">
      <div className="h-16 flex items-center justify-around relative">
        {items.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsMobileOpen(false);
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full relative text-center py-1 transition-all active:scale-95 ${
                isActive ? 'text-gold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-bottom-indicator"
                  className="absolute top-0 w-8 h-[2px] bg-gold rounded-full"
                  transition={{ type: 'spring', sharpness: 200, damping: 20 }}
                />
              )}
              <item.icon size={20} className={`mb-1 transition-transform ${isActive ? 'scale-110 text-gold' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          );
        })}

        {/* More/Collapse Trigger */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`flex flex-col items-center justify-center flex-1 h-full text-center py-1 transition-all active:scale-95 ${
            isMobileOpen ? 'text-gold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Menu size={20} className={`mb-1 transition-transform ${isMobileOpen ? 'scale-115 rotate-90 text-gold' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
        </button>
      </div>
    </div>
  );
}
