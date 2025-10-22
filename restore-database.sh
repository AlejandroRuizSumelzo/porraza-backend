#!/bin/bash

################################################################################
# Porraza Backend - Database Restore Script
# Restaura un dump SQL en el contenedor PostgreSQL de producción
# Ejecutar como usuario 'porraza' desde ~/porraza-backend
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🗄️  Database Restore Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if dump file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No dump file specified${NC}"
    echo ""
    echo -e "${YELLOW}Uso:${NC}"
    echo "  bash restore-database.sh <dump_file.sql>"
    echo ""
    echo -e "${YELLOW}Ejemplo:${NC}"
    echo "  bash restore-database.sh porraza_db_dump.sql"
    echo ""
    exit 1
fi

DUMP_FILE="$1"

# Check if dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}❌ Error: File '$DUMP_FILE' not found${NC}"
    echo ""
    echo -e "${YELLOW}Archivos .sql disponibles:${NC}"
    ls -lh *.sql 2>/dev/null || echo "  No hay archivos .sql en este directorio"
    echo ""
    exit 1
fi

# Show file info
FILE_SIZE=$(ls -lh "$DUMP_FILE" | awk '{print $5}')
echo -e "${BLUE}📄 Archivo: ${CYAN}$DUMP_FILE${NC} (${FILE_SIZE})"
echo ""

# Verify Docker container is running
if ! docker compose ps | grep -q "porraza_postgres.*Up"; then
    echo -e "${RED}❌ Error: PostgreSQL container is not running${NC}"
    echo -e "${YELLOW}💡 Start containers first: docker compose up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
echo ""

# Load .env variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✅ Environment variables loaded from .env${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found, using defaults${NC}"
    DB_NAME=${DB_NAME:-porraza_db}
    DB_USER=${DB_USER:-root}
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will replace ALL data in the database!${NC}"
echo -e "${YELLOW}   Database: ${CYAN}$DB_NAME${NC}"
echo -e "${YELLOW}   User: ${CYAN}$DB_USER${NC}"
echo ""

read -p "Are you sure you want to continue? (yes/NO): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${BLUE}Cancelled by user${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Starting database restore...${NC}"
echo ""

# Step 1: Drop existing database (if exists)
echo -e "${CYAN}1/4 Dropping existing database (if exists)...${NC}"
docker exec -i porraza_postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
echo -e "${GREEN}✅ Database dropped${NC}"
echo ""

# Step 2: Create fresh database
echo -e "${CYAN}2/4 Creating fresh database...${NC}"
docker exec -i porraza_postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';"
echo -e "${GREEN}✅ Database created${NC}"
echo ""

# Step 3: Restore dump
echo -e "${CYAN}3/4 Restoring dump (this may take a moment)...${NC}"
cat "$DUMP_FILE" | docker exec -i porraza_postgres psql -U "$DB_USER" -d "$DB_NAME"
echo -e "${GREEN}✅ Dump restored${NC}"
echo ""

# Step 4: Verify restore
echo -e "${CYAN}4/4 Verifying restore...${NC}"

# Count tables
TABLE_COUNT=$(docker exec porraza_postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Restore successful! Found $TABLE_COUNT tables${NC}"
    echo ""

    # Show tables
    echo -e "${BLUE}📋 Tables in database:${NC}"
    docker exec porraza_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"

else
    echo -e "${YELLOW}⚠️  No tables found. The dump might be empty or restore failed.${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ RESTORE COMPLETED${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}💡 Next steps:${NC}"
echo "  1. Restart backend to apply changes:"
echo "     docker compose restart backend"
echo ""
echo "  2. Verify application works:"
echo "     curl http://localhost:3001"
echo ""
