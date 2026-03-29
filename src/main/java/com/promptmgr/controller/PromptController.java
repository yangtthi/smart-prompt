package com.promptmgr.controller;

import com.promptmgr.model.Prompt;
import com.promptmgr.model.VersionRecord;
import com.promptmgr.service.PromptService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prompts")
public class PromptController {

    private final PromptService promptService;

    public PromptController(PromptService promptService) {
        this.promptService = promptService;
    }

    @GetMapping
    public List<Prompt> getAllPrompts() {
        return promptService.getAllPrompts();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Prompt> getPromptById(@PathVariable String id) {
        return promptService.getPromptById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Prompt createPrompt(@RequestBody Prompt prompt) {
        return promptService.createPrompt(prompt);
    }

    @PutMapping("/{id}")
    public Prompt updatePrompt(@PathVariable String id, @RequestBody Prompt prompt) {
        return promptService.updatePrompt(id, prompt);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrompt(@PathVariable String id) {
        promptService.deletePrompt(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/debug")
    public ResponseEntity<Map<String, String>> debugPrompt(@PathVariable String id, @RequestBody Map<String, String> request) {
        if (!promptService.getPromptById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        String content = request.get("content");
        String outputFormat = request.get("outputFormat");

        if (content == null || content.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("result", "请提供内容");
            return ResponseEntity.badRequest().body(response);
        }

        String result = promptService.debugPrompt(id, content, outputFormat);
        Map<String, String> response = new HashMap<>();
        response.put("result", result);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/versions/{versionId}/score")
    public ResponseEntity<Prompt> setScore(@PathVariable String id, @PathVariable String versionId, @RequestBody Map<String, Integer> request) {
        try {
            Integer score = request.get("score");
            if (score == null || score < 1 || score > 5) {
                return ResponseEntity.badRequest().build();
            }
            promptService.saveScore(id, versionId, score);
            return promptService.getPromptById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/optimize")
    public ResponseEntity<Map<String, String>> optimizePrompt(@RequestBody Map<String, String> request) {
        String content = request.get("content");

        if (content == null || content.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "请提供内容");
            return ResponseEntity.badRequest().body(response);
        }

        String optimizedContent = promptService.optimizePrompt(content);
        Map<String, String> response = new HashMap<>();
        response.put("optimizedContent", optimizedContent);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportPrompts() {
        try {
            String json = promptService.exportPrompts();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentDispositionFormData("attachment", "prompts-export.json");
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(json.getBytes("UTF-8"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importPrompts(@RequestBody List<Prompt> prompts) {
        try {
            promptService.importPrompts(prompts);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "导入成功");
            response.put("count", prompts.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("message", "导入失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
