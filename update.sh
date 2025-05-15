#!/bin/bash

cd ~/Zanger
echo "Pulling latest code from GitHub..."
git pull origin main

echo "Restarting FastAPI server inside tmux session..."

# Stop the running server
tmux send-keys -t fastapi-session C-c
sleep 1

# Restart with uvicorn
tmux send-keys -t fastapi-session "uvicorn main:app --host 0.0.0.0 --port 8000" ENTER
