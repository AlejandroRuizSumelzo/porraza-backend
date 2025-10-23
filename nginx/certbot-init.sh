#!/bin/bash

################################################################################
# Certbot SSL Certificate Initialization Script
#
# This script obtains SSL certificates from Let's Encrypt for be.porraza.com
# using Certbot in standalone mode.
#
# Usage:
#   sudo bash nginx/certbot-init.sh
#
# Requirements:
#   - Domain be.porraza.com must point to this server's IP
#   - Ports 80 and 443 must be open in firewall
#   - Nginx must be stopped before running this script
################################################################################

set -e  # Exit on error

DOMAIN="be.porraza.com"
EMAIL="admin@porraza.com"  # Change this to your email

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Certbot SSL Certificate Initialization${NC}"
echo -e "${BLUE}  Domain: ${DOMAIN}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Check if domain resolves to this server
echo -e "${BLUE}[1/6] Checking DNS resolution...${NC}"
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠️  Warning: DNS might not be configured correctly${NC}"
    echo -e "   Server IP: ${SERVER_IP}"
    echo -e "   Domain IP: ${DOMAIN_IP}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ DNS resolves correctly to ${SERVER_IP}${NC}"
fi

# Step 2: Install Certbot if not installed
echo -e "${BLUE}[2/6] Checking Certbot installation...${NC}"
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get update
    apt-get install -y certbot
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# Step 3: Stop Nginx if running (to free port 80)
echo -e "${BLUE}[3/6] Stopping Nginx container...${NC}"
if docker ps | grep -q porraza_nginx; then
    docker stop porraza_nginx || true
    echo -e "${GREEN}✓ Nginx container stopped${NC}"
else
    echo -e "${GREEN}✓ Nginx container not running${NC}"
fi

# Step 4: Obtain certificate using standalone mode
echo -e "${BLUE}[4/6] Obtaining SSL certificate from Let's Encrypt...${NC}"
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --domains $DOMAIN \
    --keep-until-expiring \
    --preferred-challenges http

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    exit 1
fi

# Step 5: Set correct permissions
echo -e "${BLUE}[5/6] Setting certificate permissions...${NC}"
chmod -R 755 /etc/letsencrypt/live/
chmod -R 755 /etc/letsencrypt/archive/
echo -e "${GREEN}✓ Permissions set${NC}"

# Step 6: Setup auto-renewal cron job
echo -e "${BLUE}[6/6] Setting up automatic certificate renewal...${NC}"
CRON_CMD="0 3 * * * certbot renew --quiet --post-hook 'docker restart porraza_nginx'"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -
echo -e "${GREEN}✓ Auto-renewal configured (runs daily at 3 AM)${NC}"

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ SSL Certificate Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Certificate details:${NC}"
certbot certificates
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start Nginx: ${YELLOW}docker compose up -d nginx${NC}"
echo -e "  2. Test HTTPS: ${YELLOW}curl -I https://${DOMAIN}${NC}"
echo ""
echo -e "${GREEN}Certificate will auto-renew before expiration.${NC}"
echo ""
