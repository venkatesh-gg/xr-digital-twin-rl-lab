import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings, 
  Zap,
  Brain,
  Activity
} from 'lucide-react';

interface SimulationControlsProps {
  isRunning: boolean;
  onToggle: () => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({ isRunning, onToggle }) => {
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 5, label: '5x' }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Zap className="w-6 h-6 text-yellow-400" />
        <h3 className="text-xl font-bold text-white">Simulation Controls</h3>
      </div>

      {/* Main Controls */}
      <div className="space-y-4 mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
            isRunning 
              ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg' 
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              <span>Pause Simulation</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Start Simulation</span>
            </>
          )}
        </motion.button>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </motion.button>
        </div>
      </div>

      {/* Speed Control */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 font-medium">Simulation Speed</span>
          <span className="text-white font-bold">{speed}x</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {speedOptions.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSpeed(option.value)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                speed === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-gray-300 text-sm">Simulation Status</span>
          </div>
          <span className={`text-sm font-medium ${isRunning ? 'text-green-400' : 'text-gray-400'}`}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300 text-sm">ML Training</span>
          </div>
          <span className={`text-sm font-medium ${isRunning ? 'text-blue-400' : 'text-gray-400'}`}>
            {isRunning ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Settings Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowSettings(!showSettings)}
        className="w-full mt-6 flex items-center justify-center space-x-2 py-3 px-4 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors border border-white/10"
      >
        <Settings className="w-4 h-4" />
        <span>Advanced Settings</span>
      </motion.button>

      {/* Advanced Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10"
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Workers</span>
              <input type="number" defaultValue={4} className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Episodes</span>
              <input type="number" defaultValue={1000} className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Learning Rate</span>
              <input type="number" defaultValue={0.0003} step={0.0001} className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-white" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SimulationControls;