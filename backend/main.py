from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from datetime import datetime
from typing import Dict, List, Any
import json
import asyncio
import os

from factory_gym_env import FactoryEnv
from ray_trainer import FactoryTrainer
from quantum_optimizer import QuantumFactoryScheduler
from spark_streaming import FactoryAnalyticsProcessor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Factory Digital Twin API",
    description="API for Cross-Reality Digital Twin & Reinforcement Learning Lab",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
training_jobs = {}
simulation_status = {"running": False, "agents": 0}
quantum_jobs = {}

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting Factory Digital Twin API...")
    
    # Initialize Ray if not already running
    import ray
    if not ray.is_initialized():
        ray.init(ignore_reinit_error=True)
    
    logger.info("Factory Digital Twin API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down Factory Digital Twin API...")
    
    import ray
    if ray.is_initialized():
        ray.shutdown()

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Factory Digital Twin API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "running",
            "simulation": "running" if simulation_status["running"] else "stopped",
            "training_jobs": len(training_jobs),
            "quantum_jobs": len(quantum_jobs)
        }
    }

# Simulation endpoints
@app.post("/simulation/start")
async def start_simulation(background_tasks: BackgroundTasks):
    """Start the Unity simulation."""
    if simulation_status["running"]:
        raise HTTPException(status_code=400, detail="Simulation is already running")
    
    background_tasks.add_task(run_simulation)
    simulation_status["running"] = True
    simulation_status["agents"] = 4
    
    return {"message": "Simulation started", "status": simulation_status}

@app.post("/simulation/stop")
async def stop_simulation():
    """Stop the Unity simulation."""
    simulation_status["running"] = False
    simulation_status["agents"] = 0
    
    return {"message": "Simulation stopped", "status": simulation_status}

@app.get("/simulation/status")
async def get_simulation_status():
    """Get current simulation status."""
    return {"status": simulation_status}

@app.get("/simulation/metrics")
async def get_simulation_metrics():
    """Get current simulation metrics."""
    # In a real implementation, this would connect to the Unity simulation
    # and retrieve actual metrics
    return {
        "efficiency": 94.2,
        "throughput": 847,
        "products_completed": 156,
        "active_agents": simulation_status["agents"],
        "timestamp": datetime.now().isoformat()
    }

# Training endpoints
@app.post("/training/start")
async def start_training(
    algorithm: str = "PPO",
    num_workers: int = 4,
    iterations: int = 1000,
    background_tasks: BackgroundTasks = None
):
    """Start RL training."""
    job_id = f"training_{len(training_jobs) + 1}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    training_jobs[job_id] = {
        "status": "starting",
        "algorithm": algorithm,
        "num_workers": num_workers,
        "iterations": iterations,
        "start_time": datetime.now().isoformat(),
        "current_iteration": 0,
        "best_reward": 0
    }
    
    background_tasks.add_task(run_training, job_id, algorithm, num_workers, iterations)
    
    return {"job_id": job_id, "status": "started"}

@app.get("/training/jobs")
async def get_training_jobs():
    """Get all training jobs."""
    return {"jobs": training_jobs}

@app.get("/training/jobs/{job_id}")
async def get_training_job(job_id: str):
    """Get specific training job status."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"job": training_jobs[job_id]}

@app.delete("/training/jobs/{job_id}")
async def stop_training_job(job_id: str):
    """Stop a training job."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    training_jobs[job_id]["status"] = "stopped"
    return {"message": f"Training job {job_id} stopped"}

# Quantum optimization endpoints
@app.post("/quantum/optimize")
async def start_quantum_optimization(
    num_tasks: int = 8,
    num_machines: int = 4,
    time_slots: int = 10,
    background_tasks: BackgroundTasks = None
):
    """Start quantum optimization."""
    job_id = f"quantum_{len(quantum_jobs) + 1}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    quantum_jobs[job_id] = {
        "status": "starting",
        "num_tasks": num_tasks,
        "num_machines": num_machines,
        "time_slots": time_slots,
        "start_time": datetime.now().isoformat(),
        "result": None
    }
    
    background_tasks.add_task(run_quantum_optimization, job_id, num_tasks, num_machines, time_slots)
    
    return {"job_id": job_id, "status": "started"}

@app.get("/quantum/jobs")
async def get_quantum_jobs():
    """Get all quantum optimization jobs."""
    return {"jobs": quantum_jobs}

@app.get("/quantum/jobs/{job_id}")
async def get_quantum_job(job_id: str):
    """Get specific quantum job status."""
    if job_id not in quantum_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"job": quantum_jobs[job_id]}

