import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../theme';
import { useAuthStore } from '../store/auth';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MarketScreen from '../screens/market/MarketScreen';
import MarketScannerScreen from '../screens/market/MarketScannerScreen';
import InstrumentDetailScreen from '../screens/market/InstrumentDetailScreen';
import OrderBookScreen from '../screens/market/OrderBookScreen';
import MarketMoversScreen from '../screens/market/MarketMoversScreen';
import SectorHeatmapScreen from '../screens/market/SectorHeatmapScreen';
import CircuitBreakerScreen from '../screens/market/CircuitBreakerScreen';
import ForeignFlowScreen from '../screens/market/ForeignFlowScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import NewOrderScreen from '../screens/orders/NewOrderScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import OrderAuditScreen from '../screens/orders/OrderAuditScreen';
import AlgoOrdersScreen from '../screens/algo/AlgoOrdersScreen';
import NewAlgoScreen from '../screens/algo/NewAlgoScreen';
import BasketScreen from '../screens/basket/BasketScreen';
import PortfolioScreen from '../screens/portfolio/PortfolioScreen';
import PerformanceScreen from '../screens/portfolio/PerformanceScreen';
import RebalanceScreen from '../screens/portfolio/RebalanceScreen';
import TcaScreen from '../screens/portfolio/TcaScreen';
import WatchlistScreen from '../screens/watchlist/WatchlistScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import MoreScreen from '../screens/more/MoreScreen';
import IpoScreen from '../screens/more/IpoScreen';
import MarginScreen from '../screens/more/MarginScreen';
import SettlementScreen from '../screens/more/SettlementScreen';
import ComplianceScreen from '../screens/more/ComplianceScreen';
import CorporateActionsScreen from '../screens/more/CorporateActionsScreen';
import RiskLimitsScreen from '../screens/more/RiskLimitsScreen';
import SettingsScreen from '../screens/more/SettingsScreen';
import TradeHistoryScreen from '../screens/more/TradeHistoryScreen';
import NewsScreen from '../screens/more/NewsScreen';
import PriceAlertsScreen from '../screens/more/PriceAlertsScreen';
import OrderTemplatesScreen from '../screens/more/OrderTemplatesScreen';
import CashLedgerScreen from '../screens/more/CashLedgerScreen';
import ProfitCalculatorScreen from '../screens/more/ProfitCalculatorScreen';
import AIInsightsScreen from '../screens/ai/AIInsightsScreen';
import AIPortfolioAdvisorScreen from '../screens/ai/AIPortfolioAdvisorScreen';
import AIChatScreen from '../screens/ai/AIChatScreen';
import OrderSearchScreen from '../screens/orders/OrderSearchScreen';
import ParentOrderScreen from '../screens/orders/ParentOrderScreen';
import SavedBasketsScreen from '../screens/basket/SavedBasketsScreen';
import LatencyMonitorScreen from '../screens/more/LatencyMonitorScreen';

import type {
  RootStackParamList, TabParamList,
  MarketStackParamList, TradeStackParamList,
  PortfolioStackParamList, MoreStackParamList,
} from './types';

const RootStack     = createNativeStackNavigator<RootStackParamList>();
const Tab           = createBottomTabNavigator<TabParamList>();
const MarketStack   = createNativeStackNavigator<MarketStackParamList>();
const TradeStack    = createNativeStackNavigator<TradeStackParamList>();
const PortfolioStack = createNativeStackNavigator<PortfolioStackParamList>();
const MoreStack     = createNativeStackNavigator<MoreStackParamList>();

const HEADER_STYLE = {
  headerStyle:          { backgroundColor: Colors.bg.secondary },
  headerTitleStyle:     { color: Colors.text.primary, fontSize: 16, fontWeight: '600' as const },
  headerTintColor:      Colors.accent.blue,
  headerBackTitleVisible: false,
};

