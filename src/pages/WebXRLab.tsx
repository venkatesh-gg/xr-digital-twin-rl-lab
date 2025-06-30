import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Text, Box } from '@react-three/drei';
import { motion } from 'framer-motion';
import { VRButton, XR } from '@react-three/xr';
import { 
  Maximize, 
  Settings, 
  Pause, 
  Play, 
  RotateCcw,
  Eye,
  EyeOff 
} from 'lucide-react';

const FactoryScene: React.FC = () => {
  return (
    <group>
      <Grid 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#60a5fa" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#3b82f6"
      />
      
      {/* Factory Floor Elements */}
      <Box position={[-5, 0.5, -5]} args={[2, 1, 2]}>
        <meshStandardMaterial color="#ef4444" />
      </Box>
      <Text
        position={[-5, 2, -5]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Assembly Station A
      </Text>

      <Box position={[5, 0.5, -5]} args={[2, 1, 2]}>
        <meshStandardMaterial color="#10b981" />
      </Box>
      <Text
        position={[5, 2, -5]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Quality Control
      </Text>

      <Box position={[0, 0.5, 5]} args={[3, 1, 1.5]}>
        <meshStandardMaterial color="#8b5cf6" />
      </Box>
      <Text
        position={[0, 2, 5]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Packaging Unit
      </Text>

      {/* Conveyor Belt */}
      <Box position={[0, 0.1, 0]} args={[8, 0.2, 1]}>
        <meshStandardMaterial color="#6b7280" />
      </Box>
    </group>
  );
};

const WebXRLab: React.FC = () => {
  const [isVRMode, setIsVRMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [simulationPaused, setSimulationPaused] = useState(false);

  return (
    <div className="h-screen relative">
      {/* WebXR Controls Overlay */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start"
        >
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Factory Digital Twin</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-300">Active Agents</div>
                <div className="text-2xl font-bold text-blue-400">12</div>
              </div>
              <div>
                <div className="text-gray-300">Efficiency</div>
                <div className="text-2xl font-bold text-green-400">94.2%</div>
              </div>
              <div>
                <div className="text-gray-300">Throughput</div>
                <div className="text-2xl font-bold text-purple-400">847/hr</div>
              </div>
              <div>
                <div className="text-gray-300">Anomalies</div>
                <div className="text-2xl font-bold text-red-400">3</div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSimulationPaused(!simulationPaused)}
              className="bg-black/30 backdrop-blur-md rounded-lg p-3 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              {simulationPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowControls(!showControls)}
              className="bg-black/30 backdrop-blur-md rounded-lg p-3 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              {showControls ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-black/30 backdrop-blur-md rounded-lg p-3 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* VR Button - positioned outside Canvas */}
      <VRButton />

      {/* 3D Scene with Canvas and XR */}
      <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
        <XR>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight 
              position={[10, 10, 10]} 
              intensity={1} 
              castShadow 
              shadow-mapSize={2048}
            />
            <pointLight position={[0, 5, 0]} intensity={0.5} />
            
            <FactoryScene />
            
            <Environment preset="warehouse" />
            <OrbitControls 
              enablePan={true} 
              enableZoom={true} 
              enableRotate={true}
              maxPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
};

export default WebXRLab;