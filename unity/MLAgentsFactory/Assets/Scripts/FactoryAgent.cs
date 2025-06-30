using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Unity.MLAgents;
using Unity.MLAgents.Sensors;
using Unity.MLAgents.Actuators;

public class FactoryAgent : Agent
{
    [Header("Factory Environment")]
    public Transform[] workstations;
    public Transform[] conveyorBelts;
    public GameObject productPrefab;
    public float moveSpeed = 5f;
    public float rotationSpeed = 180f;
    
    [Header("Production Metrics")]
    public float efficiencyScore = 0f;
    public int productsCompleted = 0;
    public float totalReward = 0f;
    
    private Rigidbody agentRb;
    private Vector3 startingPosition;
    private FactoryEnvironment factoryEnv;
    private int currentTask = 0;
    private bool isCarryingProduct = false;
    private GameObject carriedProduct;
    
    // Task types
    private enum TaskType
    {
        MoveToStation,
        PickupProduct,
        ProcessProduct,
        DeliverProduct,
        QualityCheck
    }
    
    public override void Initialize()
    {
        agentRb = GetComponent<Rigidbody>();
        startingPosition = transform.position;
        factoryEnv = GetComponentInParent<FactoryEnvironment>();
        
        if (factoryEnv == null)
        {
            Debug.LogError("FactoryAgent requires FactoryEnvironment component in parent!");
        }
    }
    
    public override void OnEpisodeBegin()
    {
        // Reset agent position
        transform.position = startingPosition;
        transform.rotation = Quaternion.identity;
        agentRb.velocity = Vector3.zero;
        agentRb.angularVelocity = Vector3.zero;
        
        // Reset metrics
        efficiencyScore = 0f;
        productsCompleted = 0;
        totalReward = 0f;
        currentTask = 0;
        isCarryingProduct = false;
        
        if (carriedProduct != null)
        {
            Destroy(carriedProduct);
            carriedProduct = null;
        }
        
        // Reset factory environment
        if (factoryEnv != null)
        {
            factoryEnv.ResetEnvironment();
        }
    }
    
    public override void CollectObservations(VectorSensorComponent sensorComponent)
    {
        // Agent position and rotation (6 values)
        sensorComponent.AddObservation(transform.position);
        sensorComponent.AddObservation(transform.rotation);
        
        // Distances to workstations (workstations.Length values)
        foreach (Transform station in workstations)
        {
            float distance = Vector3.Distance(transform.position, station.position);
            sensorComponent.AddObservation(distance / 20f); // Normalized distance
        }
        
        // Current task and carrying state (2 values)
        sensorComponent.AddObservation(currentTask / 5f); // Normalized task ID
        sensorComponent.AddObservation(isCarryingProduct ? 1f : 0f);
        
        // Factory efficiency metrics (3 values)
        sensorComponent.AddObservation(efficiencyScore);
        sensorComponent.AddObservation(productsCompleted / 100f); // Normalized
        sensorComponent.AddObservation(Time.time / MaxStep); // Episode progress
        
        // Conveyor belt states (conveyorBelts.Length values)
        foreach (Transform belt in conveyorBelts)
        {
            ConveyorBelt beltScript = belt.GetComponent<ConveyorBelt>();
            if (beltScript != null)
            {
                sensorComponent.AddObservation(beltScript.GetLoadPercentage());
            }
            else
            {
                sensorComponent.AddObservation(0f);
            }
        }
    }
    
    public override void OnActionReceived(ActionSegment actions)
    {
        // Movement actions (2 continuous)
        float moveX = actions.ContinuousActions[0];
        float moveZ = actions.ContinuousActions[1];
        
        // Rotation action (1 continuous)
        float rotate = actions.ContinuousActions[2];
        
        // Task actions (1 discrete)
        int taskAction = actions.DiscreteActions[0];
        
        // Apply movement
        Vector3 movement = new Vector3(moveX, 0, moveZ) * moveSpeed * Time.fixedDeltaTime;
        agentRb.MovePosition(transform.position + movement);
        
        // Apply rotation
        transform.Rotate(0, rotate * rotationSpeed * Time.fixedDeltaTime, 0);
        
        // Execute task action
        ExecuteTaskAction(taskAction);
        
        // Calculate rewards
        CalculateRewards();
        
        // Check episode termination
        if (StepCount >= MaxStep)
        {
            EndEpisode();
        }
    }
    
    private void ExecuteTaskAction(int action)
    {
        switch (action)
        {
            case 0: // Continue current action
                break;
            case 1: // Pickup product
                TryPickupProduct();
                break;
            case 2: // Drop/deliver product
                TryDeliverProduct();
                break;
            case 3: // Process at current station
                TryProcessAtStation();
                break;
            case 4: // Quality check
                TryQualityCheck();
                break;
        }
    }
    
