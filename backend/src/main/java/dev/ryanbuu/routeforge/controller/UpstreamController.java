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
    public ResponseEntity<String> list() {
        return ResponseEntity.ok(proxy.get("/apisix/admin/upstreams"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> get(@PathVariable String id) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/upstreams/" + id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> put(@PathVariable String id, @RequestBody String body) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/upstreams/" + id, "upstream", id, body));
    }

    @PostMapping
    public ResponseEntity<String> post(@RequestBody String body) {
        return ResponseEntity.ok(proxy.post("/apisix/admin/upstreams", "upstream", body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        proxy.delete("/apisix/admin/upstreams/" + id, "upstream", id);
        return ResponseEntity.noContent().build();
    }
}
