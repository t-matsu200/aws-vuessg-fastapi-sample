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

# Install build dependencies for Python (for Amazon Linux 2)
yum groupinstall -y "Development Tools"
yum install -y bzip2 bzip2-devel gcc git libffi-devel readline readline-devel sqlite sqlite-devel zlib-devel libdb-devel gdbm-devel xz-devel tk-devel uuid-devel libuuid-devel
yum install -y openssl-devel
yum remove -y python3

# Download, compile, and install Python 3.13 if not already present
PYTHON_VERSION="3.13.3"
PYTHON_VERSION_SHORT="3.13"
# Check if python3 command points to the correct version
if ! (command -v python3 && python3 --version | grep -q "Python $PYTHON_VERSION"); then
    echo "Python 3.13 not found or not linked, installing/linking..."
    cd /tmp
    curl -O https://www.python.org/ftp/python/$PYTHON_VERSION/Python-$PYTHON_VERSION.tgz
    tar -xzf Python-$PYTHON_VERSION.tgz
    cd Python-$PYTHON_VERSION
    ./configure --enable-optimizations --with-ssl --prefix=/usr/local --enable-shared LDFLAGS="-Wl,-rpath /usr/local/lib"
    make install
    # Create a symbolic link to make python3.13 the default python3
    ln -sf /usr/local/bin/python$PYTHON_VERSION_SHORT /usr/local/bin/python3
    # Clean up source files
    cd /
    rm -rf /tmp/Python-$PYTHON_VERSION*
fi

# Install uv if not present
if ! command -v uv &> /dev/null
then
    echo "uv could not be found, installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi
