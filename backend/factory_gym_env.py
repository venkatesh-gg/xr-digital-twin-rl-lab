import gym
from gym import spaces
import numpy as np
import socket
import json
import threading
import time
from typing import Dict, Any, Tuple
import logging

class FactoryEnv(gym.Env):
    """
    Custom Gym environment for Unity ML-Agents Factory simulation.
    Connects to Unity via TCP socket for real-time communication.
    """
    
    metadata = {'render.modes': ['human', 'rgb_array']}
    
    def __init__(self, 
                 unity_host='localhost', 
                 unity_port=9000,
                 max_steps=1000,
                 num_agents=4):
        super(FactoryEnv, self).__init__()
        
        self.unity_host = unity_host
        self.unity_port = unity_port
        self.max_steps = max_steps
        self.num_agents = num_agents
        self.current_step = 0
        
        # Connection to Unity
        self.socket = None
        self.connected = False
        
        # Define action and observation spaces
        # Action space: [move_x, move_z, rotation, task_action] for each agent
        self.action_space = spaces.Box(
            low=np.array([-1, -1, -1, 0] * num_agents, dtype=np.float32),
            high=np.array([1, 1, 1, 4] * num_agents, dtype=np.float32),
            shape=(4 * num_agents,),
            dtype=np.float32
        )
        
        # Observation space: agent positions, factory state, efficiency metrics
        # [agent_pos(3), agent_rot(4), distances_to_stations(5), task_state(2), 
        #  factory_metrics(3), conveyor_states(3)] per agent
        obs_size_per_agent = 3 + 4 + 5 + 2 + 3 + 3  # 20 values per agent
        self.observation_space = spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(obs_size_per_agent * num_agents,),
            dtype=np.float32
        )
        
        # Environment state
        self.state = None
        self.last_metrics = None
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
    def connect_to_unity(self) -> bool:
        """Establish connection to Unity simulation."""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.unity_host, self.unity_port))
            self.connected = True
            self.logger.info(f"Connected to Unity at {self.unity_host}:{self.unity_port}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to Unity: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Close connection to Unity."""
        if self.socket:
            self.socket.close()
            self.connected = False
            self.logger.info("Disconnected from Unity")
    
    def send_to_unity(self, data: Dict[str, Any]) -> bool:
        """Send data to Unity simulation."""
        if not self.connected:
            if not self.connect_to_unity():
                return False
        
        try:
            message = json.dumps(data) + '\n'
            self.socket.send(message.encode())
            return True
        except Exception as e:
            self.logger.error(f"Failed to send data to Unity: {e}")
            self.connected = False
            return False
    
    def receive_from_unity(self) -> Dict[str, Any]:
        """Receive data from Unity simulation."""
        if not self.connected:
            return {}
        
        try:
            response = self.socket.recv(4096).decode()
            if response:
                return json.loads(response.strip())
        except Exception as e:
            self.logger.error(f"Failed to receive data from Unity: {e}")
            self.connected = False
        
        return {}
    
    def reset(self) -> np.ndarray:
        """Reset the environment and return initial observation."""
        self.current_step = 0
        
        # Send reset command to Unity
        reset_command = {
            'command': 'reset',
            'num_agents': self.num_agents,
            'max_steps': self.max_steps
        }
        
        if self.send_to_unity(reset_command):
            # Wait for initial state
            response = self.receive_from_unity()
            if response and 'state' in response:
                self.state = response['state']
                return self._extract_observations()
        
        # Fallback: return random initial state
        self.logger.warning("Using fallback random initial state")
        return self._generate_random_observation()
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, Dict]:
        """Execute one step in the environment."""
        self.current_step += 1
        
        # Send action to Unity
        action_command = {
            'command': 'step',
            'actions': action.tolist(),
            'step': self.current_step
        }
        
        reward = 0.0
        done = False
        info = {}
        
        if self.send_to_unity(action_command):
            # Receive updated state and reward
            response = self.receive_from_unity()
            if response:
                self.state = response.get('state', self.state)
                reward = response.get('reward', 0.0)
                done = response.get('done', False)
                info = response.get('info', {})
                self.last_metrics = response.get('metrics', {})
        
        # Check termination conditions
        if self.current_step >= self.max_steps:
            done = True
        
        # Extract observations
        obs = self._extract_observations()
        
        # Add step info
        info.update({
            'step': self.current_step,
            'efficiency': self.last_metrics.get('efficiency', 0) if self.last_metrics else 0,
            'products_completed': self.last_metrics.get('totalProductsCompleted', 0) if self.last_metrics else 0
        })
        
        return obs, reward, done, info
    
    def _extract_observations(self) -> np.ndarray:
        """Extract observations from current state."""
        if not self.state:
            return self._generate_random_observation()
        
        observations = []
        
        for agent_id in range(self.num_agents):
            agent_key = f'agent_{agent_id}'
            
            if agent_key in self.state:
                agent_data = self.state[agent_key]
                
                # Agent position (3)
                pos = agent_data.get('position', [0, 0, 0])
                observations.extend(pos)
                
                # Agent rotation (4) - quaternion
                rot = agent_data.get('rotation', [0, 0, 0, 1])
                observations.extend(rot)
                
                # Distances to stations (5)
                distances = agent_data.get('station_distances', [0] * 5)
                observations.extend(distances)
                
                # Task state (2)
                task_state = [
                    agent_data.get('current_task', 0) / 5.0,  # Normalized
                    1.0 if agent_data.get('carrying_product', False) else 0.0
                ]
                observations.extend(task_state)
                
                # Factory metrics (3)
                metrics = [
                    agent_data.get('efficiency_score', 0) / 100.0,
                    agent_data.get('products_completed', 0) / 100.0,
                    self.current_step / self.max_steps
                ]
                observations.extend(metrics)
                
                # Conveyor states (3)
                conveyor_states = agent_data.get('conveyor_states', [0] * 3)
                observations.extend(conveyor_states)
            else:
                # Default observation for missing agent
                observations.extend([0] * 20)
        
        return np.array(observations, dtype=np.float32)
    
    def _generate_random_observation(self) -> np.ndarray:
        """Generate random observation when Unity is not available."""
        return np.random.random(self.observation_space.shape).astype(np.float32)
    
    def render(self, mode='human'):
        """Render the environment."""
        if mode == 'human':
            if self.last_metrics:
                print(f"Step: {self.current_step}")
                print(f"Efficiency: {self.last_metrics.get('efficiency', 0):.2f}%")
                print(f"Products Completed: {self.last_metrics.get('totalProductsCompleted', 0)}")
                print(f"Active Agents: {self.last_metrics.get('activeAgents', 0)}")
                print("-" * 40)
        elif mode == 'rgb_array':
            # Return a placeholder image
            return np.zeros((480, 640, 3), dtype=np.uint8)
    
    def close(self):
        """Close the environment."""
        self.disconnect()
    
    def seed(self, seed=None):
        """Set random seed."""
        np.random.seed(seed)
        return [seed]
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current environment metrics."""
        return self.last_metrics or {}


# Register the environment
gym.register(
    id='FactoryEnv-v0',
    entry_point='factory_gym_env:FactoryEnv',
    max_episode_steps=1000,
    kwargs={'max_steps': 1000, 'num_agents': 4}
)


if __name__ == "__main__":
    # Test the environment
    env = FactoryEnv()
    
    print("Testing FactoryEnv...")
    print(f"Action space: {env.action_space}")
    print(f"Observation space: {env.observation_space}")
    
    # Run a test episode
    obs = env.reset()
    print(f"Initial observation shape: {obs.shape}")
    
    for step in range(10):
        action = env.action_space.sample()
        obs, reward, done, info = env.step(action)
        env.render()
        
        if done:
            break
    
    env.close()
    print("Test completed.")