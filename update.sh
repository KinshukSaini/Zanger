#!/bin/bash

cd ~/Zanger
echo "Stashing local changes..."
git stash push -m "Auto stash before pulling updates"

echo "Pulling latest code with rebase..."
git pull --rebase origin main

echo "Restoring local changes..."
git stash pop || echo "No stash to pop."

echo "Restarting FastAPI server inside tmux session..."

# Stop the running server
tmux send-keys -t fastapi-session C-c
sleep 1

# Restart with uvicorn
tmux send-keys -t fastapi-session "uvicorn main:app --host 0.0.0.0 --port 8000" ENTER
