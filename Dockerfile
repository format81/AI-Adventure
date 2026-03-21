# Stage 1: Build React client
FROM node:20-alpine AS client-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci --workspace=client
COPY client/ ./client/
RUN npm run build:client

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --workspace=server --production
COPY server/ ./server/
COPY content/ ./content/
COPY --from=client-build /app/client/dist ./server/public/
RUN mkdir -p /app/data

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
