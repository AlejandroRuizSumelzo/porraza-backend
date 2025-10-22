#!/bin/bash

################################################################################
# Porraza Backend - Automated Deployment Script
# This script handles the deployment of the backend to the Hetzner server
################################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/porraza-backend"
REPO_URL="https://github.com/AlejandroRuizSumelzo/porraza-backend.git"
BRANCH="main"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Function to check required commands
check_requirements() {
    log_info "Checking requirements..."

    local requirements=("git" "docker" "docker-compose")
    local missing=()

    for cmd in "${requirements[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required commands: ${missing[*]}"
        log_info "Please install missing dependencies"
        exit 1
    fi

    log_success "All requirements are met"
}

# Function to create app directory if it doesn't exist
setup_directory() {
    if [ ! -d "$APP_DIR" ]; then
        log_info "Creating application directory: $APP_DIR"
        mkdir -p "$APP_DIR"
        log_success "Directory created"
    fi
}

# Function to clone or pull repository
sync_repository() {
    if [ -d "$APP_DIR/.git" ]; then
        log_info "Updating repository..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/$BRANCH
        log_success "Repository updated to latest version"
    else
        log_info "Cloning repository..."
        git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
        log_success "Repository cloned"
    fi
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f "$APP_DIR/.env" ]; then
        log_warning ".env file not found"

        if [ -f "$APP_DIR/.env.example" ]; then
            log_info "Creating .env from .env.example"
            cp "$APP_DIR/.env.example" "$APP_DIR/.env"
            log_warning "Please edit $APP_DIR/.env with your production values"
            log_warning "Deployment paused. Press Enter after editing .env file..."
            read -r
        else
            log_error ".env.example not found. Cannot proceed without environment configuration"
            exit 1
        fi
    else
        log_success ".env file found"
    fi
}

# Function to build and deploy with Docker Compose
deploy_containers() {
    log_info "Building and deploying containers..."
    cd "$APP_DIR"

    # Pull latest base images
    docker-compose pull postgres || true

    # Build the backend image
    log_info "Building backend image..."
    docker-compose build --no-cache backend

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down

    # Start containers
    log_info "Starting containers..."
    docker-compose up -d

    log_success "Containers deployed successfully"
}

# Function to check deployment health
check_health() {
    log_info "Checking deployment health..."

    local max_attempts=30
    local attempt=0
    local healthy=false

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "porraza_backend.*healthy"; then
            healthy=true
            break
        fi

        attempt=$((attempt + 1))
        log_info "Waiting for backend to be healthy... ($attempt/$max_attempts)"
        sleep 2
    done

    if [ "$healthy" = true ]; then
        log_success "Backend is healthy!"
    else
        log_warning "Backend health check timed out. Check logs with: docker-compose logs backend"
    fi
}

# Function to show deployment info
show_deployment_info() {
    echo ""
    log_success "=========================================="
    log_success "   DEPLOYMENT COMPLETED SUCCESSFULLY"
    log_success "=========================================="
    echo ""
    log_info "Application Status:"
    docker-compose ps
    echo ""
    log_info "Useful commands:"
    echo "  - View logs:           docker-compose logs -f backend"
    echo "  - View all logs:       docker-compose logs -f"
    echo "  - Restart backend:     docker-compose restart backend"
    echo "  - Stop all:            docker-compose down"
    echo "  - View container stats: docker stats"
    echo ""
    log_info "Access your API at: http://$(hostname -I | awk '{print $1}'):3001"
    log_info "Swagger docs at:    http://$(hostname -I | awk '{print $1}'):3001/api"
    echo ""
}

# Function to cleanup old images
cleanup_images() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting Porraza Backend deployment..."
    echo ""

    check_permissions
    check_requirements
    setup_directory
    sync_repository
    check_env_file
    deploy_containers
    check_health
    cleanup_images
    show_deployment_info
}

# Run main function
main "$@"