    private void TryPickupProduct()
    {
        if (!isCarryingProduct)
        {
            Collider[] nearbyProducts = Physics.OverlapSphere(transform.position, 2f);
            foreach (Collider col in nearbyProducts)
            {
                if (col.CompareTag("Product") && col.GetComponent<Product>().IsAvailableForPickup())
                {
                    carriedProduct = col.gameObject;
                    carriedProduct.transform.SetParent(transform);
                    carriedProduct.transform.localPosition = Vector3.up * 2f;
                    isCarryingProduct = true;
                    
                    AddReward(0.1f); // Small reward for successful pickup
                    break;
                }
            }
        }
        else
        {
            AddReward(-0.05f); // Penalty for trying to pickup when already carrying
        }
    }
    
    private void TryDeliverProduct()
    {
        if (isCarryingProduct && carriedProduct != null)
        {
            // Check if near a delivery station
            Collider[] nearbyStations = Physics.OverlapSphere(transform.position, 3f);
            foreach (Collider col in nearbyStations)
            {
                if (col.CompareTag("DeliveryStation"))
                {
                    DeliveryStation station = col.GetComponent<DeliveryStation>();
                    if (station.AcceptProduct(carriedProduct.GetComponent<Product>()))
                    {
                        Destroy(carriedProduct);
                        carriedProduct = null;
                        isCarryingProduct = false;
                        productsCompleted++;
                        
                        AddReward(1.0f); // Major reward for successful delivery
                        return;
                    }
                }
            }
            AddReward(-0.02f); // Small penalty for trying to deliver at wrong location
        }
        else
        {
            AddReward(-0.05f); // Penalty for trying to deliver when not carrying anything
        }
    }
    
    private void TryProcessAtStation()
    {
        if (isCarryingProduct && carriedProduct != null)
        {
            Collider[] nearbyStations = Physics.OverlapSphere(transform.position, 3f);
            foreach (Collider col in nearbyStations)
            {
                if (col.CompareTag("ProcessingStation"))
                {
                    ProcessingStation station = col.GetComponent<ProcessingStation>();
                    if (station.ProcessProduct(carriedProduct.GetComponent<Product>()))
                    {
                        AddReward(0.5f); // Reward for successful processing
                        return;
                    }
                }
            }
        }
    }
    
    private void TryQualityCheck()
    {
        if (isCarryingProduct && carriedProduct != null)
        {
            Product product = carriedProduct.GetComponent<Product>();
            if (product.PerformQualityCheck())
            {
                AddReward(0.3f); // Reward for quality check
            }
            else
            {
                AddReward(-0.2f); // Penalty for failed quality check
            }
        }
    }
    
    private void CalculateRewards()
    {
        // Time-based efficiency reward
        float timeEfficiency = 1f - (StepCount / (float)MaxStep);
        AddReward(timeEfficiency * 0.001f);
        
        // Distance-based movement efficiency
        if (workstations.Length > 0)
        {
            float minDistance = float.MaxValue;
            foreach (Transform station in workstations)
            {
                float dist = Vector3.Distance(transform.position, station.position);
                minDistance = Mathf.Min(minDistance, dist);
            }
            
            // Reward for being close to workstations
            AddReward((20f - minDistance) * 0.0001f);
        }
        
        // Penalty for excessive movement
        float velocityMagnitude = agentRb.velocity.magnitude;
        if (velocityMagnitude > moveSpeed * 1.5f)
        {
            AddReward(-0.001f);
        }
        
        // Update efficiency score
        efficiencyScore = (productsCompleted / Mathf.Max(1f, StepCount / 100f)) * 100f;
        totalReward = GetCumulativeReward();
    }
    
    public override void Heuristic(in ActionSegment actionsOut)
    {
        // Manual control for testing
        var continuousActions = actionsOut.ContinuousActions;
        var discreteActions = actionsOut.DiscreteActions;
        
        continuousActions[0] = Input.GetAxis("Horizontal");
        continuousActions[1] = Input.GetAxis("Vertical");
        continuousActions[2] = Input.GetKey(KeyCode.Q) ? -1f : Input.GetKey(KeyCode.E) ? 1f : 0f;
        
        discreteActions[0] = 0; // Default to no action
        
        if (Input.GetKeyDown(KeyCode.Space)) discreteActions[0] = 1; // Pickup
        if (Input.GetKeyDown(KeyCode.F)) discreteActions[0] = 2; // Deliver
        if (Input.GetKeyDown(KeyCode.G)) discreteActions[0] = 3; // Process
        if (Input.GetKeyDown(KeyCode.H)) discreteActions[0] = 4; // Quality check
    }
    
    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Hazard"))
        {
            AddReward(-1.0f); // Major penalty for hitting hazards
            EndEpisode();
        }
    }
    
    private void OnCollisionEnter(Collision collision)
    {
        if (collision.collider.CompareTag("Wall") || collision.collider.CompareTag("Obstacle"))
        {
            AddReward(-0.1f); // Penalty for collisions
        }
    }
}