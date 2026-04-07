package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.service.ApisixProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final ApisixProxyService proxy;

    public HealthController(ApisixProxyService proxy) {
        this.proxy = proxy;
    }

    @GetMapping
    public ResponseEntity<String> health(
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        try {
            proxy.get("/apisix/admin/routes?page_size=1", instanceId);
            return ResponseEntity.ok("{\"status\":\"up\",\"apisix\":\"connected\"}");
        } catch (Exception e) {
            return ResponseEntity.ok("{\"status\":\"up\",\"apisix\":\"disconnected\",\"error\":\"" + e.getMessage().replace("\"", "\\\"") + "\"}");
        }
    }
}
