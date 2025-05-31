package com.improvementsolutions.config;

import com.improvementsolutions.storage.StorageService;
import com.improvementsolutions.storage.TestStorageService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class TestStorageConfig {

    @Bean
    @Primary
    public StorageService testStorageService() {
        return new TestStorageService();
    }
}
