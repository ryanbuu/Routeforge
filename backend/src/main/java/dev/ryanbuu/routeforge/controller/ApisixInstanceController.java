package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import dev.ryanbuu.routeforge.model.entity.AppUser;
import dev.ryanbuu.routeforge.service.ApisixInstanceService;
import dev.ryanbuu.routeforge.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/instances")
public class ApisixInstanceController {

    private final ApisixInstanceService instanceService;
    private final UserService userService;

    public ApisixInstanceController(ApisixInstanceService instanceService, UserService userService) {
        this.instanceService = instanceService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        AppUser user = currentUser();
        List<ApisixInstance> instances;
        if (user.isAdmin()) {
            instances = instanceService.listAll();
        } else {
            instances = user.getInstances().stream().sorted((a, b) -> a.getId().compareTo(b.getId())).collect(Collectors.toList());
        }
        return ResponseEntity.ok(instances.stream().map(this::mask).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        checkAccess(id);
        return ResponseEntity.ok(mask(instanceService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody ApisixInstance instance) {
        requireAdmin();
        return ResponseEntity.ok(mask(instanceService.create(instance)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody ApisixInstance instance) {
        requireAdmin();
        return ResponseEntity.ok(mask(instanceService.update(id, instance)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        requireAdmin();
        instanceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<Void> setDefault(@PathVariable Long id) {
        requireAdmin();
        instanceService.setDefault(id);
        return ResponseEntity.ok().build();
    }

    private AppUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userService.getByUsername(auth.getName());
    }

    private void requireAdmin() {
        if (!currentUser().isAdmin()) {
            throw new RuntimeException("Admin access required");
        }
    }

    private void checkAccess(Long instanceId) {
        AppUser user = currentUser();
        if (user.isAdmin()) return;
        Set<Long> allowed = user.getInstances().stream().map(ApisixInstance::getId).collect(Collectors.toSet());
        if (!allowed.contains(instanceId)) {
            throw new RuntimeException("Access denied to instance: " + instanceId);
        }
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
