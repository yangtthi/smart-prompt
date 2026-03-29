package com.promptmgr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class VersionRecord {

    private String id;
    private Integer version;
    private String content;
    private LocalDateTime createdAt;
    private Integer score;
    private String testResult;

    public VersionRecord() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
    }

    public VersionRecord(String content) {
        this();
        this.content = content;
    }
}
