import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import WebXRLab from './pages/WebXRLab';
import Analytics from './pages/Analytics';
import Training from './pages/Training';
import Quantum from './pages/Quantum';
import Infrastructure from './pages/Infrastructure';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          }}
        ></div>
        
        <Navigation isConnected={isConnected} />
        
        <motion.main 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Routes>
            <Route path="/" element={<Dashboard setIsConnected={setIsConnected} />} />
            <Route path="/webxr" element={<WebXRLab />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/training" element={<Training />} />
            <Route path="/quantum" element={<Quantum />} />
            <Route path="/infrastructure" element={<Infrastructure />} />
          </Routes>
        </motion.main>
      </div>
    </Router>
  );
}

export default App;