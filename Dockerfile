# Build Stage
FROM node:18-bullseye-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-bullseye-slim

WORKDIR /app
COPY --from=build /app/dist ./dist
RUN npm install -g vite

EXPOSE 8080

CMD ["vite", "preview", "--port", "8080", "--strictPort"]