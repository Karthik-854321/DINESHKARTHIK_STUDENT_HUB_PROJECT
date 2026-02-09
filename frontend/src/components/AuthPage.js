import { useState } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { LogIn, UserPlus, Zap } from 'lucide-react';
import api from '../lib/api';

export const AuthPage = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { email, password, name };
      const res = await api.post(endpoint, payload);
      localStorage.setItem('nexus_token', res.data.token);
      localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
      onAuth(res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-[#39ff14]" strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight neon-green" data-testid="auth-title">NEXUS</h1>
          </div>
          <p className="text-white/50 text-sm tracking-wider uppercase">Intelligent Productivity Hub</p>
        </div>

        <div className="glass-panel rounded-3xl p-8" data-testid="auth-form-container">
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              data-testid="auth-login-tab"
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                isLogin ? 'bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              data-testid="auth-register-tab"
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                !isLogin ? 'bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-white/60 text-xs tracking-wider uppercase">Name</Label>
                <Input
                  data-testid="auth-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-black/30 border-white/10 rounded-xl focus:border-[#39ff14]/50 focus:ring-1 focus:ring-[#39ff14]/30 placeholder:text-white/20 text-white"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs tracking-wider uppercase">Email</Label>
              <Input
                data-testid="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-black/30 border-white/10 rounded-xl focus:border-[#39ff14]/50 focus:ring-1 focus:ring-[#39ff14]/30 placeholder:text-white/20 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs tracking-wider uppercase">Password</Label>
              <Input
                data-testid="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="bg-black/30 border-white/10 rounded-xl focus:border-[#39ff14]/50 focus:ring-1 focus:ring-[#39ff14]/30 placeholder:text-white/20 text-white"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center" data-testid="auth-error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full rounded-full bg-[#39ff14] text-black font-bold hover:shadow-[0_0_30px_rgba(57,255,20,0.4)] transition-all py-5 text-base"
            >
              {loading ? (
                <span className="animate-pulse">Processing...</span>
              ) : isLogin ? (
                <span className="flex items-center gap-2 justify-center"><LogIn size={18} /> Sign In</span>
              ) : (
                <span className="flex items-center gap-2 justify-center"><UserPlus size={18} /> Create Account</span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
