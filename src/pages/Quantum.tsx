import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Atom, Play, Download, Settings, Zap } from 'lucide-react';

const Quantum: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [qubits, setQubits] = useState(4);
  const [iterations, setIterations] = useState(100);

  const quantumResults = {
    optimalSchedule: [
      { task: 'Assembly A → B', time: '08:00-10:30', efficiency: 0.92 },
      { task: 'Quality Check', time: '10:30-11:45', efficiency: 0.88 },
      { task: 'Packaging', time: '11:45-14:00', efficiency: 0.95 },
      { task: 'Logistics', time: '14:00-16:30', efficiency: 0.89 },
    ],
    classicalComparison: {
      quantum: 0.91,
      classical: 0.78,
      improvement: 16.7
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <Atom className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Quantum Optimization</h1>
            <p className="text-xl text-gray-300">Quantum-inspired scheduling optimization using Qiskit</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Quantum Circuit Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6">Circuit Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Qubits
              </label>
              <input 
                type="range"
                min="2"
                max="8"
                value={qubits}
                onChange={(e) => setQubits(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="text-center mt-2 text-white font-medium">{qubits}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Iterations
              </label>
              <input 
                type="number" 
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Algorithm
              </label>
              <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500">
                <option value="qaoa" className="bg-gray-800">QAOA</option>
                <option value="vqe" className="bg-gray-800">VQE</option>
                <option value="qasm" className="bg-gray-800">QASM Simulator</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                isRunning 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
              }`}
            >
              <Play className="w-5 h-5" />
              <span>{isRunning ? 'Stop Optimization' : 'Run Quantum Circuit'}</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Quantum Circuit Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6">Quantum Circuit</h3>
          
          <div className="bg-black/30 rounded-lg p-6 font-mono text-sm">
            <div className="text-green-400 mb-4">// Quantum Circuit for Factory Scheduling Optimization</div>
            <div className="space-y-2 text-gray-300">
              <div>qc = QuantumCircuit({qubits}, {qubits})</div>
              <div className="ml-4">
                {Array.from({length: qubits}, (_, i) => (
                  <div key={i}>qc.h({i})  # Hadamard gate on qubit {i}</div>
                ))}
              </div>
              <div>qc.barrier()</div>
              <div className="ml-4">
                {Array.from({length: qubits - 1}, (_, i) => (
                  <div key={i}>qc.cx({i}, {i+1})  # CNOT gate</div>
                ))}
              </div>
              <div>qc.measure_all()</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{qubits}</div>
              <div className="text-sm text-gray-300">Qubits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">{iterations}</div>
              <div className="text-sm text-gray-300">Iterations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {isRunning ? 'Running' : 'Ready'}
              </div>
              <div className="text-sm text-gray-300">Status</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Optimization Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6">Optimal Schedule</h3>
          
          <div className="space-y-4">
            {quantumResults.optimalSchedule.map((task, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-medium">{task.task}</span>
                  <span className="text-sm text-gray-400">{task.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      style={{ width: `${task.efficiency * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-purple-400 font-medium">
                    {(task.efficiency * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6">Performance Comparison</h3>
          
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                +{quantumResults.classicalComparison.improvement}%
              </div>
              <div className="text-gray-300">Improvement over Classical</div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Quantum Algorithm</span>
                  <span className="text-purple-400 font-medium">
                    {(quantumResults.classicalComparison.quantum * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                    style={{ width: `${quantumResults.classicalComparison.quantum * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Classical Algorithm</span>
                  <span className="text-blue-400 font-medium">
                    {(quantumResults.classicalComparison.classical * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${quantumResults.classicalComparison.classical * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Results</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Quantum;