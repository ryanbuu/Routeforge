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
    public ResponseEntity<String> list() {
        return ResponseEntity.ok(proxy.get("/apisix/admin/ssls"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> get(@PathVariable String id) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/ssls/" + id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> put(@PathVariable String id, @RequestBody String body) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/ssls/" + id, "ssl", id, body));
    }

    @PostMapping
    public ResponseEntity<String> post(@RequestBody String body) {
        return ResponseEntity.ok(proxy.post("/apisix/admin/ssls", "ssl", body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        proxy.delete("/apisix/admin/ssls/" + id, "ssl", id);
        return ResponseEntity.noContent().build();
    }
}
