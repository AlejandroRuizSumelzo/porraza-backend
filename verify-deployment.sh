#!/bin/bash

################################################################################
# Porraza Backend - Deployment Verification Script
# Verifica que el deployment esté funcionando correctamente
# Ejecutar como usuario 'porraza' desde ~/porraza-backend
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🔍 Verificación de Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is accessible
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ No se puede acceder a Docker${NC}"
    echo -e "${YELLOW}💡 Verifica que el usuario esté en el grupo 'docker'${NC}"
    exit 1
fi

# Check if in correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ No se encuentra docker-compose.yml${NC}"
    echo -e "${YELLOW}💡 Ejecuta este script desde ~/porraza-backend${NC}"
    exit 1
fi

# 1. Container Status
echo -e "${CYAN}📦 Estado de Contenedores:${NC}"
echo ""
docker compose ps
echo ""

# 2. Check if backend is running
if docker compose ps | grep -q "porraza_backend.*Up"; then
    echo -e "${GREEN}✅ Backend container está corriendo${NC}"
else
    echo -e "${RED}❌ Backend container NO está corriendo${NC}"
    echo ""
    echo -e "${YELLOW}Ver logs con: docker compose logs backend${NC}"
    exit 1
fi

# 3. Check if PostgreSQL is running
if docker compose ps | grep -q "porraza_postgres.*Up"; then
    echo -e "${GREEN}✅ PostgreSQL container está corriendo${NC}"
else
    echo -e "${RED}❌ PostgreSQL container NO está corriendo${NC}"
    exit 1
fi

echo ""

# 4. Check backend health
echo -e "${CYAN}🏥 Health Check del Backend:${NC}"

HEALTHY=false
for i in {1..10}; do
    if docker compose ps | grep -q "porraza_backend.*healthy"; then
        HEALTHY=true
        break
    fi
    sleep 1
done

if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✅ Backend está healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend está corriendo pero no está 'healthy' todavía${NC}"
    echo -e "${YELLOW}   Esto puede ser normal si el container acaba de iniciar${NC}"
fi

echo ""

# 5. Test HTTP endpoint
echo -e "${CYAN}🌐 Probando endpoints HTTP:${NC}"

# Test localhost
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo -e "${GREEN}✅ http://localhost:3001 responde (200 OK)${NC}"
else
    echo -e "${YELLOW}⚠️  http://localhost:3001 no responde correctamente${NC}"
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# Test external IP
if curl -s -o /dev/null -w "%{http_code}" http://${SERVER_IP}:3001 --max-time 5 | grep -q "200"; then
    echo -e "${GREEN}✅ http://${SERVER_IP}:3001 responde (200 OK)${NC}"
else
    echo -e "${YELLOW}⚠️  http://${SERVER_IP}:3001 no responde${NC}"
    echo -e "${YELLOW}   Verifica el firewall: sudo ufw allow 3001/tcp${NC}"
fi

echo ""

# 6. Database connection
echo -e "${CYAN}🗄️  Verificando conexión a PostgreSQL:${NC}"

if docker exec porraza_postgres pg_isready -U root &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL está aceptando conexiones${NC}"
else
    echo -e "${RED}❌ PostgreSQL NO está respondiendo${NC}"
fi

echo ""

# 7. Show recent logs
echo -e "${CYAN}📋 Últimos logs del backend:${NC}"
echo -e "${BLUE}─────────────────────────────────────${NC}"
docker compose logs --tail=20 backend
echo -e "${BLUE}─────────────────────────────────────${NC}"

echo ""

# 8. Resource usage
echo -e "${CYAN}💻 Uso de recursos:${NC}"
docker stats --no-stream porraza_backend porraza_postgres

echo ""

# 9. Network info
echo -e "${CYAN}🌍 Información de red:${NC}"
echo "  • IP del servidor: ${SERVER_IP}"
echo "  • Puerto backend:  3001"
echo ""
echo "  • API Base:        http://${SERVER_IP}:3001"
echo "  • Swagger Docs:    http://${SERVER_IP}:3001/api"

echo ""

# 10. Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ VERIFICACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}📝 Comandos útiles:${NC}"
echo "  • Ver logs:              docker compose logs -f backend"
echo "  • Reiniciar backend:     docker compose restart backend"
echo "  • Ver estado:            docker compose ps"
echo "  • Detener todo:          docker compose down"
echo "  • Ver uso de recursos:   docker stats"
echo ""

# Check if firewall might be blocking
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep "3001" || echo "not found")
    if echo "$UFW_STATUS" | grep -q "ALLOW"; then
        echo -e "${GREEN}✅ Firewall: Puerto 3001 está abierto${NC}"
    else
        echo -e "${YELLOW}⚠️  Firewall: Puerto 3001 podría estar bloqueado${NC}"
        echo -e "${YELLOW}   Ejecuta: sudo ufw allow 3001/tcp${NC}"
    fi
fi

echo ""
