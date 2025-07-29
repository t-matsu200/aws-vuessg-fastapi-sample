# Use the official uv image with Python 3.13
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Set the working directory in the container
WORKDIR /app

ENV UV_LINK_MODE=copy

# Create a virtual environment
RUN uv venv

# Copy pyproject.toml and the src directory before installing dependencies
COPY pyproject.toml .
COPY . .

# Install dependencies using uv
RUN uv sync

# Set PYTHONPATH to include the src directory
ENV PYTHONPATH=/app

# Expose the port that FastAPI runs on
EXPOSE 8000

# Command to run the FastAPI application with uvicorn
CMD ["uv", "run", "uvicorn", "app:create_app", "--host", "0.0.0.0", "--port", "8000", "--factory", "--timeout-keep-alive", "300", "--workers", "2"]
