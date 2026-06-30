package com.demo.oms.enums;

public enum CorporateActionType {
    CASH_DIVIDEND,      // Cash payment per share (credited to cash balance)
    STOCK_DIVIDEND,     // Dividend paid in additional shares
    BONUS_SHARE,        // Free shares issued (e.g. 1:1 bonus = double shares)
    RIGHTS_ISSUE,       // Right to buy additional shares at discount
    STOCK_SPLIT,        // Share count multiplied, price divided (e.g. 2:1 split)
    REVERSE_SPLIT,      // Share count reduced, price multiplied
    MERGER,             // Two companies combined; existing shares converted
    DELISTING,          // Security removed from exchange listing
    SUSPENSION          // Trading suspended (regulatory or voluntary)
}
