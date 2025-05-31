package com.improvementsolutions.storage;

import org.springframework.core.io.ByteArrayResource;

public class TestResource extends ByteArrayResource {
    private final String filename;
    private final String contentType;

    public TestResource(byte[] byteArray, String filename, String contentType) {
        super(byteArray);
        this.filename = filename;
        this.contentType = contentType;
    }

    @Override
    public String getFilename() {
        return filename;
    }

    public String getContentType() {
        return contentType;
    }

    @Override
    public boolean exists() {
        return true;
    }

    @Override
    public boolean isReadable() {
        return true;
    }
}
