#!/usr/bin/env bash
set -euo pipefail

echo "SmartVenue kiosk ML setup starting..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

echo ""
echo "1. Installing system packages..."
sudo apt-get update
sudo apt-get install -y \
  python3 \
  python3-pip \
  python3-venv \
  python3-dev \
  libatlas-base-dev \
  libopenblas-dev \
  libjpeg-dev \
  libtiff-dev \
  libpng-dev \
  libavcodec-dev \
  libavformat-dev \
  libswscale-dev \
  libgtk2.0-dev \
  libcanberra-gtk3-module \
  libcanberra-gtk-module \
  pkg-config \
  git \
  curl \
  sqlite3

echo ""
echo "2. Creating Python virtual environment..."
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo ""
echo "3. Upgrading pip tooling..."
python -m pip install --upgrade pip setuptools wheel

echo ""
echo "4. Installing Python dependencies..."
python -m pip install \
  numpy \
  opencv-python \
  onnxruntime \
  fastapi \
  uvicorn \
  pydantic

echo ""
echo "5. Preparing kiosk directories..."
mkdir -p "$SCRIPT_DIR/models"
mkdir -p "$SCRIPT_DIR/data"

echo ""
echo "6. Setup complete."
echo ""
echo "Activate environment with:"
echo "  source \"$VENV_DIR/bin/activate\""
echo ""
echo "Run kiosk face engine test with:"
echo "  python \"$SCRIPT_DIR/test-ml.py\""
echo ""
echo "Run registration service with:"
echo "  uvicorn register-face:APP --host 0.0.0.0 --port 5000"
echo ""
echo "The first face-engine or register-face run will auto-download model files."
