package com.promptmgr.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.promptmgr.model.Prompt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class PromptRepository {

    private static final Logger logger = LoggerFactory.getLogger(PromptRepository.class);

    @Value("${app.data-dir:./data/prompts}")
    private String dataDir;

    private final ObjectMapper objectMapper;

    public PromptRepository() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @PostConstruct
    public void init() {
        try {
            Path path = Paths.get(dataDir);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
                logger.info("Created data directory: {}", path.toAbsolutePath());
            }
        } catch (IOException e) {
            logger.error("Failed to create data directory", e);
            throw new RuntimeException("Failed to initialize data directory", e);
        }
    }

    public List<Prompt> findAll() {
        try {
            Path path = Paths.get(dataDir);
            if (!Files.exists(path)) {
                return new ArrayList<>();
            }

            List<Prompt> prompts = Files.list(path)
                    .filter(p -> p.toString().endsWith(".json"))
                    .map(this::readPrompt)
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());

            prompts.sort((a, b) -> {
                if (a.getUpdatedAt() == null && b.getUpdatedAt() == null) return 0;
                if (a.getUpdatedAt() == null) return 1;
                if (b.getUpdatedAt() == null) return -1;
                return b.getUpdatedAt().compareTo(a.getUpdatedAt());
            });

            return prompts;
        } catch (IOException e) {
            logger.error("Failed to read prompts", e);
            return new ArrayList<>();
        }
    }

    public Optional<Prompt> findById(String id) {
        Path filePath = Paths.get(dataDir, id + ".json");
        if (Files.exists(filePath)) {
            return readPrompt(filePath);
        }
        return Optional.empty();
    }

    public Prompt save(Prompt prompt) {
        try {
            if (prompt.getId() == null || prompt.getId().isEmpty()) {
                prompt.setId(java.util.UUID.randomUUID().toString());
            }

            Path filePath = Paths.get(dataDir, prompt.getId() + ".json");
            objectMapper.writeValue(filePath.toFile(), prompt);

            logger.info("Saved prompt: {}", prompt.getId());
            return prompt;
        } catch (IOException e) {
            logger.error("Failed to save prompt: {}", prompt.getId(), e);
            throw new RuntimeException("Failed to save prompt", e);
        }
    }

    public void delete(String id) {
        try {
            Path filePath = Paths.get(dataDir, id + ".json");
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("Deleted prompt: {}", id);
            }
        } catch (IOException e) {
            logger.error("Failed to delete prompt: {}", id, e);
            throw new RuntimeException("Failed to delete prompt", e);
        }
    }

    public void saveAll(List<Prompt> prompts) {
        for (Prompt prompt : prompts) {
            save(prompt);
        }
    }

    private Optional<Prompt> readPrompt(Path path) {
        try {
            Prompt prompt = objectMapper.readValue(path.toFile(), Prompt.class);
            return Optional.of(prompt);
        } catch (IOException e) {
            logger.error("Failed to read prompt from: {}", path, e);
            return Optional.empty();
        }
    }

    public String getDataDir() {
        return dataDir;
    }
}
