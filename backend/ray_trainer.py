import ray
from ray import tune
from ray.rllib.algorithms.ppo import PPO, PPOConfig
from ray.rllib.algorithms.dqn import DQN, DQNConfig
from ray.rllib.algorithms.sac import SAC, SACConfig
from ray.rllib.env.env_context import EnvContext
import gymnasium as gym
import numpy as np
import json
import os
from typing import Dict, Any
import logging
from datetime import datetime
import wandb

from factory_gym_env import FactoryEnv

class FactoryTrainer:
    """
    Ray RLlib trainer for the Factory environment.
    Supports multiple algorithms: PPO, DQN, SAC.
    """
    
    def __init__(self, 
                 algorithm='PPO',
                 num_workers=4,
                 training_iterations=1000,
                 checkpoint_freq=50,
                 use_wandb=True):
        
        self.algorithm = algorithm
        self.num_workers = num_workers
        self.training_iterations = training_iterations
        self.checkpoint_freq = checkpoint_freq
        self.use_wandb = use_wandb
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Initialize Ray
        if not ray.is_initialized():
            ray.init(ignore_reinit_error=True)
        
        # Register environment
        tune.register_env("factory_env", lambda config: FactoryEnv(**config))
        
        # Setup experiment directory
        self.experiment_dir = f"./experiments/{algorithm}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(self.experiment_dir, exist_ok=True)
        
        # Initialize Weights & Biases if requested
        if self.use_wandb:
            wandb.init(
                project="factory-rl-training",
                name=f"{algorithm}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                config={
                    "algorithm": algorithm,
                    "num_workers": num_workers,
                    "training_iterations": training_iterations
                }
            )
    
    def get_config(self) -> Dict[str, Any]:
        """Get algorithm configuration."""
        base_config = {
            "env": "factory_env",
            "env_config": {
                "unity_host": "localhost",
                "unity_port": 9000,
                "max_steps": 1000,
                "num_agents": 4
            },
            "num_workers": self.num_workers,
            "num_envs_per_worker": 1,
            "framework": "torch",
            "log_level": "INFO",
            "evaluation_interval": 10,
            "evaluation_duration": 5,
            "evaluation_config": {"explore": False},
        }
        
        if self.algorithm == 'PPO':
            config = PPOConfig()
            config.update_from_dict(base_config)
            config.update_from_dict({
                "lr": 3e-4,
                "train_batch_size": 4000,
                "sgd_minibatch_size": 128,
                "num_sgd_iter": 10,
                "lambda": 0.95,
                "gamma": 0.99,
                "clip_param": 0.2,
                "vf_clip_param": 10.0,
                "entropy_coeff": 0.01,
                "model": {
                    "fcnet_hiddens": [256, 256],
                    "fcnet_activation": "tanh",
                },
            })
            return config
        
        elif self.algorithm == 'DQN':
            config = DQNConfig()
            config.update_from_dict(base_config)
            config.update_from_dict({
                "lr": 1e-4,
                "buffer_size": 50000,
                "learning_starts": 1000,
                "train_batch_size": 32,
                "target_network_update_freq": 500,
                "epsilon_timesteps": 50000,
                "final_epsilon": 0.02,
                "double_q": True,
                "dueling": True,
                "model": {
                    "fcnet_hiddens": [256, 256],
                    "fcnet_activation": "relu",
                },
            })
            return config
        
        elif self.algorithm == 'SAC':
            config = SACConfig()
            config.update_from_dict(base_config)
            config.update_from_dict({
                "lr": 3e-4,
                "buffer_size": 1000000,
                "learning_starts": 1500,
                "train_batch_size": 256,
                "tau": 0.005,
                "gamma": 0.99,
                "target_entropy": "auto",
                "model": {
                    "fcnet_hiddens": [256, 256],
                    "fcnet_activation": "relu",
                },
            })
            return config
        
        else:
            raise ValueError(f"Unsupported algorithm: {self.algorithm}")
    
    def create_algorithm(self):
        """Create the RL algorithm."""
        config = self.get_config()
        
        if self.algorithm == 'PPO':
            return PPO(config=config)
        elif self.algorithm == 'DQN':
            return DQN(config=config)
        elif self.algorithm == 'SAC':
            return SAC(config=config)
        else:
            raise ValueError(f"Unsupported algorithm: {self.algorithm}")
    
    def train(self):
        """Run training loop."""
        self.logger.info(f"Starting {self.algorithm} training...")
        
        # Create algorithm
        algo = self.create_algorithm()
        
        # Training loop
        best_reward = float('-inf')
        
        for iteration in range(self.training_iterations):
            try:
                # Train one iteration
                result = algo.train()
                
                # Extract metrics
                episode_reward_mean = result.get('episode_reward_mean', 0)
                episode_len_mean = result.get('episode_len_mean', 0)
                training_iteration = result.get('training_iteration', 0)
                
                # Log progress
                self.logger.info(
                    f"Iteration {iteration + 1}/{self.training_iterations}: "
                    f"Mean Reward: {episode_reward_mean:.2f}, "
                    f"Mean Episode Length: {episode_len_mean:.2f}"
                )
                
                # Log to Weights & Biases
                if self.use_wandb:
                    wandb.log({
                        "iteration": iteration + 1,
                        "episode_reward_mean": episode_reward_mean,
                        "episode_len_mean": episode_len_mean,
                        "training_iteration": training_iteration,
                        "policy_loss": result.get('info', {}).get('learner', {}).get('default_policy', {}).get('policy_loss', 0),
                        "vf_loss": result.get('info', {}).get('learner', {}).get('default_policy', {}).get('vf_loss', 0),
                    })
                
                # Save checkpoint
                if (iteration + 1) % self.checkpoint_freq == 0:
                    checkpoint_path = algo.save(self.experiment_dir)
                    self.logger.info(f"Checkpoint saved: {checkpoint_path}")
                    
                    # Save best model
                    if episode_reward_mean > best_reward:
                        best_reward = episode_reward_mean
                        best_checkpoint_path = os.path.join(self.experiment_dir, "best_model")
                        algo.save(best_checkpoint_path)
                        self.logger.info(f"New best model saved with reward: {best_reward:.2f}")
                
                # Save training metrics
                self._save_metrics(iteration + 1, result)
                
            except Exception as e:
                self.logger.error(f"Error during training iteration {iteration + 1}: {e}")
                continue
        
        # Final checkpoint
        final_checkpoint = algo.save(self.experiment_dir)
        self.logger.info(f"Training completed. Final checkpoint: {final_checkpoint}")
        
        # Cleanup
        algo.stop()
        
        if self.use_wandb:
            wandb.finish()
    
    def _save_metrics(self, iteration: int, result: Dict[str, Any]):
        """Save training metrics to file."""
        metrics = {
            "iteration": iteration,
            "timestamp": datetime.now().isoformat(),
            "episode_reward_mean": result.get('episode_reward_mean', 0),
            "episode_reward_min": result.get('episode_reward_min', 0),
            "episode_reward_max": result.get('episode_reward_max', 0),
            "episode_len_mean": result.get('episode_len_mean', 0),
            "episodes_total": result.get('episodes_total', 0),
            "training_iteration": result.get('training_iteration', 0),
        }
        
        # Add algorithm-specific metrics
        if self.algorithm == 'PPO':
            metrics.update({
                "policy_loss": result.get('info', {}).get('learner', {}).get('default_policy', {}).get('policy_loss', 0),
                "vf_loss": result.get('info', {}).get('learner', {}).get('default_policy', {}).get('vf_loss', 0),
                "entropy": result.get('info', {}).get('learner', {}).get('default_policy', {}).get('entropy', 0),
            })
        
        # Save to file
        metrics_file = os.path.join(self.experiment_dir, "metrics.jsonl")
        with open(metrics_file, "a") as f:
            f.write(json.dumps(metrics) + "\n")
    
    def evaluate(self, checkpoint_path: str, num_episodes: int = 10):
        """Evaluate a trained model."""
        self.logger.info(f"Evaluating model from {checkpoint_path}...")
        
        # Create algorithm and restore from checkpoint
        algo = self.create_algorithm()
        algo.restore(checkpoint_path)
        
        # Create environment for evaluation
        env = FactoryEnv()
        
        total_rewards = []
        total_steps = []
        
        for episode in range(num_episodes):
            obs = env.reset()
            episode_reward = 0
            episode_steps = 0
            done = False
            
            while not done:
                # Get action from trained policy
                action = algo.compute_single_action(obs, explore=False)
                obs, reward, done, info = env.step(action)
                episode_reward += reward
                episode_steps += 1
            
            total_rewards.append(episode_reward)
            total_steps.append(episode_steps)
            
            self.logger.info(f"Episode {episode + 1}: Reward = {episode_reward:.2f}, Steps = {episode_steps}")
        
        # Calculate statistics
        mean_reward = np.mean(total_rewards)
        std_reward = np.std(total_rewards)
        mean_steps = np.mean(total_steps)
        
        self.logger.info(f"Evaluation Results:")
        self.logger.info(f"Mean Reward: {mean_reward:.2f} ± {std_reward:.2f}")
        self.logger.info(f"Mean Steps: {mean_steps:.2f}")
        
        # Cleanup
        env.close()
        algo.stop()
        
        return {
            "mean_reward": mean_reward,
            "std_reward": std_reward,
            "mean_steps": mean_steps,
            "all_rewards": total_rewards,
            "all_steps": total_steps
        }


