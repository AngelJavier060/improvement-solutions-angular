package com.improvementsolutions.controller;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.improvementsolutions.storage.StorageService;

@RestController
@RequestMapping("/api/files")
public class FileController {
    
    private final StorageService storageService;
    
    @Autowired
    public FileController(StorageService storageService) {
        this.storageService = storageService;
    }
    
    @PostMapping("/upload")
    public ResponseEntity<String> handleFileUpload(@RequestParam("file") MultipartFile file) {
        String filename = storageService.store(file);
        return ResponseEntity.ok().body(filename);
    }
    
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        Resource file = storageService.loadAsResource(filename);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + file.getFilename() + "\"").body(file);
    }
    
    @GetMapping("/path/{filename:.+}")
    public ResponseEntity<String> getFilePath(@PathVariable String filename) {
        Path path = storageService.load(filename);
        return ResponseEntity.ok().body(path.toString());
    }
}
