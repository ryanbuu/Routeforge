package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.service.ApisixProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/upstreams")
public class UpstreamController {
    private final ApisixProxyService proxy;

    public UpstreamController(ApisixProxyService proxy) {
        this.proxy = proxy;
    }

    @GetMapping
    public ResponseEntity<String> list(
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/upstreams", instanceId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> get(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/upstreams/" + id, instanceId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> put(@PathVariable String id, @RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/upstreams/" + id, "upstream", id, body, instanceId));
    }

    @PostMapping
    public ResponseEntity<String> post(@RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.post("/apisix/admin/upstreams", "upstream", body, instanceId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        proxy.delete("/apisix/admin/upstreams/" + id, "upstream", id, instanceId);
        return ResponseEntity.noContent().build();
    }
}
