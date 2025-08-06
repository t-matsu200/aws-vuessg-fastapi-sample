#!/bin/bash
set -e

# Stop the systemd service if it is running
if systemctl is-active --quiet fastapi-app; then
    systemctl stop fastapi-app
fi

# Clean up old application files
rm -rf /opt/aws-vuessg-fastapi-sample/pythonapp_old
if [ -d "/opt/aws-vuessg-fastapi-sample/pythonapp" ]; then
    mv /opt/aws-vuessg-fastapi-sample/pythonapp /opt/aws-vuessg-fastapi-sample/pythonapp_old
fi

yum remove -y python3

UV_PATH="/root/.local/bin/uv"

# Install uv if not present
if ! command -v $UV_PATH &> /dev/null
then
    echo "uv could not be found, installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    // ec2-user が uv を実行できるようにするため、ec2-user のホームディレクトリにも uv をインストールする
    su ec2-user
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

su root

# Install Python 3.13 if not already present
PYTHON_VERSION="3.13.5"
# Check if python3 command points to the correct version
if ! (command -v python3 && python3 --version | grep -q "Python $PYTHON_VERSION"); then
    echo "Python 3.13 not found or not linked, installing/linking..."
    $UV_PATH python install $PYTHON_VERSION --install-dir /opt/uv-python/
    chmod +x /opt/uv-python/cpython-$PYTHON_VERSION-linux-x86_64-gnu/bin/python3
    # Create a symbolic link to make python3.13 the default python3
    rm -f /usr/bin/python3 /usr/local/bin/python3
    ln -s /opt/uv-python/cpython-$PYTHON_VERSION-linux-x86_64-gnu/bin/python3 /usr/bin/python3
    ln -s /opt/uv-python/cpython-$PYTHON_VERSION-linux-x86_64-gnu/bin/python3 /usr/local/bin/python3
fi
