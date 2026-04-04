package dev.ryanbuu.routeforge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "apisix")
public class ApisixProperties {
    private String adminUrl = "http://172.23.254.64:9180";
    private String apiKey = "edd1c9f034335f136f87ad84b625c8f1";

    public String getAdminUrl() { return adminUrl; }
    public void setAdminUrl(String adminUrl) { this.adminUrl = adminUrl; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
}
