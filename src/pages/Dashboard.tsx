import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Zap, 
  TrendingUp,
  Server,
  Brain,
  Atom,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import SystemStatus from '../components/SystemStatus';
import MetricsGrid from '../components/MetricsGrid';
import SimulationControls from '../components/SimulationControls';

interface DashboardProps {
  setIsConnected: (connected: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setIsConnected }) => {
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0,
    activeAgents: 0,
    trainingEpisodes: 0,
    quantumJobs: 0
  });

  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        networkLatency: Math.max(1, prev.networkLatency + (Math.random() - 0.5) * 5),
        activeAgents: Math.max(0, prev.activeAgents + Math.floor((Math.random() - 0.5) * 3)),
        trainingEpisodes: prev.trainingEpisodes + (isSimulationRunning ? Math.floor(Math.random() * 5) : 0),
        quantumJobs: Math.max(0, prev.quantumJobs + Math.floor((Math.random() - 0.5) * 2))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulationRunning]);

  useEffect(() => {
    // Simulate connection status
    const connectionTimer = setTimeout(() => {
      setIsConnected(true);
    }, 2000);

    return () => clearTimeout(connectionTimer);
  }, [setIsConnected]);

  const handleSimulationToggle = () => {
    setIsSimulationRunning(!isSimulationRunning);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-4">
          Cross-Reality Digital Twin Lab
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl">
          Advanced simulation environment combining Unity ML-Agents, reinforcement learning, 
          and quantum-inspired optimization for next-generation manufacturing intelligence.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <SystemStatus metrics={systemMetrics} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SimulationControls 
            isRunning={isSimulationRunning}
            onToggle={handleSimulationToggle}
          />
        </motion.div>
      </div>

      <MetricsGrid metrics={systemMetrics} />
    </div>
  );
};

export default Dashboard;