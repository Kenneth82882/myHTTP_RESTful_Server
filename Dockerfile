FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5050
ENV DATA_DIR=/app/data

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/server.ts ./

# Create persistent storage volume mount point
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 5050
CMD ["node", "server.js"]
