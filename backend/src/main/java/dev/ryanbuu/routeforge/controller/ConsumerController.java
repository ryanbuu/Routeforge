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
    public ResponseEntity<String> list() {
        return ResponseEntity.ok(proxy.get("/apisix/admin/consumers"));
    }

    @GetMapping("/{username}")
    public ResponseEntity<String> get(@PathVariable String username) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/consumers/" + username));
    }

    @PutMapping("/{username}")
    public ResponseEntity<String> put(@PathVariable String username, @RequestBody String body) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/consumers/" + username, "consumer", username, body));
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<Void> delete(@PathVariable String username) {
        proxy.delete("/apisix/admin/consumers/" + username, "consumer", username);
        return ResponseEntity.noContent().build();
    }
}
