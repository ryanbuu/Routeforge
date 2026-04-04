package dev.ryanbuu.routeforge.service;

import dev.ryanbuu.routeforge.config.ApisixProperties;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Set;

@Service
public class ApisixProxyService {
    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final WebClient webClient;
    private final ApisixProperties props;
    private final AuditLogService auditLogService;

    public ApisixProxyService(WebClient webClient, ApisixProperties props, AuditLogService auditLogService) {
        this.webClient = webClient;
        this.props = props;
        this.auditLogService = auditLogService;
    }

    public String get(String path) {
        return webClient.get()
                .uri(props.getAdminUrl() + path)
                .header("X-API-KEY", props.getApiKey())
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(body -> Mono.error(new RuntimeException(body))))
                .bodyToMono(String.class)
                .block();
    }

    public String put(String path, String resource, String resourceId, String body) {
        String result = webClient.put()
                .uri(props.getAdminUrl() + path)
                .header("X-API-KEY", props.getApiKey())
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

    public String post(String path, String resource, String body) {
        String result = webClient.post()
                .uri(props.getAdminUrl() + path)
                .header("X-API-KEY", props.getApiKey())
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

    public String patch(String path, String resource, String resourceId, String body) {
        String result = webClient.patch()
                .uri(props.getAdminUrl() + path)
                .header("X-API-KEY", props.getApiKey())
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

    public void delete(String path, String resource, String resourceId) {
        webClient.delete()
                .uri(props.getAdminUrl() + path)
                .header("X-API-KEY", props.getApiKey())
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp ->
                        resp.bodyToMono(String.class).flatMap(b -> Mono.error(new RuntimeException(b))))
                .bodyToMono(Void.class)
                .block();
        auditLogService.log("DELETE", resource, resourceId, null);
    }
}
