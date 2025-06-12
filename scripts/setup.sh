#!/bin/bash

# Motriforge Platform Setup Script
# Automates the initial setup process for development

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
info() {
    echo -e "${BLUE}ℹ️  $*${NC}"
}

success() {
    echo -e "${GREEN}✅ $*${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $*${NC}"
}

error() {
    echo -e "${RED}❌ $*${NC}"
}

header() {
    echo -e "${PURPLE}🚀 $*${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    header "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js 18+")
    else
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 18 ]; then
            missing_deps+=("Node.js 18+ (current: v$node_version)")
        fi
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("Docker Compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing prerequisites:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        exit 1
    fi
    
    success "All prerequisites met!"
}

# Setup environment file
setup_environment() {
    header "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            success "Created .env from .env.example"
            warn "Please review and update the .env file with your specific configuration"
        else
            error ".env.example not found"
            exit 1
        fi
    else
        info ".env already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    header "Installing dependencies..."
    
    npm ci
    success "Dependencies installed successfully!"
}

# Setup Docker services
setup_docker() {
    header "Setting up Docker services..."
    
    info "Starting PostgreSQL and Redis..."
    docker-compose up -d postgres redis
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are healthy
    if docker-compose ps postgres | grep -q "healthy"; then
        success "PostgreSQL is ready!"
    else
        warn "PostgreSQL might not be fully ready yet"
    fi
    
    if docker-compose ps redis | grep -q "healthy"; then
        success "Redis is ready!"
    else
        warn "Redis might not be fully ready yet"
    fi
}

# Run database migrations
setup_database() {
    header "Setting up database..."
    
    info "Running database migrations..."
    npm run db:migrate
    success "Database migrations completed!"
    
    # Ask if user wants to seed data
    read -p "Do you want to seed the database with development data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Seeding database..."
        SEED_DATABASE=true npm run db:seed
        success "Database seeded successfully!"
    fi
}

# Verify installation
verify_installation() {
    header "Verifying installation..."
    
    info "Running type check..."
    npm run type-check
    success "Type check passed!"
    
    info "Running linter..."
    npm run lint
    success "Linting passed!"
    
    info "Testing database connection..."
    if npm run db:studio -- --help >/dev/null 2>&1; then
        success "Database connection verified!"
    else
        warn "Database connection test failed"
    fi
}

# Main setup function
main() {
    echo "🏋️ ============================================="
    echo "🏋️  Welcome to Motriforge Platform Setup"
    echo "🏋️ ============================================="
    echo
    
    check_prerequisites
    setup_environment
    install_dependencies
    setup_docker
    setup_database
    verify_installation
    
    echo
    echo "🎉 ============================================="
    echo "🎉  Setup completed successfully!"
    echo "🎉 ============================================="
    echo
    success "Your Motriforge development environment is ready!"
    echo
    info "Next steps:"
    echo "  1. Review and update your .env file"
    echo "  2. Start the development server: npm run dev"
    echo "  3. Open http://localhost:3000 in your browser"
    echo "  4. Check database with: npm run db:studio"
    echo
    info "Useful commands:"
    echo "  • npm run dev          - Start development server"
    echo "  • npm run docker:up    - Start all Docker services"
    echo "  • npm run docker:logs  - View Docker logs"
    echo "  • npm run test         - Run tests"
    echo "  • npm run lint         - Check code quality"
    echo
    warn "Don't forget to update your .env file with production values!"
}

# Handle script interruption
trap 'error "Setup interrupted"; exit 1' INT TERM

# Check if running with help flag
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "Motriforge Platform Setup Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "This script will:"
    echo "  1. Check prerequisites (Node.js, Docker, etc.)"
    echo "  2. Set up environment configuration"
    echo "  3. Install npm dependencies"
    echo "  4. Start Docker services (PostgreSQL, Redis)"
    echo "  5. Run database migrations"
    echo "  6. Optionally seed development data"
    echo "  7. Verify the installation"
    echo
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo
    exit 0
fi

# Run main function
main "$@"