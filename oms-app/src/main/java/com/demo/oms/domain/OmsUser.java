package com.demo.oms.domain;

import com.demo.oms.enums.UserRole;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "oms_users", indexes = @Index(name = "idx_username", columnList = "username", unique = true))
public class OmsUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password; // BCrypt encoded

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    private String accountId;    // linked BO account (null for ADMIN/VIEWER)
    private String fullName;
    private String email;
    private boolean active = true;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt = LocalDateTime.now();
}
