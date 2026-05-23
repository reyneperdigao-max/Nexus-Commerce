import { Settings as SettingsIcon, Menu, Wallet, ShoppingBag, Boxes, User, Activity, AlertCircle, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Product, Sale, Installment } from '../types';

export function Logo({ className = "", showText = true }: { className?: string, showText?: boolean }) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className} overflow-hidden`}>
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center text-black font-black text-lg sm:text-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] shrink-0 transition-transform hover:rotate-12">
        NC
      </div>
      {showText && (
        <div className="flex flex-col">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-widest leading-none shrink-0 uppercase">NEXUS <span className="text-white/60">COMMERCE</span></h2>
          <span className="text-[8px] sm:text-[10px] text-gold font-bold uppercase tracking-[0.3em] mt-1 shrink-0">GESTÃO DE VENDAS</span>
        </div>
      )}
    </div>
  );
}

export function Topbar({ onOpenSettings, onOpenMobileMenu, viewTitle }: { 
  onOpenSettings: () => void; 
  onOpenMobileMenu: () => void;
  viewTitle: string;
}) {
  return (
    <header className="h-16 sm:h-20 bg-black/80 backdrop-blur-md border-b border-line-strong px-4 sm:px-10 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <button onClick={onOpenMobileMenu} className="sm:hidden w-10 h-10 rounded-xl border border-line flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
          <Menu size={20} />
        </button>
        <h2 className="text-sm sm:text-lg font-black text-white italic uppercase tracking-tight truncate">{viewTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSettings}
          className="w-10 h-10 bg-card border border-line rounded-xl flex items-center justify-center text-gray-400 hover:text-gold hover:border-gold/30 transition-all group active:scale-90"
        >
          <SettingsIcon size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>
    </header>
  );
}

export function DashboardStats({ products, sales, installments, closings = [], onNavigate }: { products: any[], sales: any[], installments: any[], closings?: any[], onNavigate: (view: string, filter?: string) => void }) {
  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const investedValue = products.reduce((acc, p) => acc + (p.cost || 0), 0);
  
  const overdueCount = installments.filter(i => {
    if (i.status !== 'Pendente') return false;
    const dueDate = new Date(i.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  const dueTodayCount = installments.filter(i => {
    if (i.status !== 'Pendente') return false;
    const dueDate = new Date(i.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).length;

  const lastClosingDate = closings.length > 0 
    ? closings.reduce((latest, c) => c.closedAt > latest ? c.closedAt : latest, '')
    : '';

  const activeSales = sales.filter(s => s.createdAt > lastClosingDate);
  const currentProfit = activeSales.reduce((acc, s) => acc + (s.profit || 0), 0);

  const stats = [
    { 
      id: 'invested-stat',
      label: 'Total em Produtos', 
      value: money(investedValue), 
      sub: 'Patrimônio investido', 
      icon: Boxes, 
      color: 'blue',
      trend: 'Investimento',
      view: 'stock',
      filter: 'Todos',
      style: { icon: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', glow: 'bg-blue-500' }
    },
    { 
      id: 'profit-stat',
      label: 'Lucro Líquido (Ciclo)', 
      value: money(currentProfit), 
      sub: closings.length > 0 ? 'Desde o último fechamento' : 'Acumulado histórico', 
      icon: DollarSign, 
      color: 'yellow',
      trend: 'Resultado',
      view: 'reports',
      filter: 'Todos',
      style: { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', glow: 'bg-amber-500' }
    },
    { 
      id: 'sales-stat',
      label: 'Vendas Realizadas', 
      value: sales.length, 
      sub: 'Contratos validados', 
      icon: ShoppingBag, 
      color: 'gold',
      trend: 'Desempenho',
      view: 'sales',
      filter: 'Todos',
      style: { icon: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/20', text: 'text-gold-200', dot: 'bg-gold', glow: 'bg-gold' }
    },
    { 
      id: 'receivables-stat',
      label: 'Valores a Receber', 
      value: money(installments.filter(i => i.status === 'Pendente').reduce((acc, i) => acc + i.value, 0)), 
      sub: 'Lançamentos futuros', 
      icon: TrendingUp, 
      color: 'green',
      trend: 'Liquidez',
      view: 'sales',
      filter: 'Todos',
      style: { icon: 'text-green-neon', bg: 'bg-green-neon/10', border: 'border-green-neon/20', text: 'text-green-neon', dot: 'bg-green-neon', glow: 'bg-green-neon' }
    },
    { 
      id: 'overdue-stat',
      label: 'Atrasados', 
      value: overdueCount, 
      sub: overdueCount > 0 ? 'CRÍTICO: Inadimplência detectada' : 'Sem pendências críticas', 
      icon: AlertCircle, 
      color: 'red',
      trend: 'Risco',
      view: 'sales',
      filter: 'Atrasados',
      style: { 
        icon: overdueCount > 0 ? 'text-red-500' : 'text-gray-600', 
        bg: overdueCount > 0 ? 'bg-red-500/20' : 'bg-white/5', 
        border: overdueCount > 0 ? 'border-red-500/40' : 'border-white/5', 
        text: overdueCount > 0 ? 'text-red-400' : 'text-gray-500', 
        dot: overdueCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-700', 
        glow: 'bg-red-500' 
      },
      severity: overdueCount > 0
    },
    { 
      id: 'due-today-stat',
      label: 'Vence Hoje', 
      value: dueTodayCount, 
      sub: dueTodayCount > 0 ? 'ATENÇÃO: Recebíveis do dia' : 'Nenhuma parcela para hoje', 
      icon: Calendar, 
      color: 'purple',
      trend: 'Operacional',
      view: 'sales',
      filter: 'Hoje',
      style: { 
        icon: dueTodayCount > 0 ? 'text-purple-500' : 'text-gray-600', 
        bg: dueTodayCount > 0 ? 'bg-purple-500/20' : 'bg-white/5', 
        border: dueTodayCount > 0 ? 'border-purple-500/40' : 'border-white/5', 
        text: dueTodayCount > 0 ? 'text-purple-400' : 'text-gray-500', 
        dot: dueTodayCount > 0 ? 'bg-purple-500 animate-bounce' : 'bg-gray-700', 
        glow: 'bg-purple-500' 
      },
      severity: dueTodayCount > 0
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 px-1">
      {stats.map((stat) => (
        <div 
          key={stat.id} 
          onClick={() => onNavigate(stat.view, (stat as any).filter)}
          className={`glass-card group p-5 sm:p-6 flex flex-col gap-4 sm:gap-6 border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden cursor-pointer active:scale-95 ${stat.severity ? 'shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/5'}`}
        >
          {/* Subtle Color Glow */}
          <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 ${stat.style.glow}`} />
          
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.style.bg} border ${stat.style.border} group-hover:border-opacity-50 transition-all duration-500`}>
              <stat.icon size={26} className={`${stat.style.icon} group-hover:scale-110 transition-transform duration-500`} />
            </div>
            <div className={`px-2 py-1 rounded-lg ${stat.style.bg} border ${stat.style.border} border-opacity-50`}>
              <span className={`text-[9px] font-black uppercase tracking-widest ${stat.style.text}`}>{stat.trend}</span>
            </div>
          </div>

          <div className="relative z-10">
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 block ${stat.severity ? 'text-white' : 'text-white/40'}`}>{stat.label}</span>
            <strong className={`text-3xl font-black block transition-colors duration-500 group-hover:text-white/90 ${stat.severity ? 'text-white' : 'text-zinc-100'}`}>
              {stat.value}
            </strong>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${stat.style.dot} ${stat.severity ? 'shadow-[0_0_12px_currentColor] scale-125' : 'shadow-[0_0_8px_currentColor]'}`} />
              <p className={`text-[10px] font-bold uppercase tracking-wider ${stat.severity ? 'text-white animate-pulse' : 'text-white/30'}`}>{stat.sub}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
