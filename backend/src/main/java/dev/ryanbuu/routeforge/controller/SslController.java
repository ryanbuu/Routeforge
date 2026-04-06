package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.service.ApisixProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ssl")
public class SslController {
    private final ApisixProxyService proxy;

    public SslController(ApisixProxyService proxy) {
        this.proxy = proxy;
    }

    @GetMapping
    public ResponseEntity<String> list(
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/ssls", instanceId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> get(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/ssls/" + id, instanceId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> put(@PathVariable String id, @RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/ssls/" + id, "ssl", id, body, instanceId));
    }

    @PostMapping
    public ResponseEntity<String> post(@RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.post("/apisix/admin/ssls", "ssl", body, instanceId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        proxy.delete("/apisix/admin/ssls/" + id, "ssl", id, instanceId);
        return ResponseEntity.noContent().build();
    }
}
