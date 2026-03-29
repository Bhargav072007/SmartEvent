import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";
import { StatusPill } from "./StatusPill";

export function WalletPass({ ticket, game, liveStatus }) {
  return (
    <View style={styles.pass}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kicker}>SmartVenue PSU</Text>
          <Text style={styles.title}>{game?.title || "Penn State Football"}</Text>
        </View>
        <StatusPill label={liveStatus} tone={liveStatus.toLowerCase()} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.venue}>Beaver Stadium</Text>
        <Text style={styles.ready}>Ready to Tap</Text>
      </View>

      <View style={styles.grid}>
        <Field label="Seat" value={ticket?.seat} />
        <Field label="Gate" value={ticket?.gate} />
        <Field label="Kickoff" value={formatKickoff(game?.kickoff)} />
        <Field label="Ticket ID" value={ticket?.ticket_id} />
      </View>

      <View style={styles.tokenRow}>
        <Text style={styles.tokenLabel}>NFC token</Text>
        <Text style={styles.tokenValue}>{ticket?.token}</Text>
      </View>
    </View>
  );
}

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function formatKickoff(value) {
  if (!value) {
    return "TBD";
  }
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

const styles = StyleSheet.create({
  pass: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  kicker: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    maxWidth: 210,
  },
  hero: {
    marginTop: 20,
    marginBottom: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.panelSoft,
  },
  venue: {
    color: colors.ice,
    fontSize: 16,
    fontWeight: "700",
  },
  ready: {
    marginTop: 10,
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  field: {
    width: "47%",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  fieldValue: {
    color: colors.white,
    fontWeight: "700",
  },
  tokenRow: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  tokenLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  tokenValue: {
    color: colors.ice,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
