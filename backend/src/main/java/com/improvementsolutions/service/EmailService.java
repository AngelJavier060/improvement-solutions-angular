package com.improvementsolutions.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String from;

    @Value("${spring.mail.name:Improvement Solutions}")
    private String fromName;

    /**
     * Envía un correo electrónico para restablecer la contraseña
     * @param to Destinatario
     * @param token Token para restablecer la contraseña
     * @param baseUrl URL base de la aplicación frontend
     */
    public void sendPasswordResetEmail(String to, String token, String baseUrl) {
        if (mailSender == null) {
            logger.warn("JavaMailSender no configurado. Omitiendo envío de correo.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(from, fromName);
            helper.setTo(to);
            helper.setSubject("Restablecimiento de contraseña - Improvement Solutions");
            
            // Construir el cuerpo del correo
            String resetLink = baseUrl + "/auth/reset-password?token=" + token;
            String htmlContent = createPasswordResetEmailContent(resetLink);
            
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            logger.info("Correo de restablecimiento enviado a: {}", to);
        } catch (Exception e) {
            logger.error("Error al enviar el correo electrónico", e);
            // En un entorno de producción, aquí deberías registrar el error
            throw new RuntimeException("Error al enviar el correo electrónico: " + e.getMessage());
        }
    }
    
    /**
     * Crea el contenido HTML del correo de restablecimiento de contraseña
     */
    private String createPasswordResetEmailContent(String resetLink) {
        StringBuilder builder = new StringBuilder();
        
        builder.append("<!DOCTYPE html>");
        builder.append("<html>");
        builder.append("<head>");
        builder.append("<style>");
        builder.append("body { font-family: Arial, sans-serif; line-height: 1.6; }");
        builder.append(".container { max-width: 600px; margin: 0 auto; padding: 20px; }");
        builder.append("h1 { color: #333366; }");
        builder.append(".button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }");
        builder.append(".footer { margin-top: 30px; font-size: 12px; color: #666; }");
        builder.append("</style>");
        builder.append("</head>");
        builder.append("<body>");
        builder.append("<div class='container'>");
        builder.append("<h1>Restablecimiento de Contraseña</h1>");
        builder.append("<p>Hemos recibido una solicitud para restablecer tu contraseña en Improvement Solutions.</p>");
        builder.append("<p>Para establecer una nueva contraseña, haz clic en el siguiente enlace:</p>");
        builder.append("<p><a class='button' href='").append(resetLink).append("'>Restablecer mi contraseña</a></p>");
        builder.append("<p>Este enlace es válido por 24 horas.</p>");
        builder.append("<p>Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo.</p>");
        builder.append("<div class='footer'>");
        builder.append("<p>Atentamente,<br>El equipo de Improvement Solutions</p>");
        builder.append("</div>");
        builder.append("</div>");
        builder.append("</body>");
        builder.append("</html>");
        
        return builder.toString();
    }
}
