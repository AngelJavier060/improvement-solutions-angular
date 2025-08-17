# Etapa de build
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files and install dependencies with optimizations
COPY package*.json ./
RUN npm install --silent --no-audit --no-fund

# Copy source code and build
COPY . .
RUN npm run build --silent

# Etapa de producción
FROM nginx:alpine
COPY --from=build /app/dist/improvement-solutions/ /usr/share/nginx/html/
COPY nginx-ssl.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
