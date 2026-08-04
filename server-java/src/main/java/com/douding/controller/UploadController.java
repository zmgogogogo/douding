package com.douding.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

/** 上传文件访问控制器 */
@RestController
public class UploadController {

    private static final String UPLOAD_DIR = System.getProperty("user.home") + "/first-cc/public/uploads/";

    @GetMapping("/uploads/{filename}")
    public void serveFile(@PathVariable String filename, HttpServletResponse response) throws IOException {
        try {
            File file = new File(UPLOAD_DIR + filename);

            if (!file.exists()) {
                response.setStatus(404);
                response.setContentType("text/plain");
                response.getWriter().write("File not found: " + filename);
                return;
            }

            MediaType mediaType = MediaTypeFactory.getMediaType(filename)
                    .orElse(MediaType.APPLICATION_OCTET_STREAM);
            response.setContentType(mediaType.toString());
            response.setContentLengthLong(file.length());
            Files.copy(file.toPath(), response.getOutputStream());
        } catch (Exception e) {
            response.setStatus(500);
            response.setContentType("text/plain");
            response.getWriter().write("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
