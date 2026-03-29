import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { api } from "./src/api/client";
import { WalletPass } from "./src/components/WalletPass";
import { StatusPill } from "./src/components/StatusPill";
import { colors } from "./src/theme/tokens";


const scenarios = [
  { key: "valid", label: "Valid pass", token: "PSU-VALID-001" },
  { key: "used", label: "Already used", token: "PSU-USED-001" },
  { key: "expired", label: "Expired", token: "PSU-EXPIRED-001" },
  { key: "retry", label: "Retry", token: "PSU-RETRY-001" },
];


export default function App() {
  const [screen, setScreen] = useState("splash");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: "Alex Student", email: "fan@psu.edu" });
  const [user, setUser] = useState(null);
  const [game, setGame] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [tapStarted, setTapStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setScreen("login"), 1400);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!tapStarted || !activeTicket) {
      return undefined;
    }
    const interval = setInterval(async () => {
      try {
        const status = await api.ticketStatus(activeTicket.ticket_id);
        if (status.last_result) {
          setLiveResult(status);
          if (["VERIFIED", "INVALID", "ALREADY_USED", "EXPIRED", "RETRY"].includes(status.last_result)) {
            setScreen(status.last_result === "VERIFIED" ? "success" : "failure");
          }
        }
      } catch (error) {
        // Keep polling in MVP mode.
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [tapStarted, activeTicket]);

  async function handleLogin() {
    setLoading(true);
    try {
      const loggedInUser = await api.mockLogin(profile);
      const nextGame = await api.upcomingGame();
      const ticketResponse = await api.myTickets(loggedInUser.user_id);
      setUser(loggedInUser);
      setGame(nextGame);
      setTickets(ticketResponse.tickets);
      setActiveTicket(ticketResponse.tickets[0]);
      setScreen("home");
    } finally {
      setLoading(false);
    }
  }

  async function swapScenario(scenarioKey) {
    setLoading(true);
    try {
      const ticket = await api.issueDemo({ user_id: user.user_id, scenario: scenarioKey });
      setActiveTicket(ticket);
      setLiveResult(null);
      setTapStarted(false);
      setScreen("ticket");
    } finally {
      setLoading(false);
    }
  }

  const liveTone = useMemo(() => {
    const result = liveResult?.last_result;
    if (result === "VERIFIED") return "verified";
    if (result === "ALREADY_USED") return "used";
    if (result === "EXPIRED") return "expired";
    if (result === "INVALID") return "invalid";
    if (result === "RETRY") return "retry";
    return "active";
  }, [liveResult]);

  const liveLabel = useMemo(() => {
    const result = liveResult?.last_result;
    if (result === "VERIFIED") return "Verified";
    if (result === "ALREADY_USED") return "Already Used";
    if (result === "EXPIRED") return "Expired";
    if (result === "INVALID") return "Invalid";
    if (result === "RETRY") return "Retry";
    return "Active";
  }, [liveResult]);

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {screen === "splash" && (
          <View style={styles.splash}>
            <Text style={styles.splashKicker}>Penn State Game Day</Text>
            <Text style={styles.splashTitle}>SmartVenue PSU</Text>
            <Text style={styles.splashSubtitle}>Tap-ready stadium entry for Beaver Stadium.</Text>
          </View>
        )}

        {screen === "login" && (
          <View style={styles.card}>
            <Text style={styles.kicker}>Welcome back</Text>
            <Text style={styles.title}>Sign in for your Beaver Stadium pass.</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(name) => setProfile((current) => ({ ...current, name }))}
              placeholder="Name"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={profile.email}
              onChangeText={(email) => setProfile((current) => ({ ...current, email }))}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
            />
            <PrimaryButton label={loading ? "Signing in..." : "Enter SmartVenue PSU"} onPress={handleLogin} />
          </View>
        )}

        {screen === "home" && (
          <View style={styles.stack}>
            <Header title="Home" subtitle={`Welcome, ${user?.name || "fan"}`} />
            <View style={styles.heroCard}>
              <Text style={styles.heroKicker}>Upcoming game</Text>
              <Text style={styles.heroTitle}>{game?.title}</Text>
              <Text style={styles.heroMeta}>Beaver Stadium • {formatKickoff(game?.kickoff)}</Text>
              <Text style={styles.heroHint}>Gate hint: {activeTicket?.gate} is currently your assigned entry point.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>My wallet pass</Text>
              <Text style={styles.bodyCopy}>Your pass is stored in-app and ready for tap-and-go entry at the Raspberry Pi gate.</Text>
              <PrimaryButton label="Open My Ticket" onPress={() => setScreen("ticket")} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Demo scenarios</Text>
              <View style={styles.chipWrap}>
                {scenarios.map((scenario) => (
                  <Pressable key={scenario.key} onPress={() => swapScenario(scenario.key)} style={styles.chip}>
                    <Text style={styles.chipLabel}>{scenario.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setScreen("history")}>
                <Text style={styles.secondaryLink}>Open ticket history</Text>
              </Pressable>
            </View>
          </View>
        )}

        {screen === "ticket" && activeTicket && (
          <View style={styles.stack}>
            <Header title="My Ticket" subtitle="Wallet-style game pass" />
            <WalletPass ticket={activeTicket} game={game} liveStatus={liveLabel} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Tap flow</Text>
              <Text style={styles.bodyCopy}>Walk to {activeTicket.gate}, hold your phone near the NFC reader, and let the Raspberry Pi gate validate the ticket.</Text>
              <View style={styles.tapReady}>
                <View style={styles.tapPulse} />
                <Text style={styles.tapReadyLabel}>Ready to Tap</Text>
              </View>
              <PrimaryButton
                label="I'm at the gate"
                onPress={() => {
                  setTapStarted(true);
                  setLiveResult(null);
                  setScreen("tap");
                }}
              />
            </View>
          </View>
        )}

        {screen === "tap" && activeTicket && (
          <View style={styles.stack}>
            <Header title="Tap Status" subtitle="Listening for gate verification" />
            <WalletPass ticket={activeTicket} game={game} liveStatus={liveLabel} />
            <View style={styles.card}>
              <ActivityIndicator color={colors.royal} size="large" />
              <Text style={styles.sectionTitle}>Hold near the gate reader</Text>
              <Text style={styles.bodyCopy}>The Raspberry Pi gate service validates the NFC token and this screen polls for the result.</Text>
              <StatusPill label={liveLabel} tone={liveTone} />
              <Pressable onPress={() => setScreen("home")}>
                <Text style={styles.secondaryLink}>Back to home</Text>
              </Pressable>
            </View>
          </View>
        )}

        {screen === "success" && activeTicket && (
          <ResultScreen
            tone="success"
            title="Entry Verified"
            subtitle={`${liveResult?.last_gate || activeTicket.gate} confirmed. Proceed to entry.`}
            details={activeTicket.seat}
            actionLabel="Back to home"
            onPress={() => setScreen("home")}
          />
        )}

        {screen === "failure" && activeTicket && (
          <ResultScreen
            tone="danger"
            title={failureTitle(liveResult?.last_result)}
            subtitle={failureSubtitle(liveResult?.last_result)}
            details={`${liveResult?.last_gate || activeTicket.gate} • ${activeTicket.seat}`}
            actionLabel="Try another demo state"
            onPress={() => setScreen("home")}
          />
        )}

        {screen === "history" && (
          <View style={styles.stack}>
            <Header title="Ticket History" subtitle="Demo pass states for judges" />
            {tickets.map((ticket) => (
              <View key={ticket.ticket_id} style={styles.card}>
                <Text style={styles.sectionTitle}>{ticket.seat}</Text>
                <Text style={styles.bodyCopy}>{ticket.gate} • {ticket.token}</Text>
                <StatusPill label={ticket.status} tone={ticket.status === "active" ? "active" : ticket.status} />
              </View>
            ))}
            <PrimaryButton label="Back to home" onPress={() => setScreen("home")} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>SmartVenue PSU</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.bodyCopy}>{subtitle}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

function ResultScreen({ tone, title, subtitle, details, actionLabel, onPress }) {
  const accent = tone === "success" ? colors.success : colors.danger;
  return (
    <View style={styles.stack}>
      <View style={[styles.resultCard, { borderColor: accent }]}>
        <Text style={[styles.kicker, { color: accent }]}>{tone === "success" ? "Gate cleared" : "Gate attention"}</Text>
        <Text style={styles.resultTitle}>{title}</Text>
        <Text style={styles.bodyCopy}>{subtitle}</Text>
        <Text style={styles.resultDetails}>{details}</Text>
      </View>
      <PrimaryButton label={actionLabel} onPress={onPress} />
    </View>
  );
}

function formatKickoff(value) {
  if (!value) {
    return "Kickoff TBD";
  }
  const date = new Date(value);
  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function failureTitle(result) {
  if (result === "ALREADY_USED") return "Ticket Already Used";
  if (result === "EXPIRED") return "Expired Ticket";
  if (result === "RETRY") return "Please Retry";
  return "Invalid Ticket";
}

function failureSubtitle(result) {
  if (result === "ALREADY_USED") return "This pass was already used at the gate.";
  if (result === "EXPIRED") return "The pass is outside the valid entry window.";
  if (result === "RETRY") return "The reader could not decode the tap cleanly.";
  return "The token was not recognized by the gate device.";
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.midnight,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  splash: {
    minHeight: "100%",
    justifyContent: "center",
    paddingVertical: 120,
  },
  splashKicker: {
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  splashTitle: {
    color: colors.white,
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 10,
  },
  splashSubtitle: {
    color: colors.ice,
    fontSize: 16,
    lineHeight: 24,
  },
  stack: {
    gap: 16,
  },
  header: {
    gap: 4,
  },
  kicker: {
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "800",
  },
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.panel,
    gap: 14,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: colors.navy,
    gap: 10,
  },
  heroKicker: {
    color: colors.muted,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
  },
  heroMeta: {
    color: colors.ice,
    fontSize: 15,
  },
  heroHint: {
    color: colors.muted,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
  },
  bodyCopy: {
    color: colors.muted,
    lineHeight: 22,
  },
  input: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.white,
    backgroundColor: colors.panelSoft,
  },
  button: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: colors.royal,
    alignItems: "center",
  },
  buttonLabel: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.panelSoft,
  },
  chipLabel: {
    color: colors.white,
    fontWeight: "700",
  },
  secondaryLink: {
    color: "#8fc0ff",
    fontWeight: "700",
  },
  tapReady: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  tapPulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(21,87,255,0.18)",
    borderWidth: 2,
    borderColor: colors.royal,
  },
  tapReadyLabel: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
  },
  resultCard: {
    borderRadius: 28,
    borderWidth: 2,
    padding: 24,
    backgroundColor: colors.panel,
    gap: 10,
  },
  resultTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
  },
  resultDetails: {
    color: colors.ice,
    fontSize: 15,
    fontWeight: "700",
  },
});
