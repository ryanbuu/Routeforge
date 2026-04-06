package dev.ryanbuu.routeforge.service;

import dev.ryanbuu.routeforge.config.ApisixProperties;
import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import dev.ryanbuu.routeforge.repository.ApisixInstanceRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApisixInstanceService {

    private final ApisixInstanceRepository repo;
    private final ApisixProperties defaultProps;

    public ApisixInstanceService(ApisixInstanceRepository repo, ApisixProperties defaultProps) {
        this.repo = repo;
        this.defaultProps = defaultProps;
    }

    @PostConstruct
    @Transactional
    public void seedDefault() {
        if (repo.count() == 0) {
            ApisixInstance inst = new ApisixInstance();
            inst.setName("Default");
            inst.setAdminUrl(defaultProps.getAdminUrl());
            inst.setApiKey(defaultProps.getApiKey());
            inst.setDefault(true);
            repo.save(inst);
        }
    }

    public List<ApisixInstance> listAll() {
        return repo.findAll();
    }

    public ApisixInstance getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("APISIX instance not found: " + id));
    }

    public ApisixInstance getDefault() {
        return repo.findByIsDefaultTrue()
                .orElseThrow(() -> new RuntimeException("No default APISIX instance configured"));
    }

    @Transactional
    public ApisixInstance create(ApisixInstance instance) {
        if (instance.isDefault()) {
            clearDefault();
        }
        return repo.save(instance);
    }

    @Transactional
    public ApisixInstance update(Long id, ApisixInstance updated) {
        ApisixInstance existing = getById(id);
        existing.setName(updated.getName());
        existing.setAdminUrl(updated.getAdminUrl());
        // Only overwrite apiKey if a new value is provided
        if (updated.getApiKey() != null && !updated.getApiKey().isBlank()) {
            existing.setApiKey(updated.getApiKey());
        }
        if (updated.isDefault()) {
            clearDefault();
        }
        existing.setDefault(updated.isDefault());
        return repo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        ApisixInstance inst = getById(id);
        if (inst.isDefault()) {
            throw new RuntimeException("Cannot delete the default instance");
        }
        repo.deleteById(id);
    }

    @Transactional
    public void setDefault(Long id) {
        clearDefault();
        ApisixInstance inst = getById(id);
        inst.setDefault(true);
        repo.save(inst);
    }

    private void clearDefault() {
        repo.findByIsDefaultTrue().ifPresent(inst -> {
            inst.setDefault(false);
            repo.save(inst);
        });
    }
}
