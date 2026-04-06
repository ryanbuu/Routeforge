package dev.ryanbuu.routeforge.repository;

import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ApisixInstanceRepository extends JpaRepository<ApisixInstance, Long> {
    Optional<ApisixInstance> findByIsDefaultTrue();
}
