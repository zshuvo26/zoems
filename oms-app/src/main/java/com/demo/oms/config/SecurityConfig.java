package com.demo.oms.config;

import com.demo.oms.security.JwtAuthFilter;
import com.demo.oms.security.JwtTokenProvider;
import com.demo.oms.security.OmsUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider tokenProvider;
    private final OmsUserDetailsService userDetailsService;

    @Value("${security.jwt.enabled:true}")
    private boolean jwtEnabled;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(userDetailsService);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(h -> h.frameOptions(f -> f.sameOrigin())); // H2 console iframes

        if (!jwtEnabled) {
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }

        http.authorizeHttpRequests(auth -> auth
                // Public endpoints — no token required
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/ws/**").permitAll()

                // Read-only market data: all authenticated roles
                .requestMatchers(HttpMethod.GET, "/api/v1/market/**").hasAnyRole("ADMIN","DEALER","TRADER","VIEWER")
                .requestMatchers(HttpMethod.GET, "/api/v1/instruments/**").hasAnyRole("ADMIN","DEALER","TRADER","VIEWER")

                // Admin-only operations
                .requestMatchers("/api/v1/instruments/*/halt", "/api/v1/instruments/*/resume").hasRole("ADMIN")
                .requestMatchers("/api/v1/corporate-actions/*/process").hasRole("ADMIN")
                .requestMatchers("/api/v1/reports/**").hasAnyRole("ADMIN","DEALER")
                .requestMatchers("/api/v1/compliance/**").hasAnyRole("ADMIN","DEALER")
                .requestMatchers("/api/v1/ipo/*/allot").hasRole("ADMIN")

                // Fund operations: admin or dealer
                .requestMatchers("/api/v1/accounts/*/deposit", "/api/v1/accounts/*/withdraw").hasAnyRole("ADMIN","DEALER")

                // All other API: authenticated users (ADMIN, DEALER, TRADER)
                .requestMatchers("/api/v1/**").hasAnyRole("ADMIN","DEALER","TRADER")
                .anyRequest().permitAll());

        http.addFilterBefore(new JwtAuthFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
