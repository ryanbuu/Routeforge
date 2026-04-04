package dev.ryanbuu.routeforge.service;

import dev.ryanbuu.routeforge.model.entity.AuditLog;
import dev.ryanbuu.routeforge.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {
    private final AuditLogRepository repo;

    public AuditLogService(AuditLogRepository repo) {
        this.repo = repo;
    }

    public void log(String action, String resource, String resourceId, String payload) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setResource(resource);
        log.setResourceId(resourceId);
        log.setPayload(payload);
        repo.save(log);
    }

    public Page<AuditLog> list(int page, int size, String resource) {
        PageRequest pr = PageRequest.of(page, size);
        if (resource != null && !resource.isBlank()) {
            return repo.findByResourceOrderByCreatedAtDesc(resource, pr);
        }
        return repo.findAllByOrderByCreatedAtDesc(pr);
    }
}
