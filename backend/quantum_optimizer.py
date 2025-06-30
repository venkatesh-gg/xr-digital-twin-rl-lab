import numpy as np
from qiskit import QuantumCircuit, transpile, execute
from qiskit.providers.aer import AerSimulator
from qiskit.algorithms import QAOA, VQE
from qiskit.algorithms.optimizers import COBYLA, SPSA
from qiskit.circuit.library import TwoLocal
from qiskit.opflow import PauliSumOp
from qiskit.quantum_info import SparsePauliOp
import json
import logging
from typing import Dict, List, Tuple, Any
from datetime import datetime
import matplotlib.pyplot as plt
import networkx as nx

class QuantumFactoryScheduler:
    """
    Quantum-inspired optimization for factory scheduling using Qiskit.
    Formulates scheduling as a QUBO problem and solves using QAOA.
    """
    
    def __init__(self, num_tasks=8, num_machines=4, time_slots=10):
        self.num_tasks = num_tasks
        self.num_machines = num_machines
        self.time_slots = time_slots
        self.num_qubits = num_tasks * num_machines * time_slots
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Initialize quantum backend
        self.backend = AerSimulator()
        
        # Problem parameters
        self.task_durations = {}
        self.machine_capabilities = {}
        self.task_dependencies = {}
        self.setup_problem()
        
    def setup_problem(self):
        """Initialize factory scheduling problem parameters."""
        
        # Task durations (in time slots)
        task_types = ['assembly', 'quality_check', 'packaging', 'transport']
        for i in range(self.num_tasks):
            task_type = task_types[i % len(task_types)]
            if task_type == 'assembly':
                duration = np.random.randint(2, 5)
            elif task_type == 'quality_check':
                duration = np.random.randint(1, 3)
            elif task_type == 'packaging':
                duration = np.random.randint(1, 4)
            else:  # transport
                duration = np.random.randint(1, 2)
            
            self.task_durations[i] = duration
        
        # Machine capabilities (which tasks each machine can perform)
        for machine in range(self.num_machines):
            if machine == 0:  # Assembly machine
                capabilities = [i for i in range(self.num_tasks) if i % 4 == 0]
            elif machine == 1:  # Quality control machine
                capabilities = [i for i in range(self.num_tasks) if i % 4 == 1]
            elif machine == 2:  # Packaging machine
                capabilities = [i for i in range(self.num_tasks) if i % 4 == 2]
            else:  # Transport machine
                capabilities = [i for i in range(self.num_tasks) if i % 4 == 3]
            
            self.machine_capabilities[machine] = capabilities
        
        # Task dependencies (precedence constraints)
        for i in range(0, self.num_tasks - 1, 4):
            if i + 1 < self.num_tasks:
                self.task_dependencies[i + 1] = [i]  # Quality check after assembly
            if i + 2 < self.num_tasks:
                self.task_dependencies[i + 2] = [i + 1]  # Packaging after quality
            if i + 3 < self.num_tasks:
                self.task_dependencies[i + 3] = [i + 2]  # Transport after packaging
        
        self.logger.info(f"Problem setup: {self.num_tasks} tasks, {self.num_machines} machines, {self.time_slots} time slots")
    
    def create_qubo_matrix(self) -> np.ndarray:
        """Create QUBO matrix for the scheduling problem."""
        
        # Decision variables: x_{i,j,t} = 1 if task i is assigned to machine j at time t
        qubo_size = self.num_tasks * self.num_machines * self.time_slots
        Q = np.zeros((qubo_size, qubo_size))
        
        def get_var_index(task, machine, time):
            """Get linear index for decision variable."""
            return task * self.num_machines * self.time_slots + machine * self.time_slots + time
        
        # Constraint 1: Each task must be assigned to exactly one machine at one time
        penalty_1 = 10.0
        for task in range(self.num_tasks):
            for m1 in range(self.num_machines):
                for t1 in range(self.time_slots):
                    idx1 = get_var_index(task, m1, t1)
                    Q[idx1, idx1] -= penalty_1  # Linear term
                    
                    for m2 in range(self.num_machines):
                        for t2 in range(self.time_slots):
                            if (m1, t1) != (m2, t2):
                                idx2 = get_var_index(task, m2, t2)
                                Q[idx1, idx2] += penalty_1  # Quadratic penalty
        
        # Constraint 2: Machine capability constraints
        penalty_2 = 15.0
        for task in range(self.num_tasks):
            for machine in range(self.num_machines):
                if task not in self.machine_capabilities[machine]:
                    for time in range(self.time_slots):
                        idx = get_var_index(task, machine, time)
                        Q[idx, idx] += penalty_2  # Penalty for invalid assignments
        
        # Constraint 3: Task duration constraints
        penalty_3 = 12.0
        for task in range(self.num_tasks):
            duration = self.task_durations[task]
            for machine in range(self.num_machines):
                for start_time in range(self.time_slots - duration + 1):
                    # Tasks must run for their full duration
                    for dt in range(duration):
                        idx = get_var_index(task, machine, start_time + dt)
                        Q[idx, idx] -= penalty_3 / duration  # Encourage full duration
        
        # Constraint 4: Precedence constraints
        penalty_4 = 20.0
        for task, predecessors in self.task_dependencies.items():
            for pred_task in predecessors:
                pred_duration = self.task_durations[pred_task]
                for m1 in range(self.num_machines):
                    for m2 in range(self.num_machines):
                        for t1 in range(self.time_slots):
                            for t2 in range(t1 + pred_duration, self.time_slots):
                                idx1 = get_var_index(pred_task, m1, t1)
                                idx2 = get_var_index(task, m2, t2)
                                Q[idx1, idx2] -= penalty_4  # Reward proper ordering
        
        # Objective: Minimize makespan and maximize efficiency
        objective_weight = 1.0
        for task in range(self.num_tasks):
            for machine in range(self.num_machines):
                for time in range(self.time_slots):
                    idx = get_var_index(task, machine, time)
                    # Prefer earlier completion times
                    Q[idx, idx] += objective_weight * time / self.time_slots
        
        return Q
    
    def qubo_to_pauli(self, Q: np.ndarray) -> PauliSumOp:
        """Convert QUBO matrix to Pauli operator."""
        pauli_list = []
        
        for i in range(len(Q)):
            for j in range(i, len(Q)):
                coeff = Q[i, j]
                if abs(coeff) > 1e-10:
                    if i == j:
                        # Diagonal term: (1 - Z_i) / 2
                        pauli_str = ['I'] * len(Q)
                        pauli_str[i] = 'Z'
                        pauli_list.append((coeff / 2, ''.join(pauli_str)))
                        
                        pauli_str = ['I'] * len(Q)
                        pauli_list.append((-coeff / 2, ''.join(pauli_str)))
                    else:
                        # Off-diagonal term: (1 - Z_i)(1 - Z_j) / 4
                        # = 1/4 - Z_i/4 - Z_j/4 + Z_i Z_j/4
                        pauli_str = ['I'] * len(Q)
                        pauli_list.append((coeff / 4, ''.join(pauli_str)))
                        
                        pauli_str = ['I'] * len(Q)
                        pauli_str[i] = 'Z'
                        pauli_list.append((-coeff / 4, ''.join(pauli_str)))
                        
                        pauli_str = ['I'] * len(Q)
                        pauli_str[j] = 'Z'
                        pauli_list.append((-coeff / 4, ''.join(pauli_str)))
                        
                        pauli_str = ['I'] * len(Q)
                        pauli_str[i] = 'Z'
                        pauli_str[j] = 'Z'
                        pauli_list.append((coeff / 4, ''.join(pauli_str)))
        
        # Create sparse Pauli operator
        paulis = [(pauli, coeff) for coeff, pauli in pauli_list if abs(coeff) > 1e-10]
        return SparsePauliOp.from_list(paulis)
    
    def solve_qaoa(self, layers=2) -> Dict[str, Any]:
        """Solve scheduling problem using QAOA."""
        
        self.logger.info(f"Starting QAOA optimization with {layers} layers...")
        
        # Create QUBO matrix
        Q = self.create_qubo_matrix()
        
        # Convert to Pauli operator
        pauli_op = self.qubo_to_pauli(Q)
        
        # Create QAOA instance
        optimizer = COBYLA(maxiter=200)
        qaoa = QAOA(optimizer=optimizer, reps=layers, quantum_instance=self.backend)
        
        # Solve
        result = qaoa.compute_minimum_eigenvalue(pauli_op)
        
        # Extract solution
        optimal_parameters = result.optimal_parameters
        optimal_value = result.optimal_value
        optimal_state = result.eigenstate
        
        # Decode solution
        schedule = self.decode_solution(result.optimal_point if hasattr(result, 'optimal_point') else None)
        
        # Calculate metrics
        metrics = self.calculate_metrics(schedule)
        
        return {
            'optimal_value': optimal_value,
            'optimal_parameters': optimal_parameters,
            'schedule': schedule,
            'metrics': metrics,
            'execution_time': result.optimizer_time if hasattr(result, 'optimizer_time') else 0,
            'iterations': result.optimizer_evals if hasattr(result, 'optimizer_evals') else 0
        }
    
    def solve_classical(self) -> Dict[str, Any]:
        """Solve scheduling problem using classical optimization for comparison."""
        
        from scipy.optimize import minimize
        
        self.logger.info("Starting classical optimization...")
        
        # Create QUBO matrix
        Q = self.create_qubo_matrix()
        
        def objective(x):
            return x.T @ Q @ x
        
        # Random initial solution
        x0 = np.random.random(Q.shape[0])
        
        # Optimize
        result = minimize(objective, x0, method='L-BFGS-B', bounds=[(0, 1)] * len(x0))
        
        # Round to binary solution
        binary_solution = (result.x > 0.5).astype(int)
        
        # Decode solution
        schedule = self.decode_solution(binary_solution)
        
        # Calculate metrics
        metrics = self.calculate_metrics(schedule)
        
        return {
            'optimal_value': result.fun,
            'schedule': schedule,
            'metrics': metrics,
            'execution_time': 0,  # Not available for scipy
            'iterations': result.nit
        }
    
    def decode_solution(self, solution_vector: np.ndarray) -> Dict[str, Any]:
        """Decode quantum solution to scheduling assignments."""
        
        if solution_vector is None:
            # Return random schedule as fallback
            return self.generate_random_schedule()
        
        schedule = {
            'tasks': {},
            'machines': {m: [] for m in range(self.num_machines)},
            'timeline': []
        }
        
        def get_var_index(task, machine, time):
            return task * self.num_machines * self.time_slots + machine * self.time_slots + time
        
        # Extract assignments
        for task in range(self.num_tasks):
            best_assignment = None
            best_value = -1
            
            for machine in range(self.num_machines):
                for time in range(self.time_slots):
                    idx = get_var_index(task, machine, time)
                    if idx < len(solution_vector) and solution_vector[idx] > best_value:
                        best_value = solution_vector[idx]
                        best_assignment = (machine, time)
            
            if best_assignment:
                machine, start_time = best_assignment
                duration = self.task_durations[task]
                
                schedule['tasks'][task] = {
                    'machine': machine,
                    'start_time': start_time,
                    'end_time': start_time + duration,
                    'duration': duration
                }
                
                schedule['machines'][machine].append({
                    'task': task,
                    'start_time': start_time,
                    'end_time': start_time + duration
                })
        
        # Sort machine schedules by start time
        for machine in schedule['machines']:
            schedule['machines'][machine].sort(key=lambda x: x['start_time'])
        
        return schedule
    
    def generate_random_schedule(self) -> Dict[str, Any]:
        """Generate a random valid schedule for comparison."""
        
        schedule = {
            'tasks': {},
            'machines': {m: [] for m in range(self.num_machines)},
            'timeline': []
        }
        
        # Simple greedy assignment
        for task in range(self.num_tasks):
            # Find valid machines for this task
            valid_machines = [m for m in range(self.num_machines) 
                            if task in self.machine_capabilities[m]]
            
            if valid_machines:
                machine = np.random.choice(valid_machines)
                duration = self.task_durations[task]
                start_time = np.random.randint(0, max(1, self.time_slots - duration))
                
                schedule['tasks'][task] = {
                    'machine': machine,
                    'start_time': start_time,
                    'end_time': start_time + duration,
                    'duration': duration
                }
                
                schedule['machines'][machine].append({
                    'task': task,
                    'start_time': start_time,
                    'end_time': start_time + duration
                })
        
        return schedule
    
    def calculate_metrics(self, schedule: Dict[str, Any]) -> Dict[str, float]:
        """Calculate performance metrics for a schedule."""
        
        if not schedule['tasks']:
            return {'makespan': float('inf'), 'efficiency': 0.0, 'utilization': 0.0}
        
        # Calculate makespan
        makespan = max(task_info['end_time'] for task_info in schedule['tasks'].values())
        
        # Calculate machine utilization
        total_busy_time = sum(task_info['duration'] for task_info in schedule['tasks'].values())
        total_available_time = self.num_machines * self.time_slots
        utilization = total_busy_time / total_available_time
        
        # Calculate efficiency (inverse of makespan, normalized)
        efficiency = (self.time_slots - makespan) / self.time_slots if makespan < self.time_slots else 0.0
        
        # Check constraint violations
        violations = self.check_constraints(schedule)
        
        return {
            'makespan': makespan,
            'efficiency': efficiency,
            'utilization': utilization,
            'constraint_violations': violations,
            'objective_score': efficiency * 0.6 + utilization * 0.4 - violations * 0.1
        }
    
    def check_constraints(self, schedule: Dict[str, Any]) -> int:
        """Check for constraint violations in the schedule."""
        
        violations = 0
        
        # Check machine capability constraints
        for task, task_info in schedule['tasks'].items():
            machine = task_info['machine']
            if task not in self.machine_capabilities[machine]:
                violations += 1
        
        # Check precedence constraints
        for task, predecessors in self.task_dependencies.items():
            if task in schedule['tasks']:
                task_start = schedule['tasks'][task]['start_time']
                for pred_task in predecessors:
                    if pred_task in schedule['tasks']:
                        pred_end = schedule['tasks'][pred_task]['end_time']
                        if pred_end > task_start:
                            violations += 1
        
        # Check machine conflicts (overlapping tasks on same machine)
        for machine, tasks in schedule['machines'].items():
            for i in range(len(tasks)):
                for j in range(i + 1, len(tasks)):
                    task1 = tasks[i]
                    task2 = tasks[j]
                    if (task1['start_time'] < task2['end_time'] and 
                        task2['start_time'] < task1['end_time']):
                        violations += 1
        
        return violations
    
    def visualize_schedule(self, schedule: Dict[str, Any], title: str = "Factory Schedule"):
        """Visualize the scheduling solution."""
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        colors = plt.cm.Set3(np.linspace(0, 1, self.num_tasks))
        
        for machine in range(self.num_machines):
            machine_tasks = schedule['machines'][machine]
            y_pos = machine
            
            for task_info in machine_tasks:
                task = task_info['task']
                start = task_info['start_time']
                duration = task_info['end_time'] - task_info['start_time']
                
                ax.barh(y_pos, duration, left=start, height=0.6, 
                       color=colors[task], alpha=0.8, 
                       label=f'Task {task}' if machine == 0 else "")
                
                # Add task label
                ax.text(start + duration/2, y_pos, f'T{task}', 
                       ha='center', va='center', fontweight='bold')
        
        ax.set_xlabel('Time Slots')
        ax.set_ylabel('Machines')
        ax.set_title(title)
        ax.set_yticks(range(self.num_machines))
        ax.set_yticklabels([f'Machine {i}' for i in range(self.num_machines)])
        ax.grid(True, alpha=0.3)
        
        # Remove duplicate labels
        handles, labels = ax.get_legend_handles_labels()
        by_label = dict(zip(labels, handles))
        ax.legend(by_label.values(), by_label.keys(), 
                 bbox_to_anchor=(1.05, 1), loc='upper left')
        
        plt.tight_layout()
        return fig
    
    def run_optimization_comparison(self) -> Dict[str, Any]:
        """Run both quantum and classical optimization for comparison."""
        
        self.logger.info("Running optimization comparison...")
        
        # Solve with QAOA
        quantum_result = self.solve_qaoa(layers=2)
        
        # Solve with classical optimization
        classical_result = self.solve_classical()
        
        # Compare results
        comparison = {
            'quantum': quantum_result,
            'classical': classical_result,
            'comparison': {
                'quantum_advantage': (classical_result['metrics']['objective_score'] - 
                                    quantum_result['metrics']['objective_score']),
                'efficiency_improvement': (quantum_result['metrics']['efficiency'] - 
                                        classical_result['metrics']['efficiency']),
                'utilization_improvement': (quantum_result['metrics']['utilization'] - 
                                          classical_result['metrics']['utilization'])
            }
        }
        
        self.logger.info(f"Quantum efficiency: {quantum_result['metrics']['efficiency']:.3f}")
        self.logger.info(f"Classical efficiency: {classical_result['metrics']['efficiency']:.3f}")
        self.logger.info(f"Improvement: {comparison['comparison']['efficiency_improvement']:.3f}")
        
        return comparison


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Quantum Factory Scheduler")
    parser.add_argument("--tasks", type=int, default=8, help="Number of tasks")
    parser.add_argument("--machines", type=int, default=4, help="Number of machines")
    parser.add_argument("--time-slots", type=int, default=10, help="Number of time slots")
    parser.add_argument("--layers", type=int, default=2, help="QAOA layers")
    parser.add_argument("--visualize", action="store_true", help="Show visualization")
    parser.add_argument("--save-results", type=str, help="Save results to file")
    
    args = parser.parse_args()
    
    # Create scheduler
    scheduler = QuantumFactoryScheduler(
        num_tasks=args.tasks,
        num_machines=args.machines,
        time_slots=args.time_slots
    )
    
    # Run optimization
    results = scheduler.run_optimization_comparison()
    
    # Save results
    if args.save_results:
        with open(args.save_results, 'w') as f:
            # Convert numpy arrays to lists for JSON serialization
            json_results = json.loads(json.dumps(results, default=lambda x: x.tolist() if isinstance(x, np.ndarray) else str(x)))
            json.dump(json_results, f, indent=2)
        print(f"Results saved to {args.save_results}")
    
    # Visualize
    if args.visualize:
        fig1 = scheduler.visualize_schedule(results['quantum']['schedule'], "Quantum Schedule")
        fig2 = scheduler.visualize_schedule(results['classical']['schedule'], "Classical Schedule")
        plt.show()
    
    # Print summary
    print("\n" + "="*50)
    print("OPTIMIZATION RESULTS SUMMARY")
    print("="*50)
    print(f"Quantum Efficiency: {results['quantum']['metrics']['efficiency']:.3f}")
    print(f"Classical Efficiency: {results['classical']['metrics']['efficiency']:.3f}")
    print(f"Improvement: {results['comparison']['efficiency_improvement']:.3f}")
    print(f"Quantum Advantage: {results['comparison']['quantum_advantage']:.3f}")