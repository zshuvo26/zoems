package com.demo.oms.fix;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import quickfix.*;

import java.io.InputStream;

@Configuration
public class FixConfig {

    @Bean
    public SessionSettings fixSessionSettings() throws ConfigError {
        InputStream input = getClass().getResourceAsStream("/fix/client.cfg");
        return new SessionSettings(input);
    }

    @Bean
    public Application fixApplication(FixClientApplication app) {
        return app;
    }

    @Bean
    public MessageStoreFactory messageStoreFactory(SessionSettings settings) throws ConfigError {
        return new FileStoreFactory(settings);
    }

    @Bean
    public LogFactory logFactory(SessionSettings settings) throws ConfigError {
        return new FileLogFactory(settings);
    }

    @Bean
    public MessageFactory messageFactory() {
        return new DefaultMessageFactory();
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    public Initiator socketInitiator(
            Application fixApplication,
            MessageStoreFactory messageStoreFactory,
            SessionSettings settings,
            LogFactory logFactory,
            MessageFactory messageFactory) throws ConfigError {
        return new SocketInitiator(fixApplication, messageStoreFactory, settings, logFactory, messageFactory);
    }
}