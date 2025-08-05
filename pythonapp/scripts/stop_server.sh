#!/bin/bash
set -e

# Stop the service if it is running
if systemctl is-active --quiet fastapi-app; then
    systemctl stop fastapi-app
fi