// ── Stack Navigators ──────────────────────────────────────────────────────────
function MarketNavigator() {
  return (
    <MarketStack.Navigator screenOptions={HEADER_STYLE}>
      <MarketStack.Screen name="MarketList"        component={MarketScreen}           options={{ title: 'Market' }} />
      <MarketStack.Screen name="Scanner"           component={MarketScannerScreen}    options={{ title: 'Market Scanner' }} />
      <MarketStack.Screen name="MarketMovers"      component={MarketMoversScreen}     options={{ title: 'Market Movers' }} />
      <MarketStack.Screen name="SectorHeatmap"     component={SectorHeatmapScreen}    options={{ title: 'Sector Heatmap' }} />
      <MarketStack.Screen name="CircuitBreaker"    component={CircuitBreakerScreen}   options={{ title: 'Circuit Breaker Monitor' }} />
      <MarketStack.Screen name="ForeignFlow"       component={ForeignFlowScreen}      options={{ title: 'Foreign Investor Flow (FDR)' }} />
      <MarketStack.Screen name="InstrumentDetail"  component={InstrumentDetailScreen} options={({ route }) => ({ title: route.params.symbol })} />
      <MarketStack.Screen name="OrderBook"         component={OrderBookScreen}        options={({ route }) => ({ title: `${route.params.symbol} L2` })} />
      <MarketStack.Screen name="NewOrder"          component={NewOrderScreen}         options={{ title: 'New Order', presentation: 'modal' }} />
    </MarketStack.Navigator>
  );
}

function TradeNavigator() {
  return (
    <TradeStack.Navigator screenOptions={HEADER_STYLE}>
      <TradeStack.Screen name="OrdersList"   component={OrdersScreen}      options={{ title: 'Orders' }} />
      <TradeStack.Screen name="NewOrder"     component={NewOrderScreen}     options={{ title: 'New Order', presentation: 'modal' }} />
      <TradeStack.Screen name="OrderDetail"  component={OrderDetailScreen}  options={{ title: 'Order Detail' }} />
      <TradeStack.Screen name="OrderAudit"   component={OrderAuditScreen}   options={{ title: 'Audit Trail' }} />
      <TradeStack.Screen name="AlgoList"     component={AlgoOrdersScreen}   options={{ title: 'Algo Orders' }} />
      <TradeStack.Screen name="NewAlgoOrder" component={NewAlgoScreen}      options={{ title: 'New Algo Order', presentation: 'modal' }} />
      <TradeStack.Screen name="BasketOrder"  component={BasketScreen}       options={{ title: 'Basket Order', presentation: 'modal' }} />
      <TradeStack.Screen name="OrderSearch"  component={OrderSearchScreen}  options={{ title: 'Order Search' }} />
      <TradeStack.Screen name="ParentOrder"  component={ParentOrderScreen}  options={{ title: 'Parent Order' }} />
      <TradeStack.Screen name="SavedBaskets" component={SavedBasketsScreen} options={{ title: 'Saved Baskets' }} />
    </TradeStack.Navigator>
  );
}

