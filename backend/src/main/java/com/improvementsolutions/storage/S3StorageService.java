package com.improvementsolutions.storage;

import com.amazonaws.AmazonServiceException;
import com.amazonaws.HttpMethod;
import com.amazonaws.SdkClientException;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.DeleteObjectRequest;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.S3Object;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Calendar;
import java.util.Date;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@Primary
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class S3StorageService implements StorageService {

    @Value("${app.aws.s3.bucket}")
    private String bucketName;

    @Value("${app.aws.s3.access-key}")
    private String accessKey;

    @Value("${app.aws.s3.secret-key}")
    private String secretKey;

    @Value("${app.aws.s3.region}")
    private String region;

    @Value("${app.aws.s3.url:#{null}}")
    private String customEndpoint;
    
    private AmazonS3 s3Client;

    @PostConstruct
    public void init() {
        BasicAWSCredentials credentials = new BasicAWSCredentials(accessKey, secretKey);
        
        AmazonS3ClientBuilder builder = AmazonS3ClientBuilder.standard()
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .withRegion(Regions.valueOf(region));
        
        // Si se especifica un endpoint personalizado (por ejemplo, para MinIO o localstack)
        if (customEndpoint != null && !customEndpoint.isEmpty()) {
            builder.withEndpointConfiguration(
                new AmazonS3ClientBuilder.EndpointConfiguration(customEndpoint, region));
        }
        
        this.s3Client = builder.build();
        
        // Verificar si el bucket existe, si no, crearlo
        if (!s3Client.doesBucketExistV2(bucketName)) {
            s3Client.createBucket(bucketName);
        }
    }

    @Override
    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new StorageException("No se puede guardar un archivo vacío");
        }
        
        String extension = getFileExtension(file.getOriginalFilename());
        String key = UUID.randomUUID().toString() + (extension != null ? "." + extension : "");
        
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(file.getSize());
        metadata.setContentType(file.getContentType());
        
        try {
            s3Client.putObject(bucketName, key, file.getInputStream(), metadata);
            return key;
        } catch (AmazonServiceException e) {
            throw new StorageException("Error al guardar el archivo en S3", e);
        }
    }

    @Override
    public String store(String directory, MultipartFile file, String fileName) throws IOException {
        if (file.isEmpty()) {
            throw new StorageException("No se puede guardar un archivo vacío");
        }
        
        String key = directory + "/" + fileName;
        
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(file.getSize());
        metadata.setContentType(file.getContentType());
        
        try {
            s3Client.putObject(bucketName, key, file.getInputStream(), metadata);
            return key;
        } catch (AmazonServiceException e) {
            throw new StorageException("Error al guardar el archivo en S3", e);
        }
    }

    @Override
    public Stream<Path> loadAll() {
        throw new UnsupportedOperationException("Esta operación no está soportada en el almacenamiento S3");
    }

    @Override
    public Path load(String filename) {
        return Paths.get(filename);
    }

    @Override
    public Path load(String directory, String filename) {
        return Paths.get(directory, filename);
    }

    @Override
    public Resource loadAsResource(String filename) {
        try {
            S3Object object = s3Client.getObject(new GetObjectRequest(bucketName, filename));
            return new InputStreamResource(object.getObjectContent());
        } catch (AmazonServiceException e) {
            throw new StorageFileNotFoundException("No se pudo cargar el archivo: " + filename, e);
        }
    }

    @Override
    public Resource loadAsResource(String directory, String filename) {
        return loadAsResource(directory + "/" + filename);
    }

    @Override
    public URL generatePresignedUrl(String key, Date expiration) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(expiration);
        
        try {
            return s3Client.generatePresignedUrl(bucketName, key, calendar.getTime(), HttpMethod.GET);
        } catch (SdkClientException e) {
            throw new StorageException("Error al generar la URL prefirmada", e);
        }
    }

    @Override
    public void delete(String key) throws IOException {
        try {
            s3Client.deleteObject(new DeleteObjectRequest(bucketName, key));
        } catch (AmazonServiceException e) {
            throw new StorageException("Error al eliminar el archivo: " + key, e);
        }
    }

    @Override
    public void delete(String directory, String filename) throws IOException {
        delete(directory + "/" + filename);
    }

    @Override
    public void deleteAll() {
        throw new UnsupportedOperationException("Esta operación no está soportada en el almacenamiento S3");
    }

    @Override
    public boolean exists(String key) {
        try {
            return s3Client.doesObjectExist(bucketName, key);
        } catch (AmazonServiceException e) {
            throw new StorageException("Error al verificar si el archivo existe: " + key, e);
        }
    }
    
    private String getFileExtension(String filename) {
        if (filename == null) {
            return null;
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex < 0) {
            return null;
        }
        return filename.substring(lastDotIndex + 1);
    }
}