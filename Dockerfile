# Stage 1: Build React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production
COPY server/ ./server/
COPY content/ ./content/
COPY --from=client-build /app/client/dist ./server/public/
RUN mkdir -p /app/data

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
