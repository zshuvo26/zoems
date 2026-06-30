package com.demo.oms.dto;

import com.demo.oms.domain.Watchlist;
import com.demo.oms.domain.Instrument;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WatchlistItemResponse {
    private String id;
    private String accountId;
    private String symbol;
    private String exchange;
    private String alertUpperPrice;
    private String alertLowerPrice;
    private String notes;
    private BigDecimal lastPrice;
    private BigDecimal change;
    private BigDecimal changePct;

    public static WatchlistItemResponse from(Watchlist w, Instrument inst) {
        WatchlistItemResponse r = new WatchlistItemResponse();
        r.setId(w.getId().toString());
        r.setAccountId(w.getAccountId());
        r.setSymbol(w.getSymbol());
        r.setExchange(w.getExchange());
        r.setAlertUpperPrice(w.getAlertUpperPrice());
        r.setAlertLowerPrice(w.getAlertLowerPrice());
        r.setNotes(w.getName());
        if (inst != null) {
            r.setLastPrice(inst.getLastPrice());
            r.setChange(inst.getChange());
            r.setChangePct(inst.getChangePct());
        }
        return r;
    }
}
