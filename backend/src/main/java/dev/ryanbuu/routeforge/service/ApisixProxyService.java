package dev.ryanbuu.routeforge.service;

import dev.ryanbuu.routeforge.model.entity.ApisixInstance;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class ApisixProxyService {

    private final WebClient webClient;
    private final ApisixInstanceService instanceService;
    private final AuditLogService auditLogService;

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
        auditLogService.log("UPDATE", resource, resourceId, body);
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
        auditLogService.log("UPDATE", resource, resourceId, body);
        return result;
    }

    public void delete(String path, String resource, String resourceId, Long instanceId) {
        ApisixInstance inst = resolveInstance(instanceId);
        webClient.delete()
                .uri(inst.getAdminUrl() + path)
                .header("X-API-KEY", inst.getApiKey())
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(b -> Mono.error(new RuntimeException(b))))
                .bodyToMono(Void.class)
                .block();
        auditLogService.log("DELETE", resource, resourceId, null);
    }
}
