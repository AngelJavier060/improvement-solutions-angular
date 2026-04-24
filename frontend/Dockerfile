# Etapa de build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source code and build
COPY . .
# Ensure local Angular CLI binary is executable and build with npx
RUN chmod +x node_modules/.bin/ng || true \
  && npx ng build --configuration production

# Etapa de producción
FROM nginx:alpine
# Eliminar index.html por defecto de Nginx para que no interfiera
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
# Angular con localize=true genera salida en subcarpetas por locale (p.ej., en-US)
COPY --from=build /app/dist/improvement-solutions/ /usr/share/nginx/html/
RUN mkdir -p /etc/nginx/conf.available /docker-entrypoint.d
COPY nginx-http.conf /etc/nginx/conf.available/http.conf
COPY nginx-ssl.conf /etc/nginx/conf.available/https.conf
COPY docker-entrypoint.d/99-select-nginx-conf.sh /docker-entrypoint.d/99-select-nginx-conf.sh
RUN chmod +x /docker-entrypoint.d/99-select-nginx-conf.sh
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
