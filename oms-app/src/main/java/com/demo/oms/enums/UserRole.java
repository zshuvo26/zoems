package com.demo.oms.enums;

public enum UserRole {
    ADMIN,    // full access — system configuration, user management, reports
    DEALER,   // submit/cancel/amend orders for any account, view all
    TRADER,   // submit/cancel/amend orders for own linked account only
    VIEWER    // read-only access to orders, trades, portfolio
}
