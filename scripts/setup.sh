#!/bin/bash

# Factory Digital Twin Setup Script
set -e

echo "🏭 Setting up Factory Digital Twin & RL Lab..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed."
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check kubectl (optional)
if command -v kubectl &> /dev/null; then
    echo "✅ kubectl found"
else
    echo "⚠️  kubectl not found. Install it if you plan to use Kubernetes."
fi

# Check Terraform (optional)
if command -v terraform &> /dev/null; then
    echo "✅ Terraform found"
else
    echo "⚠️  Terraform not found. Install it if you plan to deploy to cloud."
fi

echo "✅ Prerequisites check completed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p {backend/logs,backend/experiments,backend/checkpoints}
mkdir -p {unity/logs,monitoring/prometheus,monitoring/grafana/dashboards}
mkdir -p terraform/.terraform

# Set up environment variables
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file. Please update it with your configuration."
fi

# Build Docker images
echo "🐳 Building Docker images..."
echo "This may take several minutes..."

docker-compose build --parallel

echo "✅ Docker images built successfully"

# Initialize infrastructure (optional)
read -p "🤔 Do you want to set up local infrastructure with Docker Compose? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting infrastructure services..."
    docker-compose up -d cassandra kafka zookeeper elasticsearch
    
    echo "⏳ Waiting for services to be ready..."
    sleep 30
    
    # Setup Cassandra tables
    echo "🗄️  Setting up Cassandra tables..."
    docker-compose exec -T cassandra cqlsh -f /app/setup/cassandra_schema.cql || true
    
    echo "✅ Infrastructure services started"
fi

# Setup Kubernetes (optional)
read -p "🤔 Do you want to set up Kubernetes manifests? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v kubectl &> /dev/null; then
        echo "☸️  Setting up Kubernetes..."
        kubectl apply -f k8s/namespace.yaml
        echo "✅ Kubernetes namespace created"
        echo "💡 Run 'kubectl apply -f k8s/' to deploy all services"
    else
        echo "❌ kubectl not found. Please install kubectl first."
    fi
fi

# Setup Terraform (optional)
read -p "🤔 Do you want to initialize Terraform for cloud deployment? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v terraform &> /dev/null; then
        echo "☁️  Initializing Terraform..."
        cd terraform
        
        if [ ! -f terraform.tfvars ]; then
            cp terraform.tfvars.example terraform.tfvars
            echo "📝 Created terraform.tfvars. Please update it with your GCP configuration."
        fi
        
        terraform init
        echo "✅ Terraform initialized"
        echo "💡 Run 'terraform plan' and 'terraform apply' to deploy to GCP"
        cd ..
    else
        echo "❌ Terraform not found. Please install Terraform first."
    fi
fi

# Setup development environment
echo "💻 Setting up development environment..."

# Install Python dependencies
if command -v python3 &> /dev/null; then
    echo "🐍 Setting up Python environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "✅ Python environment set up"
fi

# Install Node.js dependencies
if command -v npm &> /dev/null; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed"
fi

# Print next steps
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start the development environment:"
echo "   npm run dev (for frontend)"
echo "   docker-compose up (for backend services)"
echo ""
echo "3. Access the applications:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - Ray Dashboard: http://localhost:8265"
echo "   - Grafana: http://localhost:3001"
echo "   - Kibana: http://localhost:5601"
echo ""
echo "4. For cloud deployment:"
echo "   - Update terraform/terraform.tfvars"
echo "   - Run: cd terraform && terraform apply"
echo ""
echo "📚 Documentation: https://github.com/your-repo/factory-digital-twin"
echo "🐛 Issues: https://github.com/your-repo/factory-digital-twin/issues"