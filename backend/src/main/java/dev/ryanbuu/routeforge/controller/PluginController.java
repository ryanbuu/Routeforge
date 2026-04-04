package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.service.ApisixProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plugins")
public class PluginController {
    private final ApisixProxyService proxy;

    public PluginController(ApisixProxyService proxy) {
        this.proxy = proxy;
    }

    @GetMapping
    public ResponseEntity<String> listPlugins() {
        return ResponseEntity.ok(proxy.get("/apisix/admin/plugins/list"));
    }

    @GetMapping("/global-rules")
    public ResponseEntity<String> listGlobalRules() {
        return ResponseEntity.ok(proxy.get("/apisix/admin/global_rules"));
    }

    @PutMapping("/global-rules/{id}")
    public ResponseEntity<String> putGlobalRule(@PathVariable String id, @RequestBody String body) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/global_rules/" + id, "global_rule", id, body));
    }

    @DeleteMapping("/global-rules/{id}")
    public ResponseEntity<Void> deleteGlobalRule(@PathVariable String id) {
        proxy.delete("/apisix/admin/global_rules/" + id, "global_rule", id);
        return ResponseEntity.noContent().build();
    }
}
