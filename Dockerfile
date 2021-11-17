FROM golang:1.17.2

# Declare work dir and copy assets
WORKDIR /app

# Copy assets
COPY . /app

# Copy generated tunnel credentials and config
COPY ./scripts/preview/outputs/tunnel /root/.cloudflared

# Install Cloudflared
RUN wget --quiet https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
RUN dpkg -i cloudflared-linux-amd64.deb

# Your application setup
RUN go install
RUN go build

# Expose port(s)
EXPOSE 4000

# Add custom entrypoint
COPY ./scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod 777 /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
