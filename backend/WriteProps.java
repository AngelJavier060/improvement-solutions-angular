import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

public class WriteProps {
    static void write(String path, String content) throws Exception {
        Path out = Paths.get(path);
        Files.write(out, content.getBytes(StandardCharsets.UTF_8),
            StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        byte[] bytes = Files.readAllBytes(out);
        System.out.println(path + " -> first 3 bytes: " + bytes[0] + " " + bytes[1] + " " + bytes[2] +
            (bytes[0]==-17 ? " *** BOM DETECTED ***" : " OK no BOM"));
    }

    public static void main(String[] args) throws Exception {
        write("src/main/resources/application-postgres.properties",
            "spring.datasource.url=jdbc:postgresql://localhost:5432/db_improvement_solutions\n" +
            "spring.datasource.username=postgres\n" +
            "spring.datasource.password=Alexandra1\n" +
            "spring.datasource.driver-class-name=org.postgresql.Driver\n" +
            "\n" +
            "spring.datasource.hikari.maximum-pool-size=20\n" +
            "spring.datasource.hikari.minimum-idle=5\n" +
            "spring.datasource.hikari.idle-timeout=300000\n" +
            "spring.datasource.hikari.max-lifetime=1200000\n" +
            "spring.datasource.hikari.connection-timeout=20000\n" +
            "\n" +
            "spring.flyway.enabled=false\n" +
            "\n" +
            "spring.jpa.hibernate.ddl-auto=update\n" +
            "spring.jpa.show-sql=false\n" +
            "spring.jpa.properties.hibernate.format_sql=true\n" +
            "spring.jpa.open-in-view=true\n" +
            "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect\n" +
            "\n" +
            "server.port=8081\n" +
            "server.servlet.context-path=/\n" +
            "\n" +
            "logging.level.com.improvementsolutions=DEBUG\n" +
            "logging.level.org.hibernate.SQL=WARN\n" +
            "logging.file.name=logs/application-postgres.log\n" +
            "\n" +
            "jwt.secret=fallback-secret-key\n" +
            "jwt.expiration=86400000\n" +
            "jwt.refresh-token.expiration=604800000\n"
        );

        write("src/main/resources/application.properties",
            "spring.main.allow-bean-definition-overriding=true\n" +
            "spring.main.allow-circular-references=true\n" +
            "spring.profiles.active=postgres\n" +
            "\n" +
            "spring.jpa.properties.hibernate.connection.provider_disables_autocommit=false\n" +
            "spring.datasource.hikari.auto-commit=false\n" +
            "spring.jpa.properties.hibernate.connection.isolation=2\n" +
            "spring.transaction.default-timeout=30\n" +
            "\n" +
            "spring.jpa.properties.hibernate.jdbc.batch_size=20\n" +
            "spring.jpa.properties.hibernate.order_inserts=true\n" +
            "spring.jpa.properties.hibernate.order_updates=true\n" +
            "spring.jpa.properties.hibernate.batch_versioned_data=true\n" +
            "spring.jpa.properties.hibernate.query.in_clause_parameter_padding=true\n" +
            "spring.jpa.properties.hibernate.query.fail_on_pagination_over_collection_fetch=true\n" +
            "spring.jpa.properties.hibernate.query.plan_cache_max_size=4096\n" +
            "\n" +
            "server.servlet.context-path=/\n" +
            "\n" +
            "spring.mail.name=Improvement Solutions\n" +
            "\n" +
            "jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970\n" +
            "jwt.expiration=86400000\n" +
            "jwt.refresh-token.expiration=604800000\n" +
            "\n" +
            "spring.security.enabled=true\n" +
            "\n" +
            "app.session.max-per-user=5\n" +
            "app.session.expiration-hours=24\n" +
            "app.session.cleanup-rate=3600000\n" +
            "\n" +
            "app.storage.location=uploads\n" +
            "file.upload-dir=uploads\n" +
            "spring.servlet.multipart.max-file-size=50MB\n" +
            "spring.servlet.multipart.max-request-size=50MB\n" +
            "\n" +
            "file.upload.employees.photos.dir=uploads/employees/photos\n" +
            "file.upload.max-file-size=5MB\n" +
            "file.upload.allowed-types=image/jpeg,image/png,image/gif,image/webp\n" +
            "\n" +
            "logging.level.root=INFO\n" +
            "logging.level.com.improvementsolutions=DEBUG\n" +
            "logging.level.org.springframework.web=DEBUG\n" +
            "logging.level.org.hibernate=ERROR\n" +
            "logging.file.name=logs/application.log\n" +
            "\n" +
            "logging.level.org.springframework.web.cors=TRACE\n"
        );

        System.out.println("Done. Both files written UTF-8 no BOM.");
    }
}
