import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface MetricData {
  time: string;
  efficiency: number;
  throughput: number;
  anomalies: number;
  reward: number;
}

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [data, setData] = useState<MetricData[]>([]);
  const [anomalies, setAnomalies] = useState([
    { id: 1, type: 'High Temperature', station: 'Assembly A', severity: 'High', time: '2 min ago' },
    { id: 2, type: 'Low Efficiency', station: 'Quality Control', severity: 'Medium', time: '15 min ago' },
    { id: 3, type: 'Agent Convergence', station: 'Packaging', severity: 'Low', time: '32 min ago' },
  ]);

  const performanceData = [
    { name: 'Assembly A', value: 95.2, color: '#10b981' },
    { name: 'Quality Control', value: 88.7, color: '#f59e0b' },
    { name: 'Packaging', value: 92.1, color: '#8b5cf6' },
    { name: 'Logistics', value: 96.8, color: '#06b6d4' },
  ];

  useEffect(() => {
    // Generate mock time series data
    const generateData = () => {
      const newData = [];
      for (let i = 23; i >= 0; i--) {
        newData.push({
          time: `${i}h ago`,
          efficiency: 85 + Math.random() * 15,
          throughput: 800 + Math.random() * 200,
          anomalies: Math.floor(Math.random() * 8),
          reward: Math.random() * 100
        });
      }
      setData(newData);
    };

    generateData();
    const interval = setInterval(generateData, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-white">Analytics Dashboard</h1>
          <div className="flex space-x-2">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-sm text-green-300">+5.2%</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">94.2%</div>
            <div className="text-sm text-gray-300">Overall Efficiency</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <span className="text-sm text-blue-300">+12.8%</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">847</div>
            <div className="text-sm text-gray-300">Units/Hour</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-500/20 to-pink-600/20 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span className="text-sm text-red-300">-2 today</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">3</div>
            <div className="text-sm text-gray-300">Active Anomalies</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-purple-400" />
              <span className="text-sm text-purple-300">Real-time</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">12</div>
            <div className="text-sm text-gray-300">Active Agents</div>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Efficiency Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-4">Efficiency Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Station Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-4">Station Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Anomalies Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Recent Anomalies</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 text-gray-300">Station</th>
                  <th className="text-left py-3 px-4 text-gray-300">Severity</th>
                  <th className="text-left py-3 px-4 text-gray-300">Time</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((anomaly) => (
                  <tr key={anomaly.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{anomaly.type}</td>
                    <td className="py-3 px-4 text-gray-300">{anomaly.station}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        anomaly.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                        anomaly.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{anomaly.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Analytics;