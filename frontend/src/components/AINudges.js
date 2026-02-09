import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Sparkles, RefreshCw, Zap, Clock } from 'lucide-react';
import api from '../lib/api';

export const AINudges = () => {
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestNudge, setLatestNudge] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/ai/nudges');
      setNudges(res.data);
    } catch (err) {
      console.error('Failed to fetch nudge history:', err);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const requestNudge = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/nudge');
      setLatestNudge(res.data);
      fetchHistory();
    } catch (err) {
      console.error('Failed to get AI nudge:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 p-4 md:p-8 pb-32 max-w-3xl mx-auto" data-testid="ai-nudges-view">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">The Architect</h1>
        <p className="text-white/40 text-sm mt-1">AI-powered health and productivity insights</p>
      </div>

      {/* Request Nudge */}
      <div className="glass-panel rounded-3xl p-8 text-center mb-8 relative overflow-hidden" data-testid="ai-nudge-request">
        <div className="absolute inset-0 bg-gradient-to-br from-[#bc13fe]/5 to-[#00f3ff]/5 pointer-events-none" />
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#bc13fe]/15 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-[#bc13fe]" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Get Personalized Nudge</h2>
          <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
            The Architect analyzes your tasks, study progress, and wellness data to provide actionable suggestions.
          </p>
          <Button
            onClick={requestNudge}
            disabled={loading}
            data-testid="request-nudge-btn"
            className="rounded-full bg-gradient-to-r from-[#bc13fe] to-[#00f3ff] text-white font-bold px-8 py-5 hover:shadow-[0_0_30px_rgba(188,19,254,0.3)] transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> Analyzing...</span>
            ) : (
              <span className="flex items-center gap-2"><Zap size={16} /> Generate Nudge</span>
            )}
          </Button>
        </div>
      </div>

      {/* Latest Nudge */}
      {latestNudge && (
        <div className="glass-card rounded-3xl p-6 mb-8 neon-border-cyan" data-testid="latest-nudge">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f3ff]/15 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-[#00f3ff]" />
            </div>
            <div>
              <p className="text-xs text-[#00f3ff] tracking-wider uppercase mb-2">Latest Insight</p>
              <p className="text-sm text-white/80 leading-relaxed">{latestNudge.message || latestNudge.nudge}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={16} className="text-white/40" /> Previous Insights
        </h2>
        <div className="space-y-3" data-testid="nudge-history">
          {nudges.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center">
              <p className="text-white/30 text-sm">No insights yet. Request your first nudge!</p>
            </div>
          ) : (
            nudges.map((nudge) => (
              <div key={nudge.id} className="glass-panel rounded-2xl p-4" data-testid={`nudge-${nudge.id}`}>
                <p className="text-sm text-white/70 leading-relaxed">{nudge.message}</p>
                <p className="text-[10px] text-white/20 mt-2">{new Date(nudge.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
