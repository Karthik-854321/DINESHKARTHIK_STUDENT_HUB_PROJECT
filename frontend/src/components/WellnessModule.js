import { useEffect, useState, useRef, useCallback } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Play, Pause, RotateCcw, Plus, Droplets, Brain, Dumbbell, Moon } from 'lucide-react';
import api from '../lib/api';

const ProgressRing = ({ progress, size = 200, stroke = 10, color = '#bc13fe' }) => {
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
        style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
      />
    </svg>
  );
};

const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef(null);
  const totalTime = 25 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    const fetchPomodoros = async () => {
      try {
        const res = await api.get('/wellness/pomodoro');
        setCompleted(res.data.length);
      } catch (err) { /* ignore */ }
    };
    fetchPomodoros();
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleComplete();
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleComplete = async () => {
    try {
      await api.post('/wellness/pomodoro', { duration_minutes: 25 });
      setCompleted((c) => c + 1);
    } catch (err) { /* ignore */ }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setTimeLeft(25 * 60); };
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="glass-panel rounded-3xl p-8 text-center" data-testid="pomodoro-timer">
      <p className="text-xs tracking-wider uppercase text-[#bc13fe] mb-4 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#bc13fe] animate-pulse-glow" />
        Focus Time
      </p>
      <div className="relative inline-flex items-center justify-center mb-6">
        <ProgressRing progress={progress} size={180} stroke={8} color="#bc13fe" />
        <div className="absolute">
          <p className="text-4xl font-bold text-white font-mono tracking-wider" data-testid="pomodoro-time">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </p>
        </div>
      </div>
      <div className="flex gap-3 justify-center">
        <Button
          onClick={toggleTimer}
          data-testid="pomodoro-toggle-btn"
          className="rounded-full bg-[#bc13fe]/20 text-[#bc13fe] hover:bg-[#bc13fe]/30 border border-[#bc13fe]/30 px-8"
        >
          {isRunning ? <><Pause size={16} className="mr-1" /> Pause</> : <><Play size={16} className="mr-1" /> Start</>}
        </Button>
        <Button
          onClick={resetTimer}
          data-testid="pomodoro-reset-btn"
          variant="ghost"
          className="rounded-full text-white/40 hover:text-white border border-white/10"
        >
          <RotateCcw size={16} className="mr-1" /> Reset
        </Button>
      </div>
      <p className="text-xs text-white/30 mt-4">{completed} pomodoros completed</p>
    </div>
  );
};

const typeIcons = { water: Droplets, mood: Brain, exercise: Dumbbell, sleep: Moon };
const typeColors = { water: '#00f3ff', mood: '#bc13fe', exercise: '#39ff14', sleep: '#ffb900' };

export const WellnessModule = () => {
  const [logs, setLogs] = useState([]);
  const [logType, setLogType] = useState('water');
  const [value, setValue] = useState('');
  const [mood, setMood] = useState([5]);
  const [notes, setNotes] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get('/wellness/logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch wellness logs:', err);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleLog = async (e) => {
    e.preventDefault();
    const logValue = logType === 'mood' ? mood[0] : parseFloat(value);
    if (logType !== 'mood' && (!value || isNaN(logValue))) return;
    await api.post('/wellness/logs', { log_type: logType, value: logValue, notes });
    setValue(''); setNotes('');
    fetchLogs();
  };

  return (
    <div className="relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto" data-testid="wellness-view">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Wellness Tracker</h1>
        <p className="text-white/40 text-sm mt-1">Monitor your health and productivity</p>
      </div>

      {/* Pomodoro Timer */}
      <PomodoroTimer />

      {/* Log Activity */}
      <form onSubmit={handleLog} className="glass-panel rounded-3xl p-6 mt-6 space-y-4" data-testid="wellness-log-form">
        <p className="text-sm font-semibold text-white tracking-wide uppercase">Log Activity</p>
        <div className="grid grid-cols-2 gap-3">
          <Select value={logType} onValueChange={setLogType}>
            <SelectTrigger className="bg-black/30 border-white/10 rounded-xl text-white" data-testid="wellness-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0B1221] border-white/10">
              {['water', 'mood', 'exercise', 'sleep'].map((t) => (
                <SelectItem key={t} value={t} className="text-white hover:bg-white/10 capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {logType !== 'mood' ? (
            <Input
              data-testid="wellness-value-input"
              type="number" value={value} onChange={(e) => setValue(e.target.value)}
              placeholder={logType === 'water' ? 'Glasses' : logType === 'exercise' ? 'Minutes' : 'Hours'}
              className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20"
              min="0" step="0.5"
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">Mood: {mood[0]}/10</span>
              <Slider
                data-testid="wellness-mood-slider"
                value={mood} onValueChange={setMood} min={1} max={10} step={1}
                className="flex-1"
              />
            </div>
          )}
        </div>
        <Input
          data-testid="wellness-notes-input"
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20"
        />
        <Button
          type="submit" data-testid="wellness-log-btn"
          className="w-full rounded-full bg-[#bc13fe] text-white font-bold hover:shadow-[0_0_20px_rgba(188,19,254,0.4)] transition-all"
        >
          <Plus size={16} className="mr-1" /> Log Entry
        </Button>
      </form>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-2" data-testid="wellness-log-list">
          {logs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center">
              <p className="text-white/30 text-sm">No wellness logs yet</p>
            </div>
          ) : (
            logs.slice(0, 15).map((log) => {
              const Icon = typeIcons[log.log_type] || Droplets;
              const color = typeColors[log.log_type] || '#ffffff';
              return (
                <div key={log.id} className="glass-panel rounded-2xl p-4 flex items-center gap-3" data-testid={`wellness-log-${log.id}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white capitalize">{log.log_type}: <span className="font-bold" style={{ color }}>{log.value}</span>
                      {log.log_type === 'water' && ' glasses'}
                      {log.log_type === 'exercise' && ' min'}
                      {log.log_type === 'sleep' && ' hours'}
                      {log.log_type === 'mood' && '/10'}
                    </p>
                    {log.notes && <p className="text-xs text-white/30">{log.notes}</p>}
                  </div>
                  <span className="text-[10px] text-white/20">{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
