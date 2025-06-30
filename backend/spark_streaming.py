from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import json
import logging
from datetime import datetime
import os

class FactoryAnalyticsProcessor:
    """
    Spark Streaming processor for factory analytics data.
    Processes data from Kafka and stores results in Cassandra.
    """
    
    def __init__(self, 
                 kafka_bootstrap_servers="localhost:9092",
                 kafka_topic="factory-metrics",
                 cassandra_host="localhost",
                 cassandra_keyspace="factory_analytics",
                 checkpoint_location="./checkpoints"):
        
        self.kafka_bootstrap_servers = kafka_bootstrap_servers
        self.kafka_topic = kafka_topic
        self.cassandra_host = cassandra_host
        self.cassandra_keyspace = cassandra_keyspace
        self.checkpoint_location = checkpoint_location
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Initialize Spark session
        self.spark = SparkSession.builder \
            .appName("FactoryAnalyticsProcessor") \
            .config("spark.sql.streaming.checkpointLocation", checkpoint_location) \
            .config("spark.cassandra.connection.host", cassandra_host) \
            .config("spark.sql.extensions", "com.datastax.spark.connector.CassandraSparkExtensions") \
            .config("spark.sql.catalog.cassandra", "com.datastax.spark.connector.datasource.CassandraCatalog") \
            .getOrCreate()
        
        self.spark.sparkContext.setLogLevel("WARN")
        
        # Define schemas
        self.metrics_schema = self._define_metrics_schema()
        self.anomaly_schema = self._define_anomaly_schema()
        
    def _define_metrics_schema(self):
        """Define schema for factory metrics."""
        return StructType([
            StructField("timestamp", StringType(), True),
            StructField("agent_id", IntegerType(), True),
            StructField("efficiency", DoubleType(), True),
            StructField("throughput", DoubleType(), True),
            StructField("products_completed", IntegerType(), True),
            StructField("position_x", DoubleType(), True),
            StructField("position_y", DoubleType(), True),
            StructField("position_z", DoubleType(), True),
            StructField("task_type", StringType(), True),
            StructField("reward", DoubleType(), True),
            StructField("episode", IntegerType(), True),
            StructField("step", IntegerType(), True)
        ])
    
    def _define_anomaly_schema(self):
        """Define schema for anomaly detection."""
        return StructType([
            StructField("timestamp", StringType(), True),
            StructField("anomaly_type", StringType(), True),
            StructField("severity", StringType(), True),
            StructField("station", StringType(), True),
            StructField("description", StringType(), True),
            StructField("metrics", MapType(StringType(), DoubleType()), True)
        ])
    
    def start_processing(self):
        """Start the streaming processing pipeline."""
        self.logger.info("Starting factory analytics processing...")
        
        # Read from Kafka
        df = self.spark \
            .readStream \
            .format("kafka") \
            .option("kafka.bootstrap.servers", self.kafka_bootstrap_servers) \
            .option("subscribe", self.kafka_topic) \
            .option("startingOffsets", "latest") \
            .load()
        
        # Parse JSON data
        parsed_df = df.select(
            col("timestamp").alias("kafka_timestamp"),
            from_json(col("value").cast("string"), self.metrics_schema).alias("data")
        ).select("kafka_timestamp", "data.*")
        
        # Add processing timestamp
        enriched_df = parsed_df.withColumn(
            "processing_timestamp", 
            current_timestamp()
        ).withColumn(
            "hour", 
            hour(col("processing_timestamp"))
        ).withColumn(
            "date",
            to_date(col("processing_timestamp"))
        )
        
        # Process metrics
        metrics_query = self._process_metrics(enriched_df)
        
        # Process anomalies
        anomaly_query = self._process_anomalies(enriched_df)
        
        # Start both queries
        metrics_query.start()
        anomaly_query.start()
        
        # Wait for termination
        self.spark.streams.awaitAnyTermination()
    
    def _process_metrics(self, df):
        """Process factory metrics and store aggregated results."""
        
        # Calculate windowed aggregations
        windowed_metrics = df \
            .withWatermark("processing_timestamp", "10 seconds") \
            .groupBy(
                window(col("processing_timestamp"), "1 minute"),
                col("agent_id"),
                col("hour"),
                col("date")
            ) \
            .agg(
                avg("efficiency").alias("avg_efficiency"),
                max("efficiency").alias("max_efficiency"),
                min("efficiency").alias("min_efficiency"),
                avg("throughput").alias("avg_throughput"),
                sum("products_completed").alias("total_products"),
                avg("reward").alias("avg_reward"),
                count("*").alias("record_count"),
                stddev("efficiency").alias("efficiency_stddev")
            ) \
            .select(
                col("window.start").alias("window_start"),
                col("window.end").alias("window_end"),
                col("agent_id"),
                col("hour"),
                col("date"),
                col("avg_efficiency"),
                col("max_efficiency"),
                col("min_efficiency"),
                col("avg_throughput"),
                col("total_products"),
                col("avg_reward"),
                col("record_count"),
                col("efficiency_stddev")
            )
        
        # Write to Cassandra
        def write_to_cassandra_metrics(batch_df, batch_id):
            try:
                batch_df.write \
                    .format("org.apache.spark.sql.cassandra") \
                    .option("keyspace", self.cassandra_keyspace) \
                    .option("table", "metrics_aggregated") \
                    .mode("append") \
                    .save()
                
                self.logger.info(f"Batch {batch_id}: Wrote {batch_df.count()} metrics records")
            except Exception as e:
                self.logger.error(f"Error writing metrics batch {batch_id}: {e}")
        
        return windowed_metrics.writeStream \
            .foreachBatch(write_to_cassandra_metrics) \
            .outputMode("append") \
            .trigger(processingTime="30 seconds") \
            .option("checkpointLocation", f"{self.checkpoint_location}/metrics")
    
    def _process_anomalies(self, df):
        """Detect and process anomalies."""
        
        # Anomaly detection logic
        anomalies_df = df.filter(
            (col("efficiency") < 0.7) |  # Low efficiency
            (col("throughput") < 50) |   # Low throughput  
            (col("reward") < -10)        # Very negative reward
        ).select(
            col("processing_timestamp").alias("timestamp"),
            lit("performance").alias("anomaly_type"),
            when(col("efficiency") < 0.5, "high")
                .when(col("efficiency") < 0.7, "medium")
                .otherwise("low").alias("severity"),
            concat(lit("Agent_"), col("agent_id")).alias("station"),
            concat(
                lit("Efficiency: "), col("efficiency"), 
                lit(", Throughput: "), col("throughput"),
                lit(", Reward: "), col("reward")
            ).alias("description"),
            map(
                lit("efficiency"), col("efficiency"),
                lit("throughput"), col("throughput"),
                lit("reward"), col("reward")
            ).alias("metrics")
        )
        
        # Write anomalies to Cassandra
        def write_to_cassandra_anomalies(batch_df, batch_id):
            try:
                if batch_df.count() > 0:
                    batch_df.write \
                        .format("org.apache.spark.sql.cassandra") \
                        .option("keyspace", self.cassandra_keyspace) \
                        .option("table", "anomalies") \
                        .mode("append") \
                        .save()
                    
                    self.logger.info(f"Batch {batch_id}: Detected {batch_df.count()} anomalies")
            except Exception as e:
                self.logger.error(f"Error writing anomalies batch {batch_id}: {e}")
        
        return anomalies_df.writeStream \
            .foreachBatch(write_to_cassandra_anomalies) \
            .outputMode("append") \
            .trigger(processingTime="10 seconds") \
            .option("checkpointLocation", f"{self.checkpoint_location}/anomalies")
    
    def setup_cassandra_tables(self):
        """Setup Cassandra tables for storing processed data."""
        from cassandra.cluster import Cluster
        
        try:
            cluster = Cluster([self.cassandra_host])
            session = cluster.connect()
            
            # Create keyspace
            session.execute(f"""
                CREATE KEYSPACE IF NOT EXISTS {self.cassandra_keyspace}
                WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}
            """)
            
            session.set_keyspace(self.cassandra_keyspace)
            
            # Create metrics table
            session.execute("""
                CREATE TABLE IF NOT EXISTS metrics_aggregated (
                    date date,
                    hour int,
                    agent_id int,
                    window_start timestamp,
                    window_end timestamp,
                    avg_efficiency double,
                    max_efficiency double,
                    min_efficiency double,
                    avg_throughput double,
                    total_products int,
                    avg_reward double,
                    record_count bigint,
                    efficiency_stddev double,
                    PRIMARY KEY ((date, hour), agent_id, window_start)
                )
            """)
            
            # Create anomalies table
            session.execute("""
                CREATE TABLE IF NOT EXISTS anomalies (
                    id uuid,
                    timestamp timestamp,
                    anomaly_type text,
                    severity text,
                    station text,
                    description text,
                    metrics map<text, double>,
                    PRIMARY KEY (id, timestamp)
                ) WITH CLUSTERING ORDER BY (timestamp DESC)
            """)
            
            # Create real-time metrics table
            session.execute("""
                CREATE TABLE IF NOT EXISTS real_time_metrics (
                    timestamp timestamp,
                    agent_id int,
                    efficiency double,
                    throughput double,
                    products_completed int,
                    position_x double,
                    position_y double,
                    position_z double,
                    task_type text,
                    reward double,
                    episode int,
                    step int,
                    PRIMARY KEY (agent_id, timestamp)
                ) WITH CLUSTERING ORDER BY (timestamp DESC)
            """)
            
            session.shutdown()
            cluster.shutdown()
            
            self.logger.info("Cassandra tables setup completed")
            
        except Exception as e:
            self.logger.error(f"Error setting up Cassandra tables: {e}")
    
    def stop_processing(self):
        """Stop the streaming processing."""
        self.spark.streams.active[0].stop()
        self.spark.stop()
        self.logger.info("Stopped factory analytics processing")


