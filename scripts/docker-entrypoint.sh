#!/bin/sh
set -e

# Install and cloudflared service
cloudflared service install
service cloudflared start

# Start the application
./app
