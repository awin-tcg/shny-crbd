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
        <View style={styles.logo}>
          <Text style={styles.logoText}>C</Text>
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
        <Text style={styles.wordmark}>Cardboard</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => identity.signOut().then(() => setSession(null))}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      {tab === "portfolio" ? (
        <PortfolioScreen session={session} />
      ) : (
        <SearchScreen session={session} />
      )}
      <View style={styles.tabs}>
        {(["portfolio", "search"] as const).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.activeTab]}
          >
            <Text
              style={[styles.tabText, tab === item && styles.activeTabText]}
            >
              {item === "portfolio" ? "Portfolio" : "Search"}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function PortfolioScreen({ session }: { session: MobileSession }) {
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
      <View style={styles.statRow}>
        <Stat label="Cost basis" value={money(portfolio.costBasisCents)} />
        <Stat label="Priced" value={`${portfolio.valuedItems}`} />
        <Stat label="Unpriced" value={`${portfolio.unpricedItems}`} />
      </View>
      <Text style={styles.sectionTitle}>Holdings</Text>
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
              ? "Unpriced"
              : money(line.marketValueCents)}
          </Text>
        </View>
      ))}
    </ScrollView>
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
    <View style={styles.content}>
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
    width: 44,
  },
  logoText: { color: "#13210b", fontSize: 25, fontWeight: "900" },
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
  content: { flex: 1, padding: 20, paddingBottom: 100 },
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
    marginBottom: 6,
    marginTop: 30,
  },
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
    bottom: 0,
    flexDirection: "row",
    left: 0,
    padding: 10,
    position: "absolute",
    right: 0,
  },
  tab: { alignItems: "center", borderRadius: 10, flex: 1, padding: 12 },
  activeTab: { backgroundColor: "#1a2027" },
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
