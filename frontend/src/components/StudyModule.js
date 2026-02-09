import { useEffect, useState, useCallback } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, BookOpen, Clock, Trash2, TrendingUp } from 'lucide-react';
import api from '../lib/api';

const ProgressRing = ({ progress, size = 80, stroke = 6, color = '#00f3ff' }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="progress-ring-circle"
        style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
      />
    </svg>
  );
};

const PlanCard = ({ plan, onLogSession, onDelete }) => {
  const progress = plan.target_hours > 0 ? Math.round((plan.logged_hours / plan.target_hours) * 100) : 0;

  return (
    <div className="glass-card rounded-3xl p-6 relative group" data-testid={`study-plan-${plan.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs text-[#00f3ff]/70 tracking-wider uppercase mb-1">{plan.subject}</p>
          <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
          {plan.description && <p className="text-xs text-white/30 mt-1">{plan.description}</p>}
        </div>
        <div className="relative flex items-center justify-center">
          <ProgressRing progress={progress} size={64} stroke={5} />
          <span className="absolute text-xs font-bold text-[#00f3ff]">{progress}%</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/40">
        <span className="flex items-center gap-1"><Clock size={12} /> {plan.logged_hours.toFixed(1)}h / {plan.target_hours}h</span>
        <span className="flex items-center gap-1"><BookOpen size={12} /> {plan.sessions?.length || 0} sessions</span>
      </div>
      <div className="flex gap-2 mt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              data-testid={`log-session-btn-${plan.id}`}
              className="rounded-full bg-[#00f3ff]/15 text-[#00f3ff] hover:bg-[#00f3ff]/25 border border-[#00f3ff]/20 text-xs"
            >
              <Plus size={12} className="mr-1" /> Log Session
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0B1221] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Log Study Session</DialogTitle>
            </DialogHeader>
            <LogSessionForm planId={plan.id} onLog={onLogSession} />
          </DialogContent>
        </Dialog>
        <button
          onClick={() => onDelete(plan.id)}
          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-2"
          data-testid={`delete-plan-btn-${plan.id}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const LogSessionForm = ({ planId, onLog }) => {
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLog(planId, parseFloat(duration), notes);
    setDuration('30'); setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <label className="text-xs text-white/50 mb-1 block">Duration (minutes)</label>
        <Input
          type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
          className="bg-black/30 border-white/10 rounded-xl text-white" min="1"
          data-testid="session-duration-input"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 mb-1 block">Notes (optional)</label>
        <Input
          value={notes} onChange={(e) => setNotes(e.target.value)}
          className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20"
          placeholder="What did you study?"
          data-testid="session-notes-input"
        />
      </div>
      <Button
        type="submit" data-testid="submit-session-btn"
        className="w-full rounded-full bg-[#00f3ff] text-black font-bold hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
      >
        Log Session
      </Button>
    </form>
  );
};

export const StudyModule = () => {
  const [plans, setPlans] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [targetHours, setTargetHours] = useState('10');

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get('/study-plans');
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to fetch study plans:', err);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;
    await api.post('/study-plans', { title, subject, description: desc, target_hours: parseFloat(targetHours) });
    setTitle(''); setSubject(''); setDesc(''); setTargetHours('10'); setShowCreate(false);
    fetchPlans();
  };

  const handleLogSession = async (planId, durationMinutes, notes) => {
    await api.post(`/study-plans/${planId}/log-session`, { duration_minutes: durationMinutes, notes });
    fetchPlans();
  };

  const handleDelete = async (planId) => {
    await api.delete(`/study-plans/${planId}`);
    fetchPlans();
  };

  const overallConsistency = plans.length > 0
    ? Math.round(plans.reduce((sum, p) => sum + (p.target_hours > 0 ? (p.logged_hours / p.target_hours) * 100 : 0), 0) / plans.length)
    : 0;

  return (
    <div className="relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto" data-testid="study-view">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Study Plans</h1>
          <p className="text-white/40 text-sm mt-1">Track your learning consistency</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel rounded-2xl px-4 py-2 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#00f3ff]" />
            <span className="text-sm font-bold text-[#00f3ff]">{overallConsistency}%</span>
          </div>
        </div>
      </div>

      <Button
        onClick={() => setShowCreate(!showCreate)}
        data-testid="toggle-create-plan-btn"
        className="rounded-full bg-[#00f3ff]/15 text-[#00f3ff] hover:bg-[#00f3ff]/25 border border-[#00f3ff]/20 mb-6"
      >
        <Plus size={16} className="mr-1" /> New Study Plan
      </Button>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass-panel rounded-3xl p-6 mb-8 space-y-3" data-testid="create-plan-form">
          <Input data-testid="plan-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan title" className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20" required />
          <Input data-testid="plan-subject-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20" required />
          <Input data-testid="plan-desc-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20" />
          <Input data-testid="plan-target-input" type="number" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} placeholder="Target hours" className="bg-black/30 border-white/10 rounded-xl text-white" min="1" />
          <Button type="submit" data-testid="submit-plan-btn" className="w-full rounded-full bg-[#00f3ff] text-black font-bold hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]">
            Create Plan
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-in" data-testid="study-plans-list">
        {plans.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center col-span-2">
            <p className="text-white/30 text-sm">No study plans yet. Create one to get started!</p>
          </div>
        ) : (
          plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onLogSession={handleLogSession} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
};
