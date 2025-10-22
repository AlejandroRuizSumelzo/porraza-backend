# Deployment Guide - Porraza Backend

Complete guide for deploying the Porraza backend to Hetzner Ubuntu 22.04 server with automated CI/CD.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup (One-time)](#server-setup-one-time)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [First Deployment](#first-deployment)
5. [Automated Deployments](#automated-deployments)
6. [Management Commands](#management-commands)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### Local Machine
- Git configured with access to the repository
- SSH access to your Hetzner server

### Hetzner Server (Ubuntu 22.04)
- Root or sudo access
- Public IP address
- At least 2GB RAM, 20GB disk space
- Ports 80, 443, 3001 open (configure firewall)

---

## Server Setup (One-time)

Connect to your Hetzner server via SSH and follow these steps:

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group (optional, allows running docker without sudo)
sudo usermod -aG docker $USER

# Verify installation
docker --version
```

### 3. Install Docker Compose

```bash
# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker compose version
```

### 4. Install Git

```bash
sudo apt install git -y
git --version
```

### 5. Create Application Directory

```bash
sudo mkdir -p /opt/porraza-backend
sudo chown $USER:$USER /opt/porraza-backend
```

### 6. Clone Repository

```bash
cd /opt/porraza-backend
git clone https://github.com/AlejandroRuizSumelzo/porraza-backend.git .
```

### 7. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your production values
nano .env
```

**Important:** Update these values in `.env`:
- `DB_PASSWORD`: Use a strong, unique password
- `PORT`: Keep 3001 or change if needed
- Add any other required environment variables

### 8. Make Deploy Script Executable

```bash
chmod +x deploy.sh
```

### 9. Configure Firewall (UFW)

```bash
# Install UFW if not present
sudo apt install ufw -y

# Allow SSH (important - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port
sudo ufw allow 3001/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 10. Generate SSH Key for GitHub Actions

```bash
# Generate a dedicated SSH key for deployments (on the server)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Add public key to authorized_keys
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# Display private key (you'll need this for GitHub Secrets)
cat ~/.ssh/github_actions_deploy
```

**⚠️ IMPORTANT:** Copy the entire private key output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`). You'll add this to GitHub Secrets.

---

## GitHub Secrets Configuration

Go to your GitHub repository: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `SSH_PRIVATE_KEY` | Private key from step 10 above | SSH key for deployment access |
| `SERVER_HOST` | Your server IP address | e.g., `123.45.67.89` |
| `SERVER_USER` | SSH username | e.g., `root` or your sudo user |

### How to Add Secrets:

1. Click **"New repository secret"**
2. Name: `SSH_PRIVATE_KEY`
3. Secret: Paste the entire private key (including headers)
4. Click **"Add secret"**
5. Repeat for `SERVER_HOST` and `SERVER_USER`

---

## First Deployment

### Option A: Manual Deployment (Recommended for first time)

SSH into your server and run:

```bash
cd /opt/porraza-backend
sudo ./deploy.sh
```

This will:
1. ✅ Check all requirements (Docker, Git, etc.)
2. ✅ Pull latest code from `main` branch
3. ✅ Verify `.env` file exists
4. ✅ Build Docker images
5. ✅ Start PostgreSQL and Backend containers
6. ✅ Run health checks
7. ✅ Show deployment status

### Option B: Trigger GitHub Actions Manually

1. Go to your repository on GitHub
2. Click **"Actions"** tab
3. Select **"Deploy to Hetzner"** workflow
4. Click **"Run workflow"** → Select `main` branch → **"Run workflow"**

---

## Automated Deployments

Once configured, every push to `main` branch will automatically:

1. ✅ Trigger GitHub Actions workflow
2. ✅ Connect to your Hetzner server via SSH
3. ✅ Run the deployment script
4. ✅ Pull latest code
5. ✅ Rebuild and restart containers
6. ✅ Verify deployment health
7. ✅ Notify you of success/failure

**No manual intervention required!** Just push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will handle the rest.

---

## Management Commands

### View Application Status

```bash
cd /opt/porraza-backend
docker-compose ps
```

### View Logs

```bash
# Backend logs (real-time)
docker-compose logs -f backend

# PostgreSQL logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

### Restart Services

```bash
# Restart backend only
docker-compose restart backend

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Start all services
docker-compose up -d
```

### Access Database

```bash
# Connect to PostgreSQL container
docker exec -it porraza_postgres psql -U root -d porraza_db

# Run SQL from host
docker exec porraza_postgres psql -U root -d porraza_db -c "SELECT * FROM users;"
```

### Check Container Health

```bash
docker ps
docker stats
```

### Manual Deployment

```bash
cd /opt/porraza-backend
sudo ./deploy.sh
```

### Update Environment Variables

```bash
# Edit .env file
nano /opt/porraza-backend/.env

# Restart backend to apply changes
docker-compose restart backend
```

---

## API Access

After successful deployment, your API will be available at:

- **API Base URL:** `http://YOUR_SERVER_IP:3001`
- **Swagger Docs:** `http://YOUR_SERVER_IP:3001/api`
- **Health Check:** `http://YOUR_SERVER_IP:3001` (should return 200 OK)

### Test with curl:

```bash
curl http://YOUR_SERVER_IP:3001
```

---

## Troubleshooting

### 1. Deployment fails with "Permission denied"

**Solution:** Ensure SSH key is properly configured:

```bash
# On server
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 2. Backend container keeps restarting

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- Database connection failed → Check `.env` credentials
- Port already in use → Change `PORT` in `.env`

### 3. Cannot connect to database

**Verify PostgreSQL is running:**
```bash
docker-compose ps postgres
docker-compose logs postgres
```

**Test connection:**
```bash
docker exec porraza_postgres pg_isready -U root
```

### 4. GitHub Actions workflow fails

**Check:**
1. Secrets are properly configured (`SSH_PRIVATE_KEY`, `SERVER_HOST`, `SERVER_USER`)
2. SSH key has correct permissions
3. Server is reachable from GitHub Actions
4. Deployment script exists at `/opt/porraza-backend/deploy.sh`

**View workflow logs:**
- Go to GitHub → Actions → Click on failed workflow → View logs

### 5. Port 3001 is blocked

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 3001/tcp
```

### 6. Out of disk space

**Check disk usage:**
```bash
df -h
docker system df
```

**Clean up:**
```bash
docker system prune -a
docker volume prune
```

---

## Security Best Practices

### 1. Use Strong Passwords

- Change default database password in `.env`
- Never commit `.env` to Git (already in `.gitignore`)

### 2. Keep System Updated

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Enable Automatic Security Updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Use SSH Keys Only (Disable Password Auth)

Edit SSH config:
```bash
sudo nano /etc/ssh/sshd_config
```

Set:
```
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 5. Setup SSL/TLS with Nginx (Recommended)

For production, configure Nginx reverse proxy with Let's Encrypt SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure domain
sudo nano /etc/nginx/sites-available/porraza

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### 6. Monitor Logs Regularly

Set up log rotation and monitoring for suspicious activity.

### 7. Backup Database

```bash
# Create backup
docker exec porraza_postgres pg_dump -U root porraza_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i porraza_postgres psql -U root porraza_db < backup_20260122.sql
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│          GitHub Repository (main branch)        │
└────────────────┬────────────────────────────────┘
                 │
                 │ Push to main
                 ▼
┌─────────────────────────────────────────────────┐
│           GitHub Actions Workflow               │
│  1. Checkout code                               │
│  2. SSH to Hetzner server                       │
│  3. Run deploy.sh                               │
└────────────────┬────────────────────────────────┘
                 │
                 │ SSH Connection
                 ▼
┌─────────────────────────────────────────────────┐
│        Hetzner Server (Ubuntu 22.04)            │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │     Docker Compose                     │   │
│  │                                        │   │
│  │  ┌──────────────┐  ┌───────────────┐ │   │
│  │  │ PostgreSQL   │  │ NestJS Backend│ │   │
│  │  │ Container    │◄─┤ Container     │ │   │
│  │  │ Port: 5432   │  │ Port: 3001    │ │   │
│  │  └──────────────┘  └───────────────┘ │   │
│  │                                        │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  Exposed Ports: 80, 443, 3001                  │
└─────────────────────────────────────────────────┘
                 │
                 │ HTTP/HTTPS
                 ▼
┌─────────────────────────────────────────────────┐
│              End Users / Frontend               │
└─────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Configure domain name and DNS (point to server IP)
2. ✅ Setup SSL certificate with Let's Encrypt
3. ✅ Configure Nginx reverse proxy
4. ✅ Setup database backups (cron job)
5. ✅ Configure monitoring (e.g., Uptime Kuma, Prometheus)
6. ✅ Setup log aggregation (optional)

---

## Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify GitHub Actions workflow logs
3. Review this documentation
4. Check [NestJS documentation](https://docs.nestjs.com)
5. Check [Docker documentation](https://docs.docker.com)

---

**Last Updated:** October 2025
**Deployment Platform:** Hetzner Cloud (Ubuntu 22.04)
**Application:** Porraza Backend (NestJS + PostgreSQL)
