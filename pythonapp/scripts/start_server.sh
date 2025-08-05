#!/bin/bash
set -e

# Enable the service to start on boot
systemctl enable fastapi-app

# Start the service
systemctl start fastapi-app
