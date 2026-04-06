package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.service.ApisixProxyService;
import dev.ryanbuu.routeforge.service.PaginationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/services")
public class ServiceController {
    private final ApisixProxyService proxy;
    private final PaginationService paginationService;

    public ServiceController(ApisixProxyService proxy, PaginationService paginationService) {
        this.proxy = proxy;
        this.paginationService = paginationService;
    }

    @GetMapping
    public ResponseEntity<String> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        String raw = proxy.get("/apisix/admin/services", instanceId);
        if (page != null) {
            return ResponseEntity.ok(paginationService.paginate(raw, page, size));
        }
        return ResponseEntity.ok(raw);
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> get(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.get("/apisix/admin/services/" + id, instanceId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> put(@PathVariable String id, @RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.put("/apisix/admin/services/" + id, "service", id, body, instanceId));
    }

    @PostMapping
    public ResponseEntity<String> post(@RequestBody String body,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        return ResponseEntity.ok(proxy.post("/apisix/admin/services", "service", body, instanceId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
            @RequestHeader(value = "X-Apisix-Instance-Id", required = false) Long instanceId) {
        proxy.delete("/apisix/admin/services/" + id, "service", id, instanceId);
        return ResponseEntity.noContent().build();
    }
}
