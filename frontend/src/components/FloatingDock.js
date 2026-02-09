import { LayoutDashboard, CheckSquare, BookOpen, Library, Heart, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'wellness', label: 'Wellness', icon: Heart },
  { id: 'ai', label: 'AI Nudges', icon: Sparkles },
];

export const FloatingDock = ({ activeTab, onTabChange }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <nav
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2.5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/10 shadow-2xl z-50"
        data-testid="floating-dock"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(item.id)}
                  data-testid={`dock-${item.id}`}
                  className={`dock-item w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer relative transition-colors duration-200
                    ${isActive
                      ? 'bg-[#39ff14]/15 text-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.2)]'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Icon size={20} strokeWidth={2} />
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#39ff14] shadow-[0_0_6px_#39ff14]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-black/80 backdrop-blur-xl border-white/10 text-white text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
};
