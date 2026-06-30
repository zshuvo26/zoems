package com.demo.oms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private String token;
    private String tokenType = "Bearer";
    private String role;
    private String accountId;
    private long expiresInSeconds = 86400;

    public LoginResponse(String token, String role, String accountId) {
        this.token = token;
        this.role = role;
        this.accountId = accountId;
    }
}
