import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Brain, Atom, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

interface MetricsGridProps {
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    activeAgents: number;
    trainingEpisodes: number;
    quantumJobs: number;
  };
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Production Efficiency',
      value: '94.2%',
      change: '+5.8%',
      icon: TrendingUp,
      color: 'from-green-500/20 to-emerald-600/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      isPositive: true
    },
    {
      title: 'Active ML Agents',
      value: metrics.activeAgents.toString(),
      change: 'Training',
      icon: Brain,
      color: 'from-blue-500/20 to-cyan-600/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      isPositive: true
    },
    {
      title: 'Training Episodes',
      value: metrics.trainingEpisodes.toString(),
      change: 'Completed',
      icon: Zap,
      color: 'from-purple-500/20 to-indigo-600/20',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400',
      isPositive: true
    },
    {
      title: 'Quantum Jobs',
      value: metrics.quantumJobs.toString(),
      change: 'Running',
      icon: Atom,
      color: 'from-pink-500/20 to-rose-600/20',
      borderColor: 'border-pink-500/30',
      textColor: 'text-pink-400',
      isPositive: true
    },
    {
      title: 'System Health',
      value: 'Optimal',
      change: 'All systems',
      icon: CheckCircle,
      color: 'from-emerald-500/20 to-green-600/20',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      isPositive: true
    },
    {
      title: 'Network Latency',
      value: `${metrics.networkLatency.toFixed(0)}ms`,
      change: 'Stable',
      icon: AlertTriangle,
      color: metrics.networkLatency > 100 ? 'from-yellow-500/20 to-orange-600/20' : 'from-green-500/20 to-emerald-600/20',
      borderColor: metrics.networkLatency > 100 ? 'border-yellow-500/30' : 'border-green-500/30',
      textColor: metrics.networkLatency > 100 ? 'text-yellow-400' : 'text-green-400',
      isPositive: metrics.networkLatency <= 100
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {metricCards.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className={`bg-gradient-to-br ${metric.color} backdrop-blur-xl border ${metric.borderColor} rounded-2xl p-6 hover:shadow-xl transition-all duration-300`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} border ${metric.borderColor} flex items-center justify-center`}>
              <metric.icon className={`w-6 h-6 ${metric.textColor}`} />
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${metric.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {metric.change}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-3xl font-bold text-white">
              {metric.value}
            </div>
            <div className="text-sm text-gray-300">
              {metric.title}
            </div>
          </div>

          {/* Animated accent line */}
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: index * 0.2 + 0.5, duration: 1 }}
              className={`h-full bg-gradient-to-r ${metric.textColor === 'text-green-400' ? 'from-green-400 to-emerald-500' :
                metric.textColor === 'text-blue-400' ? 'from-blue-400 to-cyan-500' :
                metric.textColor === 'text-purple-400' ? 'from-purple-400 to-indigo-500' :
                metric.textColor === 'text-pink-400' ? 'from-pink-400 to-rose-500' :
                metric.textColor === 'text-emerald-400' ? 'from-emerald-400 to-green-500' :
                'from-yellow-400 to-orange-500'
              }`}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MetricsGrid;