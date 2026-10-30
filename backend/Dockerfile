FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund --unsafe-perm
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc
COPY src/modules/rentacar/templates dist/modules/rentacar/templates
# Voucher PDF Noto Sans (npm run build’de copy-templates ile gelir; burada manuel — yoksa Türkçe bozulur)
COPY src/assets/fonts dist/assets/fonts

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

# OOM önleme: Varsayılan olarak docker-ce-cli kurulmaz (build bellek tasarrufu).
# Gerekirse: docker build --build-arg INSTALL_DOCKER_CLI=1
ARG INSTALL_DOCKER_CLI=0

# Minimum paketler: sadece ca-certificates ve curl (postgresql-client kaldırıldı —
# TypeORM pg npm paketi ile bağlanır, CLI gereksiz; 31 paket / 73MB bellek tasarrufu)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI kurulumu (opsiyonel, INSTALL_DOCKER_CLI=1 gerektirir)
RUN if [ "$INSTALL_DOCKER_CLI" = "1" ]; then \
      apt-get update \
      && apt-get install -y --no-install-recommends gnupg \
      && rm -rf /var/lib/apt/lists/* \
      && install -m 0755 -d /etc/apt/keyrings \
      && curl -fsSL https://download.docker.com/linux/debian/gpg \
         | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
      && chmod a+r /etc/apt/keyrings/docker.gpg \
      && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
         | tee /etc/apt/sources.list.d/docker.list > /dev/null \
      && apt-get update \
      && apt-get install -y --no-install-recommends docker-ce-cli \
      && rm -rf /var/lib/apt/lists/*; \
    fi

COPY package-lock.json package.json ./

# Sharp'ı sunucu mimarisine göre yeniden kur (linux/amd64 veya linux/arm64)
RUN npm ci --omit=dev --prefer-offline --no-audit --no-fund --unsafe-perm \
    && npm uninstall sharp \
    && npm install --platform=linux --arch=$(dpkg --print-architecture | sed 's/amd64/x64/;s/arm64/arm64/') sharp@0.34.5 \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY public ./public
RUN mkdir -p public/uploads
EXPOSE 3000
CMD ["node", "dist/server.js"]
