#!/usr/bin/env bash
set -euo pipefail

echo "SmartVenue Pi UI setup starting..."

sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip libgl1 libglib2.0-0

python3 -m venv .venv-ui
source .venv-ui/bin/activate

python -m pip install --upgrade pip
python -m pip install requests numpy opencv-python

echo
echo "Pi UI environment ready."
echo "Activate with:"
echo "  source .venv-ui/bin/activate"
echo
echo "Run with:"
echo "  export SMARTVENUE_ML_URL=http://<LAPTOP-IP>:5050"
echo "  python pi-ui-client.py"
