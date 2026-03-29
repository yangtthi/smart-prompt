package com.promptmgr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Prompt {

    private String id;
    private String name;
    private String content;
    private String description;
    private String category;
    private List<String> variables;
    private String outputFormat;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<VersionRecord> versions;

    public Prompt() {
        this.id = UUID.randomUUID().toString();
        this.variables = new ArrayList<>();
        this.versions = new ArrayList<>();
        this.outputFormat = "text";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void addVersion(VersionRecord version) {
        if (this.versions == null) {
            this.versions = new ArrayList<>();
        }
        version.setVersion(this.versions.size() + 1);
        this.versions.add(version);
        this.updatedAt = LocalDateTime.now();
    }
}
