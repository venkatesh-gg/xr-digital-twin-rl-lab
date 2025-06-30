using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Unity.MLAgents;

public class FactoryEnvironment : MonoBehaviour
{
    [Header("Environment Settings")]
    public int maxProducts = 10;
    public float productSpawnRate = 5f;
    public Transform[] spawnPoints;
    public Transform[] deliveryPoints;
    
    [Header("Performance Metrics")]
    public float overallEfficiency = 0f;
    public int totalProductsCompleted = 0;
    public float averageCompletionTime = 0f;
    public int activeAgents = 0;
    
    private List<GameObject> activeProducts;
    private List<FactoryAgent> agents;
    private float lastSpawnTime;
    private float episodeStartTime;
    private List<float> completionTimes;
    
    // WebSocket connection for real-time data
    private FactoryWebSocketServer webSocketServer;
    
    private void Start()
    {
        activeProducts = new List<GameObject>();
        agents = new List<FactoryAgent>();
        completionTimes = new List<float>();
        
        // Find all agents in the environment
        FactoryAgent[] foundAgents = FindObjectsOfType<FactoryAgent>();
        agents.AddRange(foundAgents);
        activeAgents = agents.Count;
        
        // Initialize WebSocket server for real-time communication
        webSocketServer = GetComponent<FactoryWebSocketServer>();
        if (webSocketServer == null)
        {
            webSocketServer = gameObject.AddComponent<FactoryWebSocketServer>();
        }
        
        episodeStartTime = Time.time;
        
        StartCoroutine(ProductSpawner());
        StartCoroutine(MetricsUpdater());
    }
    
    public void ResetEnvironment()
    {
        // Clear all active products
        foreach (GameObject product in activeProducts)
        {
            if (product != null)
            {
                Destroy(product);
            }
        }
        activeProducts.Clear();
        
        // Reset metrics
        totalProductsCompleted = 0;
        overallEfficiency = 0f;
        averageCompletionTime = 0f;
        completionTimes.Clear();
        
        episodeStartTime = Time.time;
        lastSpawnTime = Time.time;
        
        // Reset all processing stations
        ProcessingStation[] stations = FindObjectsOfType<ProcessingStation>();
        foreach (ProcessingStation station in stations)
        {
            station.ResetStation();
        }
        
        // Reset conveyor belts
        ConveyorBelt[] belts = FindObjectsOfType<ConveyorBelt>();
        foreach (ConveyorBelt belt in belts)
        {
            belt.ResetBelt();
        }
    }
    
    private IEnumerator ProductSpawner()
    {
        while (true)
        {
            if (activeProducts.Count < maxProducts && Time.time - lastSpawnTime >= productSpawnRate)
            {
                SpawnProduct();
                lastSpawnTime = Time.time;
            }
            yield return new WaitForSeconds(1f);
        }
    }
    
    private void SpawnProduct()
    {
        if (spawnPoints.Length == 0) return;
        
        Transform spawnPoint = spawnPoints[Random.Range(0, spawnPoints.Length)];
        GameObject productPrefab = Resources.Load<GameObject>("ProductPrefab");
        
        if (productPrefab != null)
        {
            GameObject newProduct = Instantiate(productPrefab, spawnPoint.position, spawnPoint.rotation);
            activeProducts.Add(newProduct);
            
            // Configure product properties
            Product productScript = newProduct.GetComponent<Product>();
            if (productScript != null)
            {
                productScript.Initialize(GenerateRandomProductType(), this);
            }
        }
    }
    
    private ProductType GenerateRandomProductType()
    {
        ProductType[] types = System.Enum.GetValues(typeof(ProductType)) as ProductType[];
        return types[Random.Range(0, types.Length)];
    }
    
    public void OnProductCompleted(GameObject product, float completionTime)
    {
        if (activeProducts.Contains(product))
        {
            activeProducts.Remove(product);
            totalProductsCompleted++;
            completionTimes.Add(completionTime);
            
            // Calculate average completion time
            float sum = 0f;
            foreach (float time in completionTimes)
            {
                sum += time;
            }
            averageCompletionTime = sum / completionTimes.Count;
            
            // Update efficiency metrics
            UpdateEfficiencyMetrics();
            
            Destroy(product);
        }
    }
    
    private void UpdateEfficiencyMetrics()
    {
        float episodeTime = Time.time - episodeStartTime;
        float targetProductionRate = 60f / productSpawnRate; // Products per minute
        float actualProductionRate = totalProductsCompleted / (episodeTime / 60f);
        
        overallEfficiency = Mathf.Clamp((actualProductionRate / targetProductionRate) * 100f, 0f, 100f);
        
        // Factor in agent performance
        float totalAgentEfficiency = 0f;
        foreach (FactoryAgent agent in agents)
        {
            totalAgentEfficiency += agent.efficiencyScore;
        }
        
        if (agents.Count > 0)
        {
            float avgAgentEfficiency = totalAgentEfficiency / agents.Count;
            overallEfficiency = (overallEfficiency + avgAgentEfficiency) / 2f;
        }
    }
    
    private IEnumerator MetricsUpdater()
    {
        while (true)
        {
            UpdateEfficiencyMetrics();
            
            // Send metrics to WebSocket clients
            if (webSocketServer != null)
            {
                FactoryMetrics metrics = new FactoryMetrics
                {
                    efficiency = overallEfficiency,
                    totalProductsCompleted = totalProductsCompleted,
                    averageCompletionTime = averageCompletionTime,
                    activeAgents = activeAgents,
                    activeProducts = activeProducts.Count,
                    timestamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                };
                
                webSocketServer.BroadcastMetrics(metrics);
            }
            
            yield return new WaitForSeconds(2f);
        }
    }
    
    public FactoryMetrics GetCurrentMetrics()
    {
        return new FactoryMetrics
        {
            efficiency = overallEfficiency,
            totalProductsCompleted = totalProductsCompleted,
            averageCompletionTime = averageCompletionTime,
            activeAgents = activeAgents,
            activeProducts = activeProducts.Count,
            timestamp = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };
    }
    
    // Anomaly detection
    public bool DetectAnomalies()
    {
        // Check for efficiency drops
        if (overallEfficiency < 70f) return true;
        
        // Check for stuck agents
        foreach (FactoryAgent agent in agents)
        {
            if (agent.GetComponent<Rigidbody>().velocity.magnitude < 0.1f)
            {
                // Agent might be stuck
                return true;
            }
        }
        
        // Check for processing bottlenecks
        ProcessingStation[] stations = FindObjectsOfType<ProcessingStation>();
        foreach (ProcessingStation station in stations)
        {
            if (station.GetQueueLength() > 5)
            {
                return true;
            }
        }
        
        return false;
    }
}

[System.Serializable]
public class FactoryMetrics
{
    public float efficiency;
    public int totalProductsCompleted;
    public float averageCompletionTime;
    public int activeAgents;
    public int activeProducts;
    public string timestamp;
}