package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.service.ApisixProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consumers")
public class ConsumerController {
    private final ApisixProxyService proxy;

    public ConsumerController(ApisixProxyService proxy) {
        this.proxy = proxy;
    }

    @GetMapping
    public ResponseEntity<String> list(
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/consumers", instanceId));
    }

    @GetMapping("/{username}")
    public ResponseEntity<String> get(@PathVariable String username,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/consumers/" + username, instanceId));
    }

    @PutMapping("/{username}")
    public ResponseEntity<String> put(@PathVariable String username, @RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/consumers/" + username, "consumer", username, body, instanceId));
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<Void> delete(@PathVariable String username,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        proxy.delete("/apisix/admin/consumers/" + username, "consumer", username, instanceId);
        return ResponseEntity.noContent().build();
    }
}
