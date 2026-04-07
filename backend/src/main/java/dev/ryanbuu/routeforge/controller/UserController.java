package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.model.entity.AppUser;
import dev.ryanbuu.routeforge.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(userService.listAll().stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        return ResponseEntity.ok(toDto(userService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        String password = (String) body.get("password");
        String role = (String) body.getOrDefault("role", "USER");
        @SuppressWarnings("unchecked")
        List<Number> ids = (List<Number>) body.get("instanceIds");
        Set<Long> instanceIds = ids != null ? new HashSet<>(ids.stream().map(Number::longValue).toList()) : null;
        return ResponseEntity.ok(toDto(userService.create(username, password, role, instanceIds)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        String password = (String) body.get("password");
        String role = (String) body.get("role");
        @SuppressWarnings("unchecked")
        List<Number> ids = (List<Number>) body.get("instanceIds");
        Set<Long> instanceIds = ids != null ? new HashSet<>(ids.stream().map(Number::longValue).toList()) : null;
        return ResponseEntity.ok(toDto(userService.update(id, username, password, role, instanceIds)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toDto(AppUser user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("role", user.getRole());
        map.put("instanceIds", user.getInstances().stream().map(i -> i.getId()).sorted().toList());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }
}
