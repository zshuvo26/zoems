package com.demo.oms.controller;

import com.demo.oms.domain.OmsUser;
import com.demo.oms.dto.*;
import com.demo.oms.repository.OmsUserRepository;
import com.demo.oms.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Tag(name = "Authentication", description = "JWT login — returns Bearer token for all authenticated API calls")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtTokenProvider tokenProvider;
    private final OmsUserRepository userRepository;

    @Operation(
        summary = "Login — obtain JWT Bearer token (valid 24 hours)",
        description = "Authenticate with username/password. Use the returned token in: Authorization: Bearer <token>. "
            + "Default users: admin/admin123 (ADMIN), dealer/dealer123 (DEALER), "
            + "trader/trader123 (TRADER), viewer/viewer123 (VIEWER)."
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Login successful — token in data.token"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid username or password"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Account is disabled")
    })
    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Username and password",
                content = @Content(examples = {
                    @ExampleObject(name = "Admin", value = "{\"username\":\"admin\",\"password\":\"admin123\"}"),
                    @ExampleObject(name = "Dealer", value = "{\"username\":\"dealer\",\"password\":\"dealer123\"}"),
                    @ExampleObject(name = "Trader", value = "{\"username\":\"trader\",\"password\":\"trader123\"}"),
                    @ExampleObject(name = "Viewer", value = "{\"username\":\"viewer\",\"password\":\"viewer123\"}")
                })
            )
            @RequestBody LoginRequest req) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        OmsUser user = userRepository.findByUsername(req.getUsername()).orElseThrow();
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        String token = tokenProvider.generateToken(user.getUsername(), user.getRole().name(), user.getAccountId());
        return ResponseEntity.ok(ApiResponse.ok("Login successful",
                new LoginResponse(token, user.getRole().name(), user.getAccountId())));
    }

    @Operation(
        summary = "Get current user info from Bearer token",
        description = "Decode the current JWT and return the logged-in user's role and linked account ID."
    )
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Token valid — user info returned"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Missing or invalid token")
    })
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LoginResponse>> me(
            @RequestHeader(value = "Authorization", required = false) String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "No token provided"));
        }
        String token = bearerToken.substring(7);
        if (!tokenProvider.isValid(token)) {
            return ResponseEntity.status(401).body(ApiResponse.error("INVALID_TOKEN", "Token expired or invalid"));
        }
        return ResponseEntity.ok(ApiResponse.ok(new LoginResponse(
                token, tokenProvider.getRole(token), tokenProvider.getAccountId(token))));
    }
}
