package dev.ryanbuu.routeforge.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cert")
public class CertParseController {

    private Map<String, String> parseSingle(String pem) throws Exception {
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        X509Certificate cert = (X509Certificate) cf.generateCertificate(
                new ByteArrayInputStream(pem.getBytes(StandardCharsets.UTF_8)));
        return Map.of(
                "notBefore", cert.getNotBefore().toInstant().toString(),
                "notAfter", cert.getNotAfter().toInstant().toString(),
                "subject", cert.getSubjectX500Principal().getName(),
                "issuer", cert.getIssuerX500Principal().getName(),
                "serialNumber", cert.getSerialNumber().toString(16)
        );
    }

    @PostMapping("/parse")
    public ResponseEntity<?> parse(@RequestBody Map<String, String> body) {
        String pem = body.get("cert");
        if (pem == null || pem.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "cert is required"));
        }
        try {
            return ResponseEntity.ok(parseSingle(pem));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "无法解析证书: " + e.getMessage()));
        }
    }

    @PostMapping("/parse-batch")
    public ResponseEntity<?> parseBatch(@RequestBody Map<String, String> certs) {
        Map<String, Object> results = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : certs.entrySet()) {
            try {
                results.put(entry.getKey(), parseSingle(entry.getValue()));
            } catch (Exception e) {
                results.put(entry.getKey(), Map.of("error", e.getMessage()));
            }
        }
        return ResponseEntity.ok(results);
    }
}
