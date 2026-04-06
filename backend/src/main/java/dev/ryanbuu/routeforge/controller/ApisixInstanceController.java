package dev.ryanbuu.routeforge.controller;

import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import dev.ryanbuu.routeforge.service.ApisixInstanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/instances")
public class ApisixInstanceController {

    private final ApisixInstanceService instanceService;

    public ApisixInstanceController(ApisixInstanceService instanceService) {
        this.instanceService = instanceService;
    }

    @GetMapping
    public ResponseEntity<List<ApisixInstance>> list() {
        return ResponseEntity.ok(instanceService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApisixInstance> get(@PathVariable Long id) {
        return ResponseEntity.ok(instanceService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApisixInstance> create(@RequestBody ApisixInstance instance) {
        return ResponseEntity.ok(instanceService.create(instance));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApisixInstance> update(@PathVariable Long id, @RequestBody ApisixInstance instance) {
        return ResponseEntity.ok(instanceService.update(id, instance));
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
}
