package dev.ryanbuu.routeforge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class ApisixProxyService {

    private static final Logger log = LoggerFactory.getLogger(ApisixProxyService.class);

    private final WebClient webClient;
    private final ApisixInstanceService instanceService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ApisixProxyService(WebClient webClient, ApisixInstanceService instanceService, AuditLogService auditLogService) {
        this.webClient = webClient;
        this.instanceService = instanceService;
        this.auditLogService = auditLogService;
    }

    private ApisixInstance resolveInstance(Long instanceId) {
        if (instanceId != null) {
            return instanceService.getById(instanceId);
        }
        return instanceService.getDefault();
    }

    /**
     * Extract the "value" node from an APISIX admin API GET response.
     * Response format: { "node": { "key": "...", "value": { ... } } }
     * or APISIX 3.x: { "value": { ... } }
     */
    private String extractValue(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode value = root.path("node").path("value");
            if (value.isMissingNode() || value.isNull()) {
                value = root.path("value");
            }
            if (!value.isMissingNode() && !value.isNull()) {
                return objectMapper.writeValueAsString(value);
            }
        } catch (Exception e) {
            log.warn("Failed to extract value from APISIX response: {}", e.getMessage());
        }
        return raw;
    }

    /**
     * Fetch current resource state before a write operation. Returns null on failure.
     */
    private String fetchCurrentState(String path, Long instanceId) {
        try {
            return extractValue(get(path, instanceId));
        } catch (Exception e) {
            log.error("Failed to fetch current state for audit diff [path={}]: {}", path, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Build a JSON payload with before/after for UPDATE audit logs.
     */
    private String buildDiffPayload(String before, String after) {
        try {
            ObjectNode node = objectMapper.createObjectNode();
            if (before != null) {
                node.set("before", objectMapper.readTree(before));
            }
            node.set("after", objectMapper.readTree(after));
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            log.error("Failed to build diff payload for audit log: {}", e.getMessage(), e);
            return after;
        }
    }

    public String get(String path, Long instanceId) {
        ApisixInstance inst = resolveInstance(instanceId);
        return webClient.get()
                .uri(inst.getAdminUrl() + path)
                .header("X-API-KEY", inst.getApiKey())
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(body -> Mono.error(new RuntimeException(body))))
                .bodyToMono(String.class)
                .block();
    }

    public String put(String path, String resource, String resourceId, String body, Long instanceId) {
        // Fetch state before update
        String before = fetchCurrentState(path, instanceId);

        ApisixInstance inst = resolveInstance(instanceId);
        String result = webClient.put()
                .uri(inst.getAdminUrl() + path)
                .header("X-API-KEY", inst.getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(b -> Mono.error(new RuntimeException(b))))
                .bodyToMono(String.class)
                .block();

        String diffPayload = buildDiffPayload(before, body);
        auditLogService.log("UPDATE", resource, resourceId, diffPayload);
        return result;
    }

    public String post(String path, String resource, String body, Long instanceId) {
        ApisixInstance inst = resolveInstance(instanceId);
        String result = webClient.post()
                .uri(inst.getAdminUrl() + path)
                .header("X-API-KEY", inst.getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(b -> Mono.error(new RuntimeException(b))))
                .bodyToMono(String.class)
                .block();
        auditLogService.log("CREATE", resource, null, body);
        return result;
    }

    public String patch(String path, String resource, String resourceId, String body, Long instanceId) {
        // Fetch state before update
        String before = fetchCurrentState(path, instanceId);

        ApisixInstance inst = resolveInstance(instanceId);
        String result = webClient.patch()
                .uri(inst.getAdminUrl() + path)
                .header("X-API-KEY", inst.getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(b -> Mono.error(new RuntimeException(b))))
                .bodyToMono(String.class)
                .block();

        String diffPayload = buildDiffPayload(before, body);
        auditLogService.log("UPDATE", resource, resourceId, diffPayload);
        return result;
    }

    public void delete(String path, String resource, String resourceId, Long instanceId) {
        // Fetch state before delete (to preserve name and full snapshot)
        String before = fetchCurrentState(path, instanceId);

        ApisixInstance inst = resolveInstance(instanceId);
        webClient.delete()
                .uri(inst.getAdminUrl() + path)
                .header("X-API-KEY", inst.getApiKey())
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(b -> Mono.error(new RuntimeException(b))))
                .bodyToMono(Void.class)
                .block();
        auditLogService.log("DELETE", resource, resourceId, before);
    }
}
