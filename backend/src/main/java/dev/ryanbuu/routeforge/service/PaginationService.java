package dev.ryanbuu.routeforge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PaginationService {

    private static final Logger log = LoggerFactory.getLogger(PaginationService.class);
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Takes APISIX list JSON response and returns a paginated wrapper.
     * APISIX format: { "list": [...], "total": N }
     * Output format: { "list": [...], "total": N, "page": P, "size": S, "totalPages": T }
     */
    public String paginate(String apisixJson, int page, int size) {
        try {
            JsonNode root = mapper.readTree(apisixJson);
            ArrayNode list = root.has("list") && root.get("list").isArray()
                    ? (ArrayNode) root.get("list")
                    : mapper.createArrayNode();

            int total = list.size();
            int totalPages = (int) Math.ceil((double) total / size);
            int from = Math.min(page * size, total);
            int to = Math.min(from + size, total);

            ArrayNode pageItems = mapper.createArrayNode();
            for (int i = from; i < to; i++) {
                pageItems.add(list.get(i));
            }

            ObjectNode result = mapper.createObjectNode();
            result.set("list", pageItems);
            result.put("total", total);
            result.put("page", page);
            result.put("size", size);
            result.put("totalPages", totalPages);
            return mapper.writeValueAsString(result);
        } catch (Exception e) {
            log.error("Failed to paginate APISIX response: {}", e.getMessage(), e);
            return apisixJson;
        }
    }
}
