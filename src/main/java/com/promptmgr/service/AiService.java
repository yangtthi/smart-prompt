package com.promptmgr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final Logger logger = LoggerFactory.getLogger(AiService.class);

    @Value("${app.ai.api-url}")
    private String apiUrl;

    @Value("${app.ai.api-key}")
    private String apiKey;

    @Value("${app.ai.model}")
    private String model;

    private final ObjectMapper objectMapper;

    public AiService() {
        this.objectMapper = new ObjectMapper();
    }

    public String chat(String prompt) {
        return chat(prompt, new ArrayList<>());
    }

    public String chat(String prompt, List<Map<String, String>> messages) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);

            List<Map<String, String>> allMessages = new ArrayList<>();
            allMessages.add(createMessage("user", prompt));
            requestBody.put("messages", allMessages);

            String json = objectMapper.writeValueAsString(requestBody);

            try (CloseableHttpClient client = HttpClients.createDefault()) {
                HttpPost httpPost = new HttpPost(apiUrl);
                httpPost.setHeader("Authorization", "Bearer " + apiKey);
                httpPost.setHeader("Content-Type", "application/json");
                httpPost.setEntity(new StringEntity(json, StandardCharsets.UTF_8));

                try (CloseableHttpResponse response = client.execute(httpPost)) {
                    String responseBody = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);

                    if (response.getStatusLine().getStatusCode() == 200) {
                        JsonNode root = objectMapper.readTree(responseBody);
                        JsonNode choices = root.get("choices");
                        if (choices != null && choices.isArray() && choices.size() > 0) {
                            JsonNode firstChoice = choices.get(0);
                            JsonNode message = firstChoice.get("message");
                            if (message != null) {
                                return message.get("content").asText();
                            }
                        }
                        return responseBody;
                    } else {
                        logger.error("AI API error: {}", responseBody);
                        return "API 调用失败: " + responseBody;
                    }
                }
            }
        } catch (Exception e) {
            logger.error("AI API call failed", e);
            return "API 调用失败: " + e.getMessage();
        }
    }

    public String optimizePrompt(String prompt) {
        String systemPrompt = "你是一个专业的提示词工程师。你的任务是优化用户提供的提示词，使其更加清晰、具体、有效。\n" +
                "请遵循以下原则：\n" +
                "1. 明确任务目标\n" +
                "2. 提供具体的上下文信息\n" +
                "3. 说明输出格式要求\n" +
                "4. 添加必要的约束条件\n" +
                "请直接输出优化后的提示词，不要添加任何解释。";

        return chat(systemPrompt + "\n\n原始提示词:\n" + prompt);
    }

    public String debugPrompt(String prompt, String outputFormat) {
        String formatInstruction = "";
        if ("json".equalsIgnoreCase(outputFormat)) {
            formatInstruction = "请以 JSON 格式输出结果。";
        } else if ("markdown".equalsIgnoreCase(outputFormat)) {
            formatInstruction = "请以 Markdown 格式输出结果。";
        }

        String systemPrompt = "你是一个 AI 助手。用户会给你一个提示词，请根据该提示词生成相应的回复。\n" + formatInstruction;

        return chat(systemPrompt + "\n\n用户提示词:\n" + prompt);
    }

    private Map<String, String> createMessage(String role, String content) {
        Map<String, String> message = new HashMap<>();
        message.put("role", role);
        message.put("content", content);
        return message;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }
}
