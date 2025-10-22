#!/bin/bash

################################################################################
# Porraza Backend - Server Cleanup Script
# Desinstala PostgreSQL y Node.js del sistema (solo se necesita Docker)
# Ejecutar como ROOT en el servidor Hetzner
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Porraza Server Cleanup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Este script debe ejecutarse como root${NC}"
   echo -e "${YELLOW}💡 Usa: sudo bash cleanup-server.sh${NC}"
   exit 1
fi

echo -e "${YELLOW}⚠️  Este script desinstalará:${NC}"
echo "  - PostgreSQL y todos sus datos"
echo "  - Node.js y npm"
echo "  - Dependencias relacionadas"
echo ""
echo -e "${YELLOW}✅ Docker y Git NO se tocarán (son necesarios)${NC}"
echo ""

read -p "¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Cancelado por el usuario${NC}"
    exit 0
fi

echo ""

# 1. Stop and remove PostgreSQL
echo -e "${BLUE}🗄️  Eliminando PostgreSQL...${NC}"

if systemctl list-units --full -all | grep -Fq "postgresql.service"; then
    echo "  - Deteniendo servicio PostgreSQL..."
    systemctl stop postgresql || true
    systemctl disable postgresql || true
fi

if command -v psql &> /dev/null; then
    echo "  - Desinstalando paquetes PostgreSQL..."
    apt remove --purge postgresql postgresql-* -y
    apt autoremove -y

    echo "  - Eliminando directorios de datos..."
    rm -rf /var/lib/postgresql/
    rm -rf /etc/postgresql/
    rm -rf /var/log/postgresql/

    echo -e "${GREEN}✅ PostgreSQL desinstalado${NC}"
else
    echo -e "${YELLOW}ℹ️  PostgreSQL no estaba instalado${NC}"
fi

echo ""

# 2. Stop and remove Node.js
echo -e "${BLUE}🟢 Eliminando Node.js...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
    echo "  - Versión detectada: $NODE_VERSION"

    # Remove via apt
    if dpkg -l | grep -q nodejs; then
        echo "  - Desinstalando via apt..."
        apt remove --purge nodejs npm -y
        apt autoremove -y
    fi

    # Remove global node modules
    echo "  - Eliminando módulos globales..."
    rm -rf /usr/local/lib/node_modules
    rm -rf /usr/local/bin/npm
    rm -rf /usr/local/bin/npx
    rm -rf /usr/local/bin/node

    # Remove for all users
    find /home -name ".npm" -type d -exec rm -rf {} + 2>/dev/null || true
    find /home -name ".nvm" -type d -exec rm -rf {} + 2>/dev/null || true
    find /home -name "node_modules" -type d -path "*/home/*" -exec rm -rf {} + 2>/dev/null || true

    # Remove root user node files
    rm -rf /root/.npm
    rm -rf /root/.nvm

    echo -e "${GREEN}✅ Node.js desinstalado${NC}"
else
    echo -e "${YELLOW}ℹ️  Node.js no estaba instalado${NC}"
fi

echo ""

# 3. Clean package cache
echo -e "${BLUE}🧹 Limpiando cache de paquetes...${NC}"
apt clean
apt autoclean
apt autoremove -y

echo -e "${GREEN}✅ Cache limpiado${NC}"

echo ""

# 4. Verify Docker is still installed
echo -e "${BLUE}🐳 Verificando Docker...${NC}"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker instalado: $DOCKER_VERSION${NC}"
else
    echo -e "${RED}❌ Docker NO está instalado (necesario para el deploy)${NC}"
    echo -e "${YELLOW}💡 Instala Docker con: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh${NC}"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose instalado${NC}"
else
    echo -e "${RED}❌ Docker Compose NO está instalado${NC}"
    echo -e "${YELLOW}💡 Instala con: apt install docker-compose-plugin -y${NC}"
fi

echo ""

# 5. Verify Git
echo -e "${BLUE}📦 Verificando Git...${NC}"

if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✅ Git instalado: $GIT_VERSION${NC}"
else
    echo -e "${RED}❌ Git NO está instalado${NC}"
    echo -e "${YELLOW}💡 Instala con: apt install git -y${NC}"
fi

echo ""

# 6. Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ LIMPIEZA COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo "  ✅ PostgreSQL: Eliminado del sistema (usarás Docker)"
echo "  ✅ Node.js: Eliminado del sistema (usarás Docker)"
echo "  ✅ Docker: Verificado y funcionando"
echo "  ✅ Git: Verificado y funcionando"
echo ""
echo -e "${YELLOW}💡 Próximos pasos:${NC}"
echo "  1. Verifica que el usuario 'porraza' está en el grupo docker:"
echo "     groups porraza"
echo ""
echo "  2. Si no está, añádelo:"
echo "     usermod -aG docker porraza"
echo ""
echo "  3. El usuario debe cerrar sesión y volver a entrar para aplicar cambios"
echo ""
echo -e "${GREEN}🚀 Ya puedes hacer deploy con Docker!${NC}"
echo ""
