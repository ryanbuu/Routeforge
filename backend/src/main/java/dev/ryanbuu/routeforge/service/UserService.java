package dev.ryanbuu.routeforge.service;

import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import dev.ryanbuu.routeforge.model.entity.AppUser;
import dev.ryanbuu.routeforge.repository.ApisixInstanceRepository;
import dev.ryanbuu.routeforge.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class UserService implements UserDetailsService {

    private final UserRepository repo;
    private final ApisixInstanceRepository instanceRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${routeforge.admin.username}")
    private String adminUsername;

    @Value("${routeforge.admin.password}")
    private String adminPassword;

    public UserService(UserRepository repo, ApisixInstanceRepository instanceRepo, PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.instanceRepo = instanceRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    @Transactional
    public void seedAdmin() {
        if (!repo.existsByUsername(adminUsername)) {
            AppUser admin = new AppUser();
            admin.setUsername(adminUsername);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole("ADMIN");
            repo.save(admin);
        }
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = repo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return new User(user.getUsername(), user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));
    }

    public AppUser getByUsername(String username) {
        return repo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    public List<AppUser> listAll() {
        return repo.findAll();
    }

    public AppUser getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    @Transactional
    public AppUser create(String username, String password, String role, Set<Long> instanceIds) {
        if (repo.existsByUsername(username)) {
            throw new RuntimeException("Username already exists: " + username);
        }
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role != null ? role : "USER");
        if (instanceIds != null && !instanceIds.isEmpty()) {
            user.setInstances(new HashSet<>(instanceRepo.findAllById(instanceIds)));
        }
        return repo.save(user);
    }

    @Transactional
    public AppUser update(Long id, String username, String password, String role, Set<Long> instanceIds) {
        AppUser user = getById(id);
        if (username != null && !username.isBlank()) {
            if (!user.getUsername().equals(username) && repo.existsByUsername(username)) {
                throw new RuntimeException("Username already exists: " + username);
            }
            user.setUsername(username);
        }
        if (password != null && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        }
        if (role != null) {
            user.setRole(role);
        }
        if (instanceIds != null) {
            user.setInstances(new HashSet<>(instanceRepo.findAllById(instanceIds)));
        }
        return repo.save(user);
    }

    @Transactional
    public void delete(Long id) {
        AppUser user = getById(id);
        if ("admin".equals(user.getUsername())) {
            throw new RuntimeException("Cannot delete the built-in admin account");
        }
        repo.deleteById(id);
    }
}
