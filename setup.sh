#!/bin/bash

# Apollon Oracle - Complete Setup and Run Script
# This script sets up and runs the entire Apollon Oracle system

echo "🚀 Apollon Oracle - Setup and Run Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python is installed
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_CMD=python3
    elif command -v python &> /dev/null; then
        PYTHON_CMD=python
    else
        print_error "Python is not installed. Please install Python 3.11+"
        exit 1
    fi
    print_success "Python found: $PYTHON_CMD"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+"
        exit 1
    fi
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Found: $(node --version)"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
}

# Setup Python virtual environment and install dependencies
setup_backend() {
    print_status "Setting up Backend..."
    
    cd backend/api || exit
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        $PYTHON_CMD -m venv venv
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate || . venv/Scripts/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    print_success "Backend setup complete!"
    cd ../..
}

# Setup ZK Privacy module
setup_zk() {
    print_status "Setting up ZK Privacy module..."
    
    cd backend/zk-privacy || exit
    
    # Install Node.js dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing ZK dependencies..."
        npm install
    fi
    
    # Run setup script
    print_status "Running ZK setup..."
    node setup.js
    
    print_success "ZK Privacy setup complete!"
    cd ../..
}

# Setup Frontend
setup_frontend() {
    print_status "Setting up Frontend..."
    
    cd frontend/algo-zk-dashboard || exit
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    print_success "Frontend setup complete!"
    cd ../..
}

# Start Backend
start_backend() {
    print_status "Starting Backend API..."
    cd backend/api || exit
    
    # Activate virtual environment
    source venv/bin/activate || . venv/Scripts/activate
    
    # Start server in background
    $PYTHON_CMD server.py &
    BACKEND_PID=$!
    
    # Wait for server to start
    print_status "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/health > /dev/null; then
            print_success "Backend is running on http://localhost:8000"
            break
        fi
        sleep 1
    done
    
    cd ../..
    echo $BACKEND_PID > .backend.pid
}

# Start Frontend
start_frontend() {
    print_status "Starting Frontend..."
    cd frontend/algo-zk-dashboard || exit
    
    # Start Next.js in background
    npm run dev &
    FRONTEND_PID=$!
    
    print_success "Frontend is starting on http://localhost:3000"
    
    cd ../..
    echo $FRONTEND_PID > .frontend.pid
}

# Stop all services
stop_services() {
    print_status "Stopping all services..."
    
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    
    print_success "All services stopped"
}

# Test the API
test_api() {
    print_status "Testing API endpoints..."
    
    # Test health endpoint
    if curl -s http://localhost:8000/health > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    # Test root endpoint
    curl -s http://localhost:8000/ | head -20
    
    print_success "API tests passed!"
}

# Main menu
show_menu() {
    echo ""
    echo "=========================================="
    echo "Apollon Oracle - Main Menu"
    echo "=========================================="
    echo "1. Full Setup (Backend + Frontend + ZK)"
    echo "2. Setup Backend Only"
    echo "3. Setup Frontend Only"
    echo "4. Start All Services"
    echo "5. Start Backend Only"
    echo "6. Start Frontend Only"
    echo "7. Test API"
    echo "8. Stop All Services"
    echo "9. Exit"
    echo "=========================================="
    echo -n "Select an option [1-9]: "
}

# Main function
main() {
    # Check prerequisites
    check_python
    check_node
    
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                setup_backend
                setup_zk
                setup_frontend
                print_success "Full setup complete! Run option 4 to start all services."
                ;;
            2)
                setup_backend
                ;;
            3)
                setup_frontend
                ;;
            4)
                stop_services
                start_backend
                start_frontend
                print_success "All services started!"
                print_status "API: http://localhost:8000"
                print_status "Frontend: http://localhost:3000"
                ;;
            5)
                start_backend
                ;;
            6)
                start_frontend
                ;;
            7)
                test_api
                ;;
            8)
                stop_services
                ;;
            9)
                print_status "Exiting..."
                stop_services
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
    done
}

# Handle command line arguments
if [ "$1" == "setup" ]; then
    setup_backend
    setup_zk
    setup_frontend
elif [ "$1" == "start" ]; then
    start_backend
    start_frontend
elif [ "$1" == "stop" ]; then
    stop_services
elif [ "$1" == "test" ]; then
    test_api
else
    main
fi
