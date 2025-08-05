#!/bin/bash
set -e

# Validate that the service is up and running
# Loop for a few attempts to give the service time to start
for i in {1..30}; do
  # Use curl to check the health endpoint
  if curl -f http://localhost:8000/api/health; then
    echo "Service validation successful."
    exit 0
  fi
  echo "Service not ready yet. Retrying in 5 seconds..."
  sleep 10
done

echo "Service validation failed after multiple attempts."
exit 1
