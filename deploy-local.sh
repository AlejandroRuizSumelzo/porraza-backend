#!/bin/bash

################################################################################
# Porraza Backend - Local Deployment Script
# Para usuario 'porraza' (sin permisos root)
# Ejecutar desde: ~/porraza-backend
################################################################################

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}🔹 $1${NC}"
}

# Banner
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🚀 Porraza Backend Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    log_error "Error: Este script debe ejecutarse desde el directorio del proyecto"
    log_info "Asegúrate de estar en ~/porraza-backend"
    exit 1
fi

log_success "Directorio del proyecto verificado"
echo ""

# Step 1: Pull latest changes
log_step "Paso 1/6: Actualizando código desde GitHub"
log_info "Pulling cambios de la rama 'main'..."

git fetch origin
git reset --hard origin/main

log_success "Código actualizado"
echo ""

# Step 2: Check .env file
log_step "Paso 2/6: Verificando configuración"

if [ ! -f ".env" ]; then
    log_error "Archivo .env no encontrado"

    if [ -f ".env.example" ]; then
        log_warning "Creando .env desde .env.example..."
        cp .env.example .env
        log_warning "Por favor, edita el archivo .env con tus valores de producción:"
        log_info "  nano .env"
        log_warning "Luego vuelve a ejecutar este script"
        exit 1
    else
        log_error ".env.example no encontrado"
        exit 1
    fi
fi

log_success "Archivo .env encontrado"

# Verify critical env vars
if ! grep -q "DB_PASSWORD" .env || grep -q "DB_PASSWORD=root" .env; then
    log_warning "Verifica que DB_PASSWORD en .env sea una contraseña segura (no 'root')"
fi

echo ""

# Step 3: Check Docker permissions
log_step "Paso 3/6: Verificando permisos de Docker"

if ! docker ps &> /dev/null; then
    log_error "No tienes permisos para ejecutar Docker"
    log_info "Solución: El usuario debe estar en el grupo 'docker'"
    log_info "Ejecuta como root:"
    log_info "  usermod -aG docker porraza"
    log_info "Luego cierra sesión y vuelve a entrar"
    exit 1
fi

log_success "Permisos de Docker verificados"
echo ""

# Step 4: Stop existing containers
log_step "Paso 4/6: Deteniendo contenedores existentes"

if docker compose ps -q 2>/dev/null | grep -q .; then
    log_info "Deteniendo contenedores..."
    docker compose down
    log_success "Contenedores detenidos"
else
    log_info "No hay contenedores corriendo"
fi

echo ""

# Step 5: Build and start containers
log_step "Paso 5/6: Construyendo y desplegando contenedores"

log_info "Construyendo imagen del backend (esto puede tardar 2-5 minutos)..."
docker compose build --no-cache backend

log_success "Imagen construida exitosamente"

log_info "Iniciando servicios..."
docker compose up -d

log_success "Servicios iniciados"
echo ""

# Step 6: Health check
log_step "Paso 6/6: Verificando salud de la aplicación"

log_info "Esperando a que el backend esté listo..."

HEALTHY=false
for i in {1..60}; do
    if docker compose ps | grep -q "porraza_backend.*Up.*healthy"; then
        HEALTHY=true
        break
    fi

    # Show progress
    if [ $((i % 5)) -eq 0 ]; then
        echo -n "."
    fi

    sleep 2
done

echo ""

if [ "$HEALTHY" = true ]; then
    log_success "Backend está healthy y corriendo"
else
    log_warning "Backend está corriendo pero el health check no ha pasado todavía"
    log_info "Revisa los logs con: docker compose logs backend"
fi

echo ""

# Show container status
log_info "Estado de los contenedores:"
docker compose ps

echo ""

# Show recent logs
log_info "Últimas líneas de logs del backend:"
echo -e "${CYAN}─────────────────────────────────────${NC}"
docker compose logs --tail=15 backend
echo -e "${CYAN}─────────────────────────────────────${NC}"

echo ""

# Cleanup old images
log_info "Limpiando imágenes antiguas..."
docker image prune -f &> /dev/null
log_success "Limpieza completada"

echo ""

# Final summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "${BLUE}🌐 Accede a tu API:${NC}"
echo "  • API Base:    http://${SERVER_IP}:3001"
echo "  • Swagger:     http://${SERVER_IP}:3001/api"
echo "  • Health:      http://${SERVER_IP}:3001"
echo ""

echo -e "${BLUE}📝 Comandos útiles:${NC}"
echo "  • Ver logs en tiempo real:  docker compose logs -f backend"
echo "  • Ver todos los logs:       docker compose logs -f"
echo "  • Reiniciar backend:        docker compose restart backend"
echo "  • Ver estado:               docker compose ps"
echo "  • Detener todo:             docker compose down"
echo "  • Conectar a PostgreSQL:    docker exec -it porraza_postgres psql -U \$DB_USER -d \$DB_NAME"
echo ""

echo -e "${CYAN}💡 Para volver a desplegar: ./deploy-local.sh${NC}"
echo ""
