FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --gid 1001 shopora && useradd --uid 1001 --gid shopora --create-home shopora
COPY --from=builder --chown=shopora:shopora /app/.next/standalone ./
COPY --from=builder --chown=shopora:shopora /app/.next/static ./.next/static
COPY --from=builder --chown=shopora:shopora /app/public ./public
COPY --from=builder --chown=shopora:shopora /app/database ./database
COPY --from=builder --chown=shopora:shopora /app/scripts ./scripts
USER shopora
EXPOSE 3000
CMD ["node", "server.js"]
