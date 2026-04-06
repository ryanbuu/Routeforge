package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import dev.ryanbuu.routeforge.service.ApisixInstanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/instances")
public class ApisixInstanceController {

    private final ApisixInstanceService instanceService;

    public ApisixInstanceController(ApisixInstanceService instanceService) {
        this.instanceService = instanceService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(instanceService.listAll().stream().map(this::mask).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        return ResponseEntity.ok(mask(instanceService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ApisixInstance instance) {
        return ResponseEntity.ok(mask(instanceService.create(instance)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody ApisixInstance instance) {
        return ResponseEntity.ok(mask(instanceService.update(id, instance)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        instanceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<Void> setDefault(@PathVariable Long id) {
        instanceService.setDefault(id);
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> mask(ApisixInstance inst) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", inst.getId());
        map.put("name", inst.getName());
        map.put("adminUrl", inst.getAdminUrl());
        map.put("apiKeySet", inst.getApiKey() != null && !inst.getApiKey().isEmpty());
        map.put("default", inst.isDefault());
        map.put("createdAt", inst.getCreatedAt());
        return map;
    }
}
