package com.demo.oms.enums;

public enum ExchangeType {
    DSE("Dhaka Stock Exchange", "DSE", "BD"),
    CSE("Chittagong Stock Exchange", "CSE", "BD");

    private final String fullName;
    private final String mic;       // Market Identifier Code
    private final String country;

    ExchangeType(String fullName, String mic, String country) {
        this.fullName = fullName;
        this.mic = mic;
        this.country = country;
    }

    public String getFullName() { return fullName; }
    public String getMic() { return mic; }
    public String getCountry() { return country; }
}