function PortfolioNavigator() {
  return (
    <PortfolioStack.Navigator screenOptions={HEADER_STYLE}>
      <PortfolioStack.Screen name="PortfolioSummary" component={PortfolioScreen}    options={{ title: 'Portfolio' }} />
      <PortfolioStack.Screen name="Performance"      component={PerformanceScreen}  options={{ title: 'Performance' }} />
      <PortfolioStack.Screen name="Rebalance"        component={RebalanceScreen}    options={{ title: 'Portfolio Rebalancer' }} />
      <PortfolioStack.Screen name="Tca"              component={TcaScreen}          options={{ title: 'TCA Analysis' }} />
    </PortfolioStack.Navigator>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={HEADER_STYLE}>
      <MoreStack.Screen name="MoreMenu"         component={MoreScreen}        options={{ title: 'More' }} />
      <MoreStack.Screen name="Watchlist"        component={WatchlistScreen}   options={{ title: 'Watchlist' }} />
      <MoreStack.Screen name="Notifications"    component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <MoreStack.Screen name="Ipo"              component={IpoScreen}         options={{ title: 'IPO' }} />
      <MoreStack.Screen name="Margin"           component={MarginScreen}      options={{ title: 'Margin & Risk' }} />
      <MoreStack.Screen name="Settlement"       component={SettlementScreen}  options={{ title: 'Settlement (T+2)' }} />
      <MoreStack.Screen name="Compliance"        component={ComplianceScreen}       options={{ title: 'Compliance Rules' }} />
      <MoreStack.Screen name="CorporateActions" component={CorporateActionsScreen}  options={{ title: 'Corporate Actions' }} />
      <MoreStack.Screen name="RiskLimits"       component={RiskLimitsScreen}           options={{ title: 'Risk Limits' }} />
      <MoreStack.Screen name="Settings"         component={SettingsScreen}             options={{ title: 'Settings' }} />
      <MoreStack.Screen name="TradeHistory"        component={TradeHistoryScreen}       options={{ title: 'Trade History' }} />
      <MoreStack.Screen name="News"               component={NewsScreen}               options={{ title: 'Market News' }} />
      <MoreStack.Screen name="PriceAlerts"        component={PriceAlertsScreen}        options={{ title: 'Price Alerts' }} />
      <MoreStack.Screen name="OrderTemplates"     component={OrderTemplatesScreen}     options={{ title: 'Order Templates' }} />
      <MoreStack.Screen name="CashLedger"         component={CashLedgerScreen}         options={{ title: 'Cash Ledger' }} />
      <MoreStack.Screen name="ProfitCalculator"   component={ProfitCalculatorScreen}   options={{ title: 'Profit Calculator' }} />
      <MoreStack.Screen name="AIInsights"         component={AIInsightsScreen}         options={{ title: 'AI Market Signals' }} />
      <MoreStack.Screen name="AIPortfolioAdvisor" component={AIPortfolioAdvisorScreen} options={{ title: 'AI Portfolio Advisor' }} />
      <MoreStack.Screen name="AIChat"             component={AIChatScreen}             options={{ title: 'AI Trading Assistant' }} />
      <MoreStack.Screen name="LatencyMonitor"     component={LatencyMonitorScreen}     options={{ title: 'Latency Monitor' }} />
      <MoreStack.Screen name="OrderSearch"        component={OrderSearchScreen}        options={{ title: 'Order Search' }} />
      <MoreStack.Screen name="SavedBaskets"       component={SavedBasketsScreen}       options={{ title: 'Saved Baskets' }} />
    </MoreStack.Navigator>
  );
}

// ── Notification Badge ────────────────────────────────────────────────────────
function NotifBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// ── Bottom Tabs ───────────────────────────────────────────────────────────────
function MainTabNavigator() {
  const { accountId } = useAuthStore();
  const { data } = useQuery({
    queryKey:    ['notifCount', accountId],
    queryFn:     () => accountId ? notificationsApi.count(accountId) : null,
    refetchInterval: 30_000,
    enabled:     !!accountId,
  });
  const unread = data?.unread ?? 0;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle:      styles.tabBar,
        tabBarActiveTintColor:   Colors.accent.blue,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Dashboard': icon = focused ? 'home'        : 'home-outline'; break;
            case 'Market':    icon = focused ? 'bar-chart'   : 'bar-chart-outline'; break;
            case 'Trade':     icon = focused ? 'swap-vertical' : 'swap-vertical-outline'; break;
            case 'Portfolio': icon = focused ? 'pie-chart'   : 'pie-chart-outline'; break;
            case 'More':      icon = focused ? 'grid'        : 'grid-outline'; break;
          }
          if (route.name === 'More' && unread > 0) {
            return (
              <View>
                <Ionicons name={icon} size={size} color={color} />
                <NotifBadge count={unread} />
              </View>
            );
          }
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Market"    component={MarketNavigator} />
      <Tab.Screen name="Trade"     component={TradeNavigator} />
      <Tab.Screen name="Portfolio" component={PortfolioNavigator} />
      <Tab.Screen name="More"      component={MoreNavigator} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
const navTheme = {
  dark: true,
  colors: {
    primary:    Colors.accent.blue,
    background: Colors.bg.primary,
    card:       Colors.bg.secondary,
    text:       Colors.text.primary,
    border:     Colors.border.default,
    notification: Colors.status.error,
  },
};

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isLoading ? (
          <RootStack.Screen name="Splash" component={SplashScreen} />
        ) : isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.secondary,
    borderTopColor:  Colors.border.default,
    borderTopWidth:  1,
    height:          60,
    paddingBottom:   8,
    paddingTop:      6,
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '600',
    marginTop:  -2,
  },
  badge: {
    position:        'absolute',
    top:             -4,
    right:           -6,
    backgroundColor: Colors.bear,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color:      Colors.white,
    fontSize:   9,
    fontWeight: '700',
  },
});
