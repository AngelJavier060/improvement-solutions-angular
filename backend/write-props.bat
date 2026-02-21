@echo off
set OUTFILE=src\main\resources\application-postgres.properties
(
echo spring.datasource.url=jdbc:postgresql://localhost:5433/db_improvement_solutions
echo spring.datasource.username=postgres
echo spring.datasource.password=Alexandra1
echo spring.datasource.driver-class-name=org.postgresql.Driver
echo.
echo spring.datasource.hikari.maximum-pool-size=20
echo spring.datasource.hikari.minimum-idle=5
echo spring.datasource.hikari.idle-timeout=300000
echo spring.datasource.hikari.max-lifetime=1200000
echo spring.datasource.hikari.connection-timeout=20000
echo.
echo spring.flyway.enabled=false
echo.
echo spring.jpa.hibernate.ddl-auto=update
echo spring.jpa.show-sql=false
echo spring.jpa.properties.hibernate.format_sql=true
echo spring.jpa.open-in-view=true
echo spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
echo.
echo server.port=8081
echo server.servlet.context-path=/
echo.
echo logging.level.com.improvementsolutions=DEBUG
echo logging.level.org.hibernate.SQL=WARN
echo logging.file.name=logs/application-postgres.log
echo.
echo jwt.secret=fallback-secret-key
echo jwt.expiration=86400000
echo jwt.refresh-token.expiration=604800000
) > %OUTFILE%
echo Archivo escrito: %OUTFILE%
