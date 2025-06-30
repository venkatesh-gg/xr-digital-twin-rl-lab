import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Zap, Server, Database, Wifi } from 'lucide-react';

interface SystemStatusProps {
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    activeAgents: number;
    trainingEpisodes: number;
    quantumJobs: number;
  };
}

const SystemStatus: React.FC<SystemStatusProps> = ({ metrics }) => {
  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'text-green-400';
    if (value <= thresholds[1]) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'from-green-500 to-emerald-600';
    if (value <= thresholds[1]) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Activity className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold text-white">System Status</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU Usage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300">CPU Usage</span>
            </div>
            <span className={`font-bold ${getStatusColor(metrics.cpuUsage, [70, 85])}`}>
              {metrics.cpuUsage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(metrics.cpuUsage, [70, 85])}`}
              style={{ width: `${Math.min(metrics.cpuUsage, 100)}%` }}
            ></div>
          </div>
        </motion.div>

        {/* Memory Usage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300">Memory</span>
            </div>
            <span className={`font-bold ${getStatusColor(metrics.memoryUsage, [75, 90])}`}>
              {metrics.memoryUsage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(metrics.memoryUsage, [75, 90])}`}
              style={{ width: `${Math.min(metrics.memoryUsage, 100)}%` }}
            ></div>
          </div>
        </motion.div>

        {/* Network Latency */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-green-400" />
              <span className="text-gray-300">Latency</span>
            </div>
            <span className={`font-bold ${getStatusColor(metrics.networkLatency, [50, 100])}`}>
              {metrics.networkLatency.toFixed(0)}ms
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(metrics.networkLatency, [50, 100])}`}
              style={{ width: `${Math.min(metrics.networkLatency / 2, 100)}%` }}
            ></div>
          </div>
        </motion.div>

        {/* Active Agents */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-300">Agents</span>
            </div>
            <span className="font-bold text-cyan-400">
              {metrics.activeAgents}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Server className="w-4 h-4" />
            <span>Episodes: {metrics.trainingEpisodes}</span>
            <span>•</span>
            <span>Quantum: {metrics.quantumJobs}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SystemStatus;