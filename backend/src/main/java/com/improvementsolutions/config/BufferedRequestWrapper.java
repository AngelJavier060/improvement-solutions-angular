package com.improvementsolutions.config;

import org.springframework.util.StreamUtils;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class BufferedRequestWrapper extends HttpServletRequestWrapper {

    private final byte[] bodyBytes;
    private final String body;

    public BufferedRequestWrapper(HttpServletRequest request) throws IOException {
        super(request);
        this.bodyBytes = StreamUtils.copyToByteArray(request.getInputStream());
        this.body = new String(this.bodyBytes, StandardCharsets.UTF_8);
    }

    @Override
    public ServletInputStream getInputStream() {
        return new BufferedServletInputStream(this.bodyBytes);
    }

    public String getBody() {
        return this.body;
    }

    private static class BufferedServletInputStream extends ServletInputStream {
        private final ByteArrayInputStream inputStream;

        BufferedServletInputStream(byte[] bytes) {
            this.inputStream = new ByteArrayInputStream(bytes);
        }

        @Override
        public int available() {
            return inputStream.available();
        }

        @Override
        public int read() {
            return inputStream.read();
        }

        @Override
        public int read(byte[] b, int off, int len) {
            return inputStream.read(b, off, len);
        }

        @Override
        public boolean isFinished() {
            return inputStream.available() == 0;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener listener) {
            throw new UnsupportedOperationException("setReadListener not implemented");
        }
    }
}