def run_hyperparameter_tuning():
    """Run hyperparameter tuning with Ray Tune."""
    
    def train_factory_model(config):
        """Training function for hyperparameter tuning."""
        trainer = FactoryTrainer(
            algorithm=config["algorithm"],
            num_workers=config["num_workers"],
            training_iterations=config["training_iterations"],
            use_wandb=False
        )
        trainer.train()
    
    # Define search space
    search_space = {
        "algorithm": tune.choice(["PPO", "DQN", "SAC"]),
        "num_workers": tune.choice([2, 4, 8]),
        "training_iterations": tune.choice([500, 1000, 2000]),
        "lr": tune.loguniform(1e-5, 1e-3),
        "train_batch_size": tune.choice([1000, 2000, 4000]),
    }
    
    # Run tuning
    tuner = tune.Tuner(
        train_factory_model,
        param_space=search_space,
        tune_config=tune.TuneConfig(
            metric="episode_reward_mean",
            mode="max",
            num_samples=20,
        ),
        run_config=ray.air.RunConfig(
            name="factory_hyperparameter_tuning",
            stop={"training_iteration": 100},
        )
    )
    
    results = tuner.fit()
    best_result = results.get_best_result()
    
    print("Best hyperparameters:")
    print(best_result.config)
    print(f"Best reward: {best_result.metrics['episode_reward_mean']}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Factory RL Training")
    parser.add_argument("--algorithm", choices=["PPO", "DQN", "SAC"], default="PPO")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--iterations", type=int, default=1000)
    parser.add_argument("--checkpoint-freq", type=int, default=50)
    parser.add_argument("--evaluate", type=str, help="Path to checkpoint for evaluation")
    parser.add_argument("--tune", action="store_true", help="Run hyperparameter tuning")
    parser.add_argument("--no-wandb", action="store_true", help="Disable Weights & Biases logging")
    
    args = parser.parse_args()
    
    if args.tune:
        run_hyperparameter_tuning()
    elif args.evaluate:
        trainer = FactoryTrainer(algorithm=args.algorithm, use_wandb=False)
        trainer.evaluate(args.evaluate)
    else:
        trainer = FactoryTrainer(
            algorithm=args.algorithm,
            num_workers=args.workers,
            training_iterations=args.iterations,
            checkpoint_freq=args.checkpoint_freq,
            use_wandb=not args.no_wandb
        )
        trainer.train()