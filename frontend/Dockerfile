# Etapa de build
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files and install dependencies with optimizations
COPY package*.json ./
RUN npm ci --silent --no-audit --no-fund

# Copy source code and build
COPY . .
# Ensure local Angular CLI binary is executable and build with npx
RUN chmod +x node_modules/.bin/ng || true \
  && npx ng build --configuration production

# Etapa de producción
FROM nginx:alpine
# Angular con localize=true genera salida en subcarpeta de locale (p.ej., en-US)
COPY --from=build /app/dist/improvement-solutions/en-US/ /usr/share/nginx/html/
COPY nginx-ssl.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
