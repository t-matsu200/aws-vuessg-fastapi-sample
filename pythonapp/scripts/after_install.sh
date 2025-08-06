#!/bin/bash
set -e

cd /opt/aws-vuessg-fastapi-sample/pythonapp

# Install dependencies globally for the python3 interpreter using uv
# No virtual environment is used.
/home/ec2-user/.local/bin/uv sync

# Create a systemd service file for the FastAPI application
cat > /etc/systemd/system/fastapi-app.service << EOL
[Unit]
Description=FastAPI application
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/opt/aws-vuessg-fastapi-sample/pythonapp
EnvironmentFile=/home/ec2-user/.local/bin/env
# 環境変数を利用する場合は、以下をコメントインすること。.envファイルの作成が必要です
# EnvironmentFile=/opt/aws-vuessg-fastapi-sample/pythonapp/.env

# The uvicorn executable is installed in /usr/local/bin by uv
ExecStart=/home/ec2-user/.local/bin/uv run uvicorn app:create_app --host 0.0.0.0 --port 8000 --factory --timeout-keep-alive 300 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd to recognize the new service
systemctl daemon-reload
