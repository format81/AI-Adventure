#!/bin/bash
set -e

# ============================================
# AI Avventura - Deploy to Azure Container Apps
# ============================================

# --- CONFIGURAZIONE (modifica questi valori) ---
RESOURCE_GROUP="rg-ai-avventura"
LOCATION="westeurope"
ACR_NAME="acraiavventura$(openssl rand -hex 3)"  # deve essere unico globally
CONTAINER_APP_ENV="cae-ai-avventura"
CONTAINER_APP_NAME="ai-avventura"
IMAGE_NAME="ai-avventura"
IMAGE_TAG="latest"

# Variabili d'ambiente per l'app
ADMIN_USERS="${ADMIN_USERS:-antonio:cambiami,maria:cambiami}"
DEMO_PASSWORD="${DEMO_PASSWORD:-demo2026}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"

echo "=========================================="
echo "  AI Avventura - Deploy su Azure"
echo "=========================================="

# 1. Verifica login Azure
echo ""
echo "[1/6] Verifica login Azure..."
az account show --query "{name:name, id:id}" -o table || {
    echo "Non sei loggato. Esegui: az login"
    exit 1
}

# 2. Crea Resource Group
echo ""
echo "[2/6] Creazione Resource Group: $RESOURCE_GROUP..."
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    -o none

# 3. Crea Azure Container Registry
echo ""
echo "[3/6] Creazione Container Registry: $ACR_NAME..."
az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    -o none

# Ottieni credenziali ACR
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# 4. Build e push immagine
echo ""
echo "[4/6] Build e push immagine Docker su ACR..."
az acr build \
    --registry "$ACR_NAME" \
    --image "$IMAGE_NAME:$IMAGE_TAG" \
    .

# 5. Crea Container Apps Environment
echo ""
echo "[5/6] Creazione Container Apps Environment..."
az containerapp env create \
    --name "$CONTAINER_APP_ENV" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    -o none

# 6. Deploy Container App
echo ""
echo "[6/6] Deploy Container App..."
az containerapp create \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CONTAINER_APP_ENV" \
    --image "$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG" \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --target-port 8080 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 3 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --env-vars \
        "ADMIN_USERS=$ADMIN_USERS" \
        "DEMO_PASSWORD=$DEMO_PASSWORD" \
        "SESSION_SECRET=$SESSION_SECRET" \
        "NODE_ENV=production" \
    -o none

# Ottieni URL dell'app
APP_URL=$(az containerapp show \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" \
    -o tsv)

echo ""
echo "=========================================="
echo "  Deploy completato!"
echo "=========================================="
echo ""
echo "  URL app: https://$APP_URL"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container Registry: $ACR_NAME"
echo ""
echo "  Per aggiornare il deploy:"
echo "    az acr build --registry $ACR_NAME --image $IMAGE_NAME:$IMAGE_TAG ."
echo "    az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --image $ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "  Per eliminare tutto:"
echo "    az group delete --name $RESOURCE_GROUP --yes"
echo ""
