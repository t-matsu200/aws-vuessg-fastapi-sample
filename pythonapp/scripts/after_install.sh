#!/bin/bash
set -e

cd /opt/aws-vuessg-fastapi-sample/pythonapp

# Install dependencies globally for the python3 interpreter using uv
# No virtual environment is used.
/root/.local/bin/uv sync

# Create a systemd service file for the FastAPI application
cat > /etc/systemd/system/fastapi-app.service << EOL
[Unit]
Description=FastAPI application
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/opt/aws-vuessg-fastapi-sample/pythonapp
# 環境変数を利用する場合は、以下をコメントインすること
# EnvironmentFile=/opt/aws-vuessg-fastapi-sample/pythonapp/.env

# The uvicorn executable is installed in /usr/local/bin by uv
ExecStart=/root/.local/bin/uv run uvicorn app:create_app --host 0.0.0.0 --port 8000 --factory --timeout-keep-alive 300 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd to recognize the new service
systemctl daemon-reload
