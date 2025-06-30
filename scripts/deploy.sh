#!/bin/bash

# Deployment script for Factory Digital Twin
set -e

ENVIRONMENT=${1:-staging}
NAMESPACE="factory-digital-twin"

if [ "$ENVIRONMENT" = "production" ]; then
    NAMESPACE="factory-digital-twin"
else
    NAMESPACE="factory-digital-twin-staging"
fi

echo "🚀 Deploying Factory Digital Twin to $ENVIRONMENT environment..."

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is required but not installed."
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo "❌ Helm is required but not installed."
    exit 1
fi

# Build and push images (if in CI/CD)
if [ "$CI" = "true" ]; then
    echo "📦 Building and pushing images..."
    docker build -t $IMAGE_REGISTRY/factory-backend:$IMAGE_TAG -f Dockerfile.backend .
    docker build -t $IMAGE_REGISTRY/factory-frontend:$IMAGE_TAG -f Dockerfile.frontend .
    docker build -t $IMAGE_REGISTRY/factory-unity:$IMAGE_TAG -f Dockerfile.unity .
    
    docker push $IMAGE_REGISTRY/factory-backend:$IMAGE_TAG
    docker push $IMAGE_REGISTRY/factory-frontend:$IMAGE_TAG
    docker push $IMAGE_REGISTRY/factory-unity:$IMAGE_TAG
fi

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy with Helm
echo "⚙️  Deploying with Helm..."
helm upgrade --install factory-digital-twin ./helm/factory-digital-twin \
    --namespace $NAMESPACE \
    --set-string global.imageTag=${IMAGE_TAG:-latest} \
    --set global.environment=$ENVIRONMENT \
    -f helm/factory-digital-twin/values-$ENVIRONMENT.yaml \
    --timeout 10m \
    --wait

# Verify deployment
echo "✅ Verifying deployment..."
kubectl wait --for=condition=available --timeout=300s deployment/factory-digital-twin-backend -n $NAMESPACE

echo "🎉 Deployment completed successfully!"
echo "📊 Check status: kubectl get pods -n $NAMESPACE"