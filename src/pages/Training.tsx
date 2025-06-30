import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Settings, BarChart3, Brain, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Training: React.FC = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('PPO');

  const rewardData = [
    { episode: 0, reward: -50, ppo: -45, dqn: -55 },
    { episode: 100, reward: -20, ppo: -15, dqn: -25 },
    { episode: 200, reward: 10, ppo: 15, dqn: 5 },
    { episode: 300, reward: 45, ppo: 50, dqn: 40 },
    { episode: 400, reward: 75, ppo: 80, dqn: 70 },
    { episode: 500, reward: 95, ppo: 100, dqn: 90 },
  ];

  const algorithms = [
    { name: 'PPO', description: 'Proximal Policy Optimization', color: 'blue' },
    { name: 'DQN', description: 'Deep Q-Network', color: 'green' },
    { name: 'A3C', description: 'Asynchronous Actor-Critic', color: 'purple' },
    { name: 'SAC', description: 'Soft Actor-Critic', color: 'orange' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-4">RL Training Center</h1>
        <p className="text-xl text-gray-300">
          Train and optimize reinforcement learning agents using Ray RLlib
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Training Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6">Training Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Algorithm
              </label>
              <select 
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              >
                {algorithms.map((algo) => (
                  <option key={algo.name} value={algo.name} className="bg-gray-800">
                    {algo.name} - {algo.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Learning Rate
              </label>
              <input 
                type="number" 
                defaultValue={0.0003}
                step={0.0001}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Batch Size
              </label>
              <input 
                type="number" 
                defaultValue={64}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Episodes
              </label>
              <input 
                type="number" 
                defaultValue={1000}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsTraining(!isTraining)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                  isTraining 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isTraining ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isTraining ? 'Stop' : 'Start'}</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Square className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Training Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6">Training Progress</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">247</div>
              <div className="text-sm text-gray-300">Current Episode</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">85.2</div>
              <div className="text-sm text-gray-300">Avg Reward</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">0.032</div>
              <div className="text-sm text-gray-300">Loss</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rewardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="episode" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }} 
              />
              <Line type="monotone" dataKey="ppo" stroke="#3b82f6" strokeWidth={3} name="PPO" />
              <Line type="monotone" dataKey="dqn" stroke="#10b981" strokeWidth={3} name="DQN" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Agent Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Active Agents</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((agent) => (
            <div key={agent} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Agent {agent}</span>
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Reward:</span>
                  <span className="text-green-400">{(Math.random() * 100).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Steps:</span>
                  <span className="text-blue-400">{Math.floor(Math.random() * 1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className={`${isTraining ? 'text-green-400' : 'text-gray-400'}`}>
                    {isTraining ? 'Training' : 'Idle'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Training;