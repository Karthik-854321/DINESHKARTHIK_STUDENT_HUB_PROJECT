import { useState, useEffect } from 'react';
import '@/App.css';
import { MeshGradient } from './components/MeshGradient';
import { FloatingDock } from './components/FloatingDock';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { TasksModule } from './components/TasksModule';
import { StudyModule } from './components/StudyModule';
import { LibraryModule } from './components/LibraryModule';
import { WellnessModule } from './components/WellnessModule';
import { AINudges } from './components/AINudges';
import { Toaster } from './components/ui/sonner';
import { LogOut, Zap } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const stored = localStorage.getItem('nexus_user');
    const token = localStorage.getItem('nexus_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
    setActiveTab('dashboard');
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} onNavigate={setActiveTab} />;
      case 'tasks': return <TasksModule />;
      case 'study': return <StudyModule />;
      case 'library': return <LibraryModule />;
      case 'wellness': return <WellnessModule />;
      case 'ai': return <AINudges />;
      default: return <Dashboard user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen relative">
      <MeshGradient />

      {!user ? (
        <AuthPage onAuth={handleAuth} />
      ) : (
        <>
          {/* Top Bar */}
          <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#39ff14]" strokeWidth={2.5} />
              <span className="text-sm font-bold tracking-wider text-white/80" data-testid="app-logo">NEXUS</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/30">{user?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                data-testid="logout-btn"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="pt-16 min-h-screen">
            {renderModule()}
          </main>

          {/* Floating Dock Navigation */}
          <FloatingDock activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}

      <Toaster />
    </div>
  );
}

export default App;
