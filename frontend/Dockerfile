# Etapa de build
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g @angular/cli
COPY . .
RUN npm run build

# Etapa de producción
FROM nginx:alpine
COPY --from=build /app/dist/improvement-solutions/ /usr/share/nginx/html/
COPY nginx-simple.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
