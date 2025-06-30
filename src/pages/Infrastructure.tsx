import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  Database, 
  Cloud, 
  Monitor, 
  Shield, 
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity
} from 'lucide-react';

const Infrastructure: React.FC = () => {
  const [selectedCluster, setSelectedCluster] = useState('production');

  const clusterStatus = {
    production: {
      name: 'Production Cluster',
      region: 'us-central1',
      nodes: 8,
      status: 'healthy',
      cpu: 45,
      memory: 62,
      pods: 124
    },
    staging: {
      name: 'Staging Cluster',
      region: 'us-west1',
      nodes: 4,
      status: 'healthy',
      cpu: 23,
      memory: 38,
      pods: 67
    },
    development: {
      name: 'Development Cluster',
      region: 'us-east1',
      nodes: 2,
      status: 'warning',
      cpu: 78,
      memory: 85,
      pods: 45
    }
  };

  const services = [
    { name: 'Unity Simulation', status: 'running', replicas: '3/3', cpu: 45, memory: 67 },
    { name: 'RL Training API', status: 'running', replicas: '2/2', cpu: 32, memory: 54 },
    { name: 'WebXR Server', status: 'running', replicas: '4/4', cpu: 28, memory: 41 },
    { name: 'Analytics Pipeline', status: 'running', replicas: '2/2', cpu: 56, memory: 73 },
    { name: 'Quantum Scheduler', status: 'warning', replicas: '1/2', cpu: 89, memory: 92 },
    { name: 'Kafka Cluster', status: 'running', replicas: '3/3', cpu: 41, memory: 58 },
  ];

  const infrastructure = [
    { name: 'GKE Cluster', status: 'healthy', cost: '$1,247/mo', icon: Server },
    { name: 'Cassandra DB', status: 'healthy', cost: '$892/mo', icon: Database },
    { name: 'Kafka (Confluent)', status: 'healthy', cost: '$456/mo', icon: Zap },
    { name: 'ELK Stack', status: 'warning', cost: '$234/mo', icon: Monitor },
    { name: 'Load Balancers', status: 'healthy', cost: '$123/mo', icon: Shield },
    { name: 'Storage (GCS)', status: 'healthy', cost: '$89/mo', icon: Cloud },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-4">Infrastructure Overview</h1>
        <p className="text-xl text-gray-300">
          Monitor and manage your cloud infrastructure, Kubernetes clusters, and services
        </p>
      </motion.div>

      {/* Cluster Selection */}
      <div className="flex space-x-4 mb-8">
        {Object.entries(clusterStatus).map(([key, cluster]) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedCluster(key)}
            className={`flex-1 p-4 rounded-xl border transition-all ${
              selectedCluster === key
                ? 'bg-blue-600/20 border-blue-500 text-white'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{cluster.name}</span>
              <div className={`w-3 h-3 rounded-full ${
                cluster.status === 'healthy' ? 'bg-green-400' :
                cluster.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
            </div>
            <div className="text-sm opacity-75">{cluster.region}</div>
          </motion.button>
        ))}
      </div>

      {/* Cluster Details */}
      <motion.div
        key={selectedCluster}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Server className="w-8 h-8 text-blue-400" />
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {clusterStatus[selectedCluster as keyof typeof clusterStatus].nodes}
          </div>
          <div className="text-sm text-gray-300">Active Nodes</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-green-400" />
            <span className="text-sm text-green-300">Normal</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {clusterStatus[selectedCluster as keyof typeof clusterStatus].cpu}%
          </div>
          <div className="text-sm text-gray-300">CPU Usage</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-purple-400" />
            <span className="text-sm text-yellow-300">High</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {clusterStatus[selectedCluster as keyof typeof clusterStatus].memory}%
          </div>
          <div className="text-sm text-gray-300">Memory Usage</div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8 text-cyan-400" />
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {clusterStatus[selectedCluster as keyof typeof clusterStatus].pods}
          </div>
          <div className="text-sm text-gray-300">Running Pods</div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Services Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Activity className="w-6 h-6" />
            <span>Service Status</span>
          </h3>
          
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'running' ? 'bg-green-400' :
                      service.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-white font-medium">{service.name}</span>
                  </div>
                  <span className="text-sm text-gray-400">{service.replicas}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-300 mb-1">CPU</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            service.cpu > 80 ? 'bg-red-400' :
                            service.cpu > 60 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${service.cpu}%` }}
                        ></div>
                      </div>
                      <span className="text-white">{service.cpu}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-300 mb-1">Memory</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            service.memory > 80 ? 'bg-red-400' :
                            service.memory > 60 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${service.memory}%` }}
                        ></div>
                      </div>
                      <span className="text-white">{service.memory}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Infrastructure Costs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Cloud className="w-6 h-6" />
            <span>Infrastructure Costs</span>
          </h3>
          
          <div className="space-y-4">
            {infrastructure.map((item, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-6 h-6 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-sm text-gray-400">{item.cost}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {item.status === 'healthy' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : item.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Monthly Cost</span>
              <span className="text-2xl font-bold text-white">$3,041</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Infrastructure;