# Analytics endpoints
@app.get("/analytics/metrics")
async def get_analytics_metrics(
    start_time: str = None,
    end_time: str = None,
    agent_id: int = None
):
    """Get analytics metrics."""
    # In a real implementation, this would query Cassandra
    # for historical metrics data
    return {
        "efficiency_trend": [
            {"time": "1h ago", "efficiency": 92.1},
            {"time": "2h ago", "efficiency": 88.7},
            {"time": "3h ago", "efficiency": 91.3},
        ],
        "throughput_trend": [
            {"time": "1h ago", "throughput": 845},
            {"time": "2h ago", "throughput": 823},
            {"time": "3h ago", "throughput": 867},
        ],
        "anomalies": [
            {
                "id": 1,
                "type": "Low Efficiency",
                "station": "Assembly A",
                "severity": "Medium",
                "time": "15 min ago"
            }
        ]
    }

@app.get("/analytics/anomalies")
async def get_anomalies(limit: int = 100):
    """Get detected anomalies."""
    # In a real implementation, this would query Cassandra
    return {
        "anomalies": [
            {
                "id": 1,
                "timestamp": datetime.now().isoformat(),
                "type": "performance",
                "severity": "medium",
                "station": "Assembly A",
                "description": "Efficiency dropped below 70%",
                "metrics": {"efficiency": 0.65, "throughput": 45}
            }
        ]
    }

# Infrastructure endpoints
@app.get("/infrastructure/status")
async def get_infrastructure_status():
    """Get infrastructure status."""
    return {
        "clusters": {
            "production": {
                "status": "healthy",
                "nodes": 8,
                "cpu_usage": 45,
                "memory_usage": 62,
                "pods": 124
            }
        },
        "services": [
            {"name": "Unity Simulation", "status": "running", "replicas": "3/3"},
            {"name": "RL Training API", "status": "running", "replicas": "2/2"},
            {"name": "WebXR Server", "status": "running", "replicas": "4/4"},
        ]
    }

# WebSocket endpoints would go here for real-time communication
# with Unity simulation

# Background task functions
async def run_simulation():
    """Background task to run simulation."""
    logger.info("Starting simulation background task...")
    # In a real implementation, this would manage the Unity simulation
    await asyncio.sleep(1)  # Placeholder

async def run_training(job_id: str, algorithm: str, num_workers: int, iterations: int):
    """Background task to run RL training."""
    logger.info(f"Starting training job {job_id}...")
    
    try:
        training_jobs[job_id]["status"] = "running"
        
        # Create trainer
        trainer = FactoryTrainer(
            algorithm=algorithm,
            num_workers=num_workers,
            training_iterations=iterations,
            use_wandb=False  # Disable for API usage
        )
        
        # Run training (this would be async in a real implementation)
        # For now, simulate training progress
        for i in range(iterations):
            if training_jobs[job_id]["status"] == "stopped":
                break
                
            training_jobs[job_id]["current_iteration"] = i + 1
            training_jobs[job_id]["best_reward"] = 85.2 + (i / iterations) * 10
            
            await asyncio.sleep(0.1)  # Simulate training time
        
        training_jobs[job_id]["status"] = "completed"
        training_jobs[job_id]["end_time"] = datetime.now().isoformat()
        
    except Exception as e:
        logger.error(f"Training job {job_id} failed: {e}")
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["error"] = str(e)

async def run_quantum_optimization(job_id: str, num_tasks: int, num_machines: int, time_slots: int):
    """Background task to run quantum optimization."""
    logger.info(f"Starting quantum optimization job {job_id}...")
    
    try:
        quantum_jobs[job_id]["status"] = "running"
        
        # Create quantum scheduler
        scheduler = QuantumFactoryScheduler(
            num_tasks=num_tasks,
            num_machines=num_machines,
            time_slots=time_slots
        )
        
        # Run optimization
        result = scheduler.run_optimization_comparison()
        
        quantum_jobs[job_id]["status"] = "completed"
        quantum_jobs[job_id]["result"] = {
            "quantum_efficiency": result["quantum"]["metrics"]["efficiency"],
            "classical_efficiency": result["classical"]["metrics"]["efficiency"],
            "improvement": result["comparison"]["efficiency_improvement"]
        }
        quantum_jobs[job_id]["end_time"] = datetime.now().isoformat()
        
    except Exception as e:
        logger.error(f"Quantum job {job_id} failed: {e}")
        quantum_jobs[job_id]["status"] = "failed"
        quantum_jobs[job_id]["error"] = str(e)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )