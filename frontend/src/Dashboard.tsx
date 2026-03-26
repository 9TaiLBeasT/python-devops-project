import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Activity, ShieldCheck, Cpu, Database, RefreshCcw, ExternalLink, Terminal, Zap, Github, Server, CheckCircle2, CircleDashed, ArrowRight, Play, Container } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

interface LogEntry {
  id: number;
  time: string;
  method: string;
  path: string;
  status: number;
  ms: number;
}

export const Dashboard = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  
  // Pipeline State
  const [pipelineStage, setPipelineStage] = useState<number>(4); // 4 = Completed
  const [isDeploying, setIsDeploying] = useState(false);
  const logIdCounter = useRef(0);

  const triggerPipeline = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setPipelineStage(0);
    
    addLog('CMD', 'git push origin main', 200, 45);
    
    try {
        const response = await axios.post('/api/deploy');
        addLog('DEP', '/api/deploy triggered', response.status, 150);
        
        // If API succeeds, we simulate the rest of the visual pipeline stages
        setTimeout(() => { setPipelineStage(1); addLog('JOB', 'pytest-cov running', 200, 120); }, 2000);
        setTimeout(() => { setPipelineStage(2); addLog('BLD', 'docker build -t app', 200, 350); }, 4500);
        setTimeout(() => { setPipelineStage(3); addLog('DEP', 'render api waiting', 202, 100); }, 7000);
        setTimeout(() => { 
            setPipelineStage(4); 
            setIsDeploying(false); 
            addLog('SYS', 'deployment dispatched successfully', 200, 0); 
            fetchData(true);
        }, 9500);

    } catch (error: any) {
        setPipelineStage(0);
        setIsDeploying(false);
        const status = error.response?.status || 500;
        addLog('ERR', 'Trigger Failed: Check GITHUB_TOKEN', status, 0);
        console.error("Pipeline trigger failed:", error);
    }
  };

  const addLog = (method: string, path: string, status: number, ms: number = 0) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    const logStr = `[${time}] ${method.padEnd(4)} ${path} -> ${status} (${ms}ms)`;
    setServerLogs(prev => [logStr, ...prev].slice(0, 50));
  };

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const start = performance.now();
      
      const [hRes, mRes, lRes] = await Promise.all([
        axios.get('/api/health'),
        axios.get('/api/metrics'),
        axios.get('/api/logs')
      ]);
      
      const end = performance.now();
      const latency = Math.round(end - start);
      
      setHealth(hRes.data);
      setMetrics(mRes.data);
      if (lRes.data?.logs) {
         setServerLogs(lRes.data.logs);
      }
      
      const newPoint = {
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
        cpu: mRes.data.cpu_percent || 0,
        ram: mRes.data.ram_percent || 0,
        latency: latency
      };
      
      setHistory(prev => {
        const updated = [...prev, newPoint].slice(-15);
        if (updated.length === 1) {
          return [{...newPoint, time: 'Init', cpu: 0, ram: 0}, newPoint];
        }
        return updated;
      });
    } catch (err) {
      console.error("Failed to fetch data", err);
      setHealth({ status: 'Offline', version: '---', service: 'flask-app', timestamp: '' });
      addLog('ERR', '/api/*', 500, 0);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };


  const simulateLoadSpike = () => {
    addLog('POST', '/api/workload/compute', 202, 345);
    const spikePoint = {
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
      cpu: 100,
      ram: 90,
      latency: Math.floor(Math.random() * 50) + 100
    };
    setHistory(prev => [...prev.slice(-14), spikePoint]);
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 3000);
    
    return () => {
        clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-950 min-h-screen text-slate-50 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="text-blue-400" size={32} />
            DevOps Orbit
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Production Dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={simulateLoadSpike}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-colors border border-amber-500/20 font-medium text-sm"
          >
            <Zap size={16} />
            Simulate Load
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={triggerPipeline}
            disabled={isDeploying}
            className={`flex items-center gap-2 px-4 py-2 ${isDeploying ? 'bg-slate-800 text-slate-500' : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400'} rounded-lg transition-colors border ${isDeploying ? 'border-slate-800' : 'border-purple-500/20'} font-medium text-sm`}
          >
            {isDeploying ? <RefreshCcw size={16} className="animate-spin" /> : <Play size={16} />}
            {isDeploying ? 'Deploying...' : 'Trigger Pipeline'}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchData(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 font-medium text-sm shadow-lg"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin text-emerald-400' : ''} />
            {loading ? 'Syncing...' : 'Sync Now'}
          </motion.button>
        </div>
      </motion.header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
              icon: health?.status === 'Offline' ? <Server className="text-rose-400" size={24} /> : <ShieldCheck className="text-emerald-400" size={24} />, 
              label: "System Status", 
              value: health?.status === 'Offline' ? 'Offline' : (health?.status || 'Active'), 
              sub: `Core v${health?.version || '1.0.0'}`, 
              color: health?.status === 'Offline' ? 'rose' : 'emerald' 
          },
          { 
              icon: <Cpu className="text-blue-400" size={24} />, 
              label: "Service Uptime", 
              value: metrics?.uptime_seconds ? formatUptime(metrics.uptime_seconds) : "0s", 
              sub: health?.status === 'Offline' ? 'Disconnected' : 'Live Tracking', 
              color: "blue" 
          },
          { 
              icon: <Activity className="text-purple-400" size={24} />, 
              label: "Avg Latency", 
              value: `${metrics?.avg_latency_ms || 0}ms`, 
              sub: "Based on recent load", 
              color: "purple" 
          }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
            className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group"
          >
            <div className={`absolute -right-10 -top-10 w-32 h-32 bg-${stat.color}-500/10 rounded-full blur-3xl group-hover:bg-${stat.color}-500/20 transition-all`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner">
                {stat.icon}
              </div>
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
              <h4 className="text-3xl font-bold tracking-tight text-slate-100">{stat.value}</h4>
              <p className="text-xs text-slate-500">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Performance Chart */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2 bg-slate-900/60 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-xl shadow-2xl h-[450px] flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Cpu size={20} className="text-blue-400" /></div>
              Host Machine Hardware Load (Local)
            </h3>
            <div className="flex gap-4 text-sm font-medium">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> CPU Usage %</span>
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /> RAM Usage %</span>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172aa0', border: '1px solid #1e293b', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{color: '#e2e8f0', fontWeight: 'bold'}}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" activeDot={{r: 6, strokeWidth: 0}} />
                <Area type="monotone" dataKey="ram" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorRam)" activeDot={{r: 6, strokeWidth: 0}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Live Terminal & Info */}
        <div className="space-y-6 flex flex-col h-[450px]">
          
          {/* Live Terminal Logs */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-4 flex-1 overflow-hidden flex flex-col shadow-2xl relative font-mono text-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal size={16} />
                <span>live-server.log</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <div className="w-3 h-3 rounded-full bg-slate-700" />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {serverLogs.length > 0 ? serverLogs.map((log, id) => (
                  <div key={id} className={`mb-1 truncate ${log.includes('INFO') ? 'text-blue-300' : log.includes('ERROR') ? 'text-rose-400' : 'text-slate-300'}`}>
                    {log}
                  </div>
                )) : (
                  <div className="text-slate-500 italic mt-2">Waiting for logs...</div>
                )}
            </div>
          </motion.div>

          {/* Infrastructure Card */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 backdrop-blur-xl shrink-0"
          >
            <div className="space-y-3">
              <InfoRow label="Routing Engine" value="Flask/Gunicorn" />
              <InfoRow label="Runtime" value="Python 3.10" />
              <hr className="border-slate-800/50 my-2" />
              <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 group cursor-pointer hover:border-blue-500/50 transition-colors">
                <span className="text-slate-400 group-hover:text-blue-400 transition-colors">Target URI</span>
                <code className="text-slate-300 group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                  tcp://localhost:5000 <ExternalLink size={12} />
                </code>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* CI/CD Pipeline Visualizer */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-xl shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" 
            initial={{ width: '100%' }}
            animate={{ width: isDeploying ? `${(pipelineStage / 4) * 100}%` : '100%' }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <div className="flex justify-between items-center mb-8 mt-2">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg"><Server size={20} className="text-purple-400" /></div>
              Deployment Pipeline
            </h3>
            <span className={`text-sm px-3 py-1 rounded-full border ${isDeploying ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                {isDeploying ? 'IN PROGRESS' : 'IDLE / SUCCESS'}
            </span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 pb-4">
            <PipelineStage 
                icon={<Github size={24} />} 
                title="Source Code" 
                subtitle="GitHub Push"
                status={pipelineStage > 0 ? 'success' : pipelineStage === 0 ? 'active' : 'pending'}
                delay={0}
            />
            <Connector active={pipelineStage >= 0} />
            
            <PipelineStage 
                icon={<ShieldCheck size={24} />} 
                title="Automated Tests" 
                subtitle="Pytest Suite"
                status={pipelineStage > 1 ? 'success' : pipelineStage === 1 ? 'active' : 'pending'}
                delay={0.1}
            />
            <Connector active={pipelineStage >= 1} />

            <PipelineStage 
                icon={<Container size={24} />} 
                title="Docker Build" 
                subtitle="Containerization"
                status={pipelineStage > 2 ? 'success' : pipelineStage === 2 ? 'active' : 'pending'}
                delay={0.2}
            />
            <Connector active={pipelineStage >= 2} />

            <PipelineStage 
                icon={<Activity size={24} />} 
                title="Render Deploy" 
                subtitle="Production API"
                status={pipelineStage > 3 ? 'success' : pipelineStage === 3 ? 'active' : 'pending'}
                delay={0.3}
            />
        </div>
      </motion.div>
    </div>
  );
};

const Connector = ({ active }: { active: boolean }) => (
    <div className={`hidden md:block flex-1 h-0.5 rounded-full transition-all duration-500 ${active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`} />
);

const PipelineStage = ({ icon, title, subtitle, status, delay }: any) => {
    const isSuccess = status === 'success';
    const isActive = status === 'active';
    
    return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay }}
            className={`flex flex-col items-center min-w-[140px] p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-slate-800/80 border-blue-500/50 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]' : isSuccess ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-950/50 border-slate-800/50'}`}
        >
            <div className={`relative p-3 rounded-full mb-3 ${isActive ? 'bg-blue-500/20 text-blue-400' : isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {icon}
                <div className="absolute -top-1 -right-1 bg-slate-950 rounded-full">
                    {isSuccess ? <CheckCircle2 size={16} className="text-emerald-500" /> : isActive ? <CircleDashed size={16} className="text-blue-500 animate-spin" /> : null}
                </div>
            </div>
            <h4 className={`font-semibold text-center ${isActive ? 'text-blue-100' : isSuccess ? 'text-slate-200' : 'text-slate-500'}`}>{title}</h4>
            <p className={`text-xs text-center mt-1 ${isActive ? 'text-blue-300' : 'text-slate-500'}`}>{subtitle}</p>
        </motion.div>
    );
};

const InfoRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-400">{label}</span>
    <span className="font-semibold text-slate-200">{value}</span>
  </div>
);
