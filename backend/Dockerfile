# Etapa de build (Java 21)
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa de producción (Java 21)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Crear usuario no root
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copiar el JAR construido
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

# Cambiar al usuario no root
USER appuser

# Exponer puerto
EXPOSE 8089

# Variables de entorno por defecto
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# Comando para ejecutar la aplicación
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8089/health || exit 1
