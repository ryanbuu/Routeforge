package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.model.entity.AuditLog;
import dev.ryanbuu.routeforge.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {
    private final AuditLogService service;

    public AuditLogController(AuditLogService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<AuditLog>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String resource) {
        return ResponseEntity.ok(service.list(page, size, resource));
    }
}
