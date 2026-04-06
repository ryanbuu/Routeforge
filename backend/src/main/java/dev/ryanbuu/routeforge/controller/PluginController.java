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
    public ResponseEntity<String> listPlugins(
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/plugins/list", instanceId));
    }

    @GetMapping("/global-rules")
    public ResponseEntity<String> listGlobalRules(
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/global_rules", instanceId));
    }

    @PutMapping("/global-rules/{id}")
    public ResponseEntity<String> putGlobalRule(@PathVariable String id, @RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/global_rules/" + id, "global_rule", id, body, instanceId));
    }

    @DeleteMapping("/global-rules/{id}")
    public ResponseEntity<Void> deleteGlobalRule(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        proxy.delete("/apisix/admin/global_rules/" + id, "global_rule", id, instanceId);
        return ResponseEntity.noContent().build();
    }
}
