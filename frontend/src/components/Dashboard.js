import { useEffect, useState } from 'react';
import { CheckSquare, BookOpen, Library, Droplets, Sparkles, TrendingUp } from 'lucide-react';
import api from '../lib/api';

const StatCard = ({ icon: Icon, label, value, subtitle, accentColor, tag, onClick, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className="glass-card rounded-3xl p-6 text-left group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer w-full"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: `${accentColor}15` }}>
        <Icon size={20} style={{ color: accentColor }} />
      </div>
      {tag && (
        <span className="text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full font-medium" style={{ background: `${accentColor}15`, color: accentColor }}>
          {tag}
        </span>
      )}
    </div>
    <p className="text-xs text-white/40 tracking-wider uppercase mb-1">{label}</p>
    <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
    <p className="text-xs text-white/30 mt-1">{subtitle}</p>
  </button>
);

export const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  const s = stats || { tasks: { total: 0, completed: 0 }, study: { active_plans: 0, consistency: 0 }, resources: { total: 0 }, wellness: { today_water: 0, today_pomodoros: 0 } };
  const completionRate = s.tasks.total > 0 ? Math.round((s.tasks.completed / s.tasks.total) * 100) : 0;

  return (
    <div className="relative z-10 p-4 md:p-8 pb-32 max-w-6xl mx-auto" data-testid="dashboard-view">
      <div className="mb-10">
        <p className="text-xs text-white/30 tracking-[0.3em] uppercase mb-2">Welcome back</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="text-white/60">Productivity</span>{' '}
          <span className="neon-green">Unleashed</span>
        </h1>
        <p className="text-white/40 mt-3 text-base max-w-xl leading-relaxed">
          Your all-in-one command center. Track tasks, master study plans, and maintain wellness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-in">
        <StatCard
          icon={CheckSquare}
          label="Completion Rate"
          value={`${s.tasks.completed}/${s.tasks.total}`}
          subtitle={`${completionRate}% complete`}
          accentColor="#39ff14"
          tag="Tasks"
          onClick={() => onNavigate('tasks')}
          testId="stat-tasks"
        />
        <StatCard
          icon={TrendingUp}
          label="Consistency"
          value={`${s.study.consistency}%`}
          subtitle={`${s.study.active_plans} active plans`}
          accentColor="#00f3ff"
          tag="Study"
          onClick={() => onNavigate('study')}
          testId="stat-study"
        />
        <StatCard
          icon={Library}
          label="Resources"
          value={s.resources.total}
          subtitle="learning materials saved"
          accentColor="#ffb900"
          tag="Library"
          onClick={() => onNavigate('library')}
          testId="stat-library"
        />
        <StatCard
          icon={Droplets}
          label="Today"
          value={s.wellness.today_water}
          subtitle="glasses of water"
          accentColor="#bc13fe"
          tag="Wellness"
          onClick={() => onNavigate('wellness')}
          testId="stat-wellness"
        />
      </div>

      {/* Quick AI Nudge */}
      <div className="mt-8">
        <button
          onClick={() => onNavigate('ai')}
          data-testid="quick-ai-nudge"
          className="glass-panel rounded-2xl p-5 w-full text-left hover:bg-white/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#bc13fe]/15 flex items-center justify-center">
              <Sparkles size={20} className="text-[#bc13fe]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Get AI Health Nudge</p>
              <p className="text-xs text-white/30">Personalized suggestions based on your data</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