class FactoryDataGenerator:
    """Generate sample factory data for testing."""
    
    def __init__(self, kafka_bootstrap_servers="localhost:9092", topic="factory-metrics"):
        from kafka import KafkaProducer
        
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        self.topic = topic
        
    def generate_sample_data(self, num_records=1000, delay=1):
        """Generate sample factory data."""
        import time
        import random
        
        for i in range(num_records):
            for agent_id in range(4):
                data = {
                    "timestamp": datetime.now().isoformat(),
                    "agent_id": agent_id,
                    "efficiency": random.uniform(0.6, 0.99),
                    "throughput": random.uniform(40, 120),
                    "products_completed": random.randint(0, 5),
                    "position_x": random.uniform(-10, 10),
                    "position_y": 0.5,
                    "position_z": random.uniform(-10, 10),
                    "task_type": random.choice(["pickup", "deliver", "process", "quality_check"]),
                    "reward": random.uniform(-5, 15),
                    "episode": i // 100,
                    "step": i % 100
                }
                
                # Occasionally generate anomalous data
                if random.random() < 0.1:
                    data["efficiency"] = random.uniform(0.3, 0.6)
                    data["throughput"] = random.uniform(10, 40)
                    data["reward"] = random.uniform(-20, -5)
                
                self.producer.send(self.topic, data)
            
            time.sleep(delay)
            
            if i % 100 == 0:
                print(f"Generated {i * 4} records...")
        
        self.producer.flush()
        print(f"Generated {num_records * 4} total records")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Factory Analytics Processor")
    parser.add_argument("--mode", choices=["process", "setup", "generate"], default="process")
    parser.add_argument("--kafka-servers", default="localhost:9092")
    parser.add_argument("--kafka-topic", default="factory-metrics")
    parser.add_argument("--cassandra-host", default="localhost")
    parser.add_argument("--keyspace", default="factory_analytics")
    parser.add_argument("--checkpoint", default="./checkpoints")
    parser.add_argument("--num-records", type=int, default=1000)
    parser.add_argument("--delay", type=float, default=1.0)
    
    args = parser.parse_args()
    
    if args.mode == "setup":
        processor = FactoryAnalyticsProcessor(
            kafka_bootstrap_servers=args.kafka_servers,
            kafka_topic=args.kafka_topic,
            cassandra_host=args.cassandra_host,
            cassandra_keyspace=args.keyspace,
            checkpoint_location=args.checkpoint
        )
        processor.setup_cassandra_tables()
        
    elif args.mode == "generate":
        generator = FactoryDataGenerator(
            kafka_bootstrap_servers=args.kafka_servers,
            topic=args.kafka_topic
        )
        generator.generate_sample_data(
            num_records=args.num_records,
            delay=args.delay
        )
        
    elif args.mode == "process":
        processor = FactoryAnalyticsProcessor(
            kafka_bootstrap_servers=args.kafka_servers,
            kafka_topic=args.kafka_topic,
            cassandra_host=args.cassandra_host,
            cassandra_keyspace=args.keyspace,
            checkpoint_location=args.checkpoint
        )
        processor.start_processing()