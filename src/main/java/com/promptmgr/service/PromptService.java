package com.promptmgr.service;

import com.promptmgr.model.Prompt;
import com.promptmgr.model.VersionRecord;
import com.promptmgr.repository.PromptRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class PromptService {

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{([^}]+)\\}\\}");

    private final PromptRepository promptRepository;
    private final AiService aiService;

    public PromptService(PromptRepository promptRepository, AiService aiService) {
        this.promptRepository = promptRepository;
        this.aiService = aiService;
    }

    public List<Prompt> getAllPrompts() {
        return promptRepository.findAll();
    }

    public Optional<Prompt> getPromptById(String id) {
        return promptRepository.findById(id);
    }

    public Prompt createPrompt(Prompt prompt) {
        extractVariables(prompt);
        VersionRecord version = new VersionRecord(prompt.getContent());
        prompt.addVersion(version);
        return promptRepository.save(prompt);
    }

    public Prompt updatePrompt(String id, Prompt promptData) {
        Optional<Prompt> existingOpt = promptRepository.findById(id);
        if (!existingOpt.isPresent()) {
            throw new RuntimeException("Prompt not found: " + id);
        }

        Prompt existing = existingOpt.get();

        if (!existing.getContent().equals(promptData.getContent())) {
            VersionRecord version = new VersionRecord(promptData.getContent());
            existing.addVersion(version);
        }

        existing.setName(promptData.getName());
        existing.setContent(promptData.getContent());
        existing.setDescription(promptData.getDescription());
        existing.setCategory(promptData.getCategory());
        existing.setOutputFormat(promptData.getOutputFormat());

        extractVariables(existing);
        return promptRepository.save(existing);
    }

    public void deletePrompt(String id) {
        promptRepository.delete(id);
    }

    public String replaceVariables(String content, java.util.Map<String, String> variables) {
        Matcher matcher = VARIABLE_PATTERN.matcher(content);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String varName = matcher.group(1).trim();
            String replacement = variables.getOrDefault(varName, matcher.group(0));
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public List<String> extractVariablesList(String content) {
        Matcher matcher = VARIABLE_PATTERN.matcher(content);
        List<String> result = new java.util.ArrayList<>();
        while (matcher.find()) {
            String varName = matcher.group(1).trim();
            if (!result.contains(varName)) {
                result.add(varName);
            }
        }
        return result;
    }

    private void extractVariables(Prompt prompt) {
        List<String> variables = extractVariablesList(prompt.getContent());
        prompt.setVariables(variables);
    }

    public void saveScore(String promptId, String versionId, Integer score) {
        Optional<Prompt> promptOpt = promptRepository.findById(promptId);
        if (!promptOpt.isPresent()) {
            throw new RuntimeException("Prompt not found: " + promptId);
        }

        Prompt prompt = promptOpt.get();
        if (prompt.getVersions() != null) {
            for (VersionRecord version : prompt.getVersions()) {
                if (version.getId().equals(versionId)) {
                    version.setScore(score);
                    break;
                }
            }
        }
        promptRepository.save(prompt);
    }

    public String exportPrompts() {
        List<Prompt> prompts = getAllPrompts();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
            return mapper.writeValueAsString(prompts);
        } catch (Exception e) {
            throw new RuntimeException("Failed to export prompts", e);
        }
    }

    public void importPrompts(List<Prompt> prompts) {
        for (Prompt prompt : prompts) {
            prompt.setId(null);
            createPrompt(prompt);
        }
    }

    public String debugPrompt(String promptId, String content, String outputFormat) {
        return aiService.debugPrompt(content, outputFormat);
    }

    public String optimizePrompt(String content) {
        return aiService.optimizePrompt(content);
    }
}
