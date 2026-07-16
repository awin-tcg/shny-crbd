import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Card, Portfolio } from "@cardboard/contracts";
import { getPortfolio, searchCards } from "./src/api";
import { createMobileIdentity, type MobileSession } from "./src/auth";

type Tab = "portfolio" | "search";

export default function App() {
  const identity = useMemo(createMobileIdentity, []);
  const [session, setSession] = useState<MobileSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [tab, setTab] = useState<Tab>("portfolio");

  useEffect(() => {
    identity
      .restore()
      .then(setSession)
      .finally(() => setRestoring(false));
  }, [identity]);

  if (restoring) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#a7f46b" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.login}>
        <StatusBar style="light" />
        <View style={styles.logo} accessible accessibilityLabel="CRDBRD">
          <Text style={styles.logoText}>CR</Text>
        </View>
        <Text style={styles.hero}>Your collection,{`\n`}in focus.</Text>
        <Text style={styles.muted}>
          Exact card variants, clear market values, and private-by-default data.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => identity.signIn().then(setSession)}
        >
          <Text style={styles.primaryButtonText}>Continue in development</Text>
        </Pressable>
        <Text style={styles.securityNote}>
          Google and Apple OIDC are enabled after the identity-provider
          decision. Native sessions will use PKCE and platform secure storage.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.mobileHeader}>
        <Text style={styles.wordmark}>CRDBRD</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => identity.signOut().then(() => setSession(null))}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      {tab === "portfolio" ? (
        <PortfolioScreen session={session} onSearch={() => setTab("search")} />
      ) : (
        <SearchScreen session={session} />
      )}
      <View style={styles.tabs} accessibilityLabel="Primary navigation">
        {(["portfolio", "search"] as const).map((item) => (
          <Pressable
            accessibilityLabel={
              item === "portfolio" ? "Portfolio" : "Search cards"
            }
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.activeTab]}
          >
            <Text
              aria-hidden
              style={[styles.tabMark, tab === item && styles.activeTabMark]}
            >
              {item === "portfolio" ? "P" : "S"}
            </Text>
            <Text
              style={[styles.tabText, tab === item && styles.activeTabText]}
            >
              {item === "portfolio" ? "Portfolio" : "Search cards"}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function PortfolioScreen({
  session,
  onSearch,
}: {
  session: MobileSession;
  onSearch: () => void;
}) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPortfolio(session)
      .then(setPortfolio)
      .catch(() => {
        setError("Could not reach the portfolio API.");
      });
  }, [session]);

  if (error) return <Message text={error} />;
  if (!portfolio) return <Message loading text="Loading portfolio…" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PRIVATE PORTFOLIO</Text>
      <Text style={styles.title}>Know what you hold.</Text>
      <View style={styles.valueCard}>
        <Text style={styles.valueLabel}>MARKET VALUE</Text>
        <Text style={styles.value}>{money(portfolio.marketValueCents)}</Text>
        <Text style={[styles.gain, portfolio.gainLossCents < 0 && styles.loss]}>
          {signedMoney(portfolio.gainLossCents)} unrealized
        </Text>
      </View>
      <PortfolioHistory snapshots={portfolio.snapshots} />
      <View style={styles.statRow}>
        <Stat label="Cost basis" value={money(portfolio.costBasisCents)} />
        <Stat label="Priced" value={`${portfolio.valuedItems}`} />
        <Stat label="Unpriced" value={`${portfolio.unpricedItems}`} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onSearch}
        style={styles.findCardsButton}
      >
        <Text style={styles.findCardsText}>Search for cards</Text>
        <Text style={styles.findCardsArrow} aria-hidden>
          →
        </Text>
      </Pressable>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Holdings</Text>
        <Text style={styles.mutedSmall}>
          {portfolio.lines.length} item{portfolio.lines.length === 1 ? "" : "s"}
        </Text>
      </View>
      {portfolio.lines.map((line) => (
        <View style={styles.holding} key={line.lot.id}>
          <Image
            source={{ uri: line.card.imageUrl }}
            style={styles.cardImage}
          />
          <View style={styles.flex}>
            <Text style={styles.cardName}>{line.card.name}</Text>
            <Text style={styles.mutedSmall}>
              {line.card.setName} · Qty {line.lot.quantity}
            </Text>
          </View>
          <Text style={styles.holdingValue}>
            {line.marketValueCents === null
              ? "Unpriced · check freshness"
              : money(line.marketValueCents)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function PortfolioHistory({
  snapshots,
}: {
  snapshots: Portfolio["snapshots"];
}) {
  if (snapshots.length < 2) {
    return (
      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Value history</Text>
        <Text style={styles.mutedSmall}>
          Available after two daily snapshots.
        </Text>
      </View>
    );
  }

  const values = snapshots.map((snapshot) => snapshot.marketValueCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const latest = snapshots.at(-1);

  return (
    <View
      accessible
      accessibilityLabel={`Portfolio value changed from ${money(values[0] ?? 0)} to ${money(values.at(-1) ?? 0)} across ${snapshots.length} daily snapshots`}
      style={styles.historyCard}
    >
      <View style={styles.historyHeading}>
        <View>
          <Text style={styles.valueLabel}>VALUE HISTORY</Text>
          <Text style={styles.historyTitle}>Portfolio movement</Text>
        </View>
        {latest && (
          <View style={styles.historyLatest}>
            <Text style={styles.mutedSmall}>Latest snapshot</Text>
            <Text style={styles.historyLatestValue}>
              {shortDate(latest.date)} · {money(latest.marketValueCents)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.historyPlot} aria-hidden>
        {values.map((value, index) => (
          <View
            key={`${snapshots[index]?.date}-${index}`}
            style={[
              styles.historyBar,
              { height: 18 + ((value - min) / range) * 66 },
            ]}
          />
        ))}
      </View>
      <View style={styles.historyBaseline} />
    </View>
  );
}

function SearchScreen({ session }: { session: MobileSession }) {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState("Search the unified catalog.");

  async function search() {
    setStatus("Searching…");
    try {
      const results = await searchCards(query, session);
      setCards(results);
      setStatus(`${results.length} result${results.length === 1 ? "" : "s"}`);
    } catch {
      setStatus("Could not reach the catalog API.");
    }
  }

  return (
    <View style={[styles.content, styles.flex]}>
      <Text style={styles.eyebrow}>UNIFIED CATALOG</Text>
      <Text style={styles.title}>Find the exact card.</Text>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Card search"
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Charizard, OP05-119…"
          placeholderTextColor="#6f7883"
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <Pressable style={styles.searchButton} onPress={search}>
          <Text style={styles.primaryButtonText}>Search</Text>
        </Pressable>
      </View>
      <Text style={styles.mutedSmall}>{status}</Text>
      <FlatList
        data={cards}
        keyExtractor={(card) => card.id}
        renderItem={({ item }) => (
          <View style={styles.result}>
            <Image source={{ uri: item.imageUrl }} style={styles.resultImage} />
            <View style={styles.flex}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.mutedSmall}>
                {item.setName} · {item.number}
              </Text>
              <Text style={styles.price}>
                {item.variants[0]?.marketCents == null
                  ? "Unpriced"
                  : `From ${money(item.variants[0].marketCents)}`}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.valueLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Message({
  text,
  loading = false,
}: {
  text: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.center}>
      {loading && <ActivityIndicator color="#a7f46b" />}
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function signedMoney(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}${money(Math.abs(cents))}`;
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

const styles = StyleSheet.create({
  app: { backgroundColor: "#0b0d10", flex: 1 },
  center: {
    alignItems: "center",
    backgroundColor: "#0b0d10",
    flex: 1,
    gap: 14,
    justifyContent: "center",
  },
  login: {
    backgroundColor: "#0b0d10",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  logo: {
    alignItems: "center",
    backgroundColor: "#a7f46b",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    marginBottom: 30,
    transform: [{ rotate: "-5deg" }],
    width: 52,
  },
  logoText: { color: "#13210b", fontSize: 21, fontWeight: "900" },
  hero: {
    color: "#f6f7f9",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2.6,
    lineHeight: 49,
    marginBottom: 18,
  },
  muted: { color: "#98a3af", fontSize: 16, lineHeight: 24 },
  mutedSmall: { color: "#98a3af", fontSize: 12, lineHeight: 18 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#a7f46b",
    borderRadius: 13,
    marginTop: 34,
    padding: 16,
  },
  primaryButtonText: { color: "#13210b", fontWeight: "800" },
  securityNote: {
    color: "#6f7883",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
  },
  mobileHeader: {
    alignItems: "center",
    borderBottomColor: "#29313a",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  wordmark: { color: "#f6f7f9", fontSize: 18, fontWeight: "900" },
  signOut: { color: "#98a3af", fontSize: 13 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 24 },
  eyebrow: {
    color: "#a7f46b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 18,
  },
  title: {
    color: "#f6f7f9",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.8,
    marginBottom: 22,
    marginTop: 8,
  },
  valueCard: {
    backgroundColor: "#13171c",
    borderColor: "#29313a",
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
  },
  valueLabel: {
    color: "#98a3af",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  value: {
    color: "#f6f7f9",
    fontSize: 43,
    fontWeight: "800",
    letterSpacing: -2,
    marginVertical: 5,
  },
  gain: { color: "#78e6a2", fontWeight: "700" },
  loss: { color: "#ff8d8d" },
  historyCard: {
    backgroundColor: "#13171c",
    borderColor: "#29313a",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
    padding: 16,
  },
  historyHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyTitle: {
    color: "#f6f7f9",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 5,
  },
  historyLatest: { alignItems: "flex-end" },
  historyLatestValue: {
    color: "#f6f7f9",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  historyPlot: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    height: 92,
    marginTop: 18,
  },
  historyBar: {
    backgroundColor: "#a7f46b",
    borderRadius: 3,
    flex: 1,
    maxWidth: 24,
    minWidth: 4,
    opacity: 0.72,
  },
  historyBaseline: { backgroundColor: "#29313a", height: 1 },
  statRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  stat: {
    backgroundColor: "#13171c",
    borderColor: "#29313a",
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  statValue: {
    color: "#f6f7f9",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  sectionTitle: {
    color: "#f6f7f9",
    fontSize: 21,
    fontWeight: "800",
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    marginTop: 30,
  },
  findCardsButton: {
    alignItems: "center",
    backgroundColor: "#1a2027",
    borderColor: "#29313a",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  findCardsText: { color: "#f6f7f9", fontSize: 15, fontWeight: "800" },
  findCardsArrow: { color: "#a7f46b", fontSize: 20 },
  holding: {
    alignItems: "center",
    borderBottomColor: "#29313a",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 13,
  },
  cardImage: { borderRadius: 5, height: 58, width: 42 },
  resultImage: { borderRadius: 6, height: 90, width: 64 },
  cardName: { color: "#f6f7f9", fontSize: 15, fontWeight: "800" },
  holdingValue: { color: "#f6f7f9", fontSize: 14, fontWeight: "800" },
  flex: { flex: 1 },
  tabs: {
    backgroundColor: "#0f1216",
    borderTopColor: "#29313a",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tab: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  activeTab: { backgroundColor: "#1a2027", borderColor: "#29313a" },
  tabMark: {
    backgroundColor: "#13171c",
    borderRadius: 6,
    color: "#98a3af",
    fontSize: 10,
    fontWeight: "900",
    height: 19,
    lineHeight: 19,
    textAlign: "center",
    width: 19,
  },
  activeTabMark: { color: "#a7f46b" },
  tabText: { color: "#98a3af", fontWeight: "700" },
  activeTabText: { color: "#a7f46b" },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: "#13171c",
    borderColor: "#29313a",
    borderRadius: 12,
    borderWidth: 1,
    color: "#f6f7f9",
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: "#a7f46b",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  result: {
    alignItems: "center",
    borderBottomColor: "#29313a",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingVertical: 15,
  },
  price: { color: "#a7f46b", fontSize: 13, fontWeight: "700", marginTop: 8 },
});
