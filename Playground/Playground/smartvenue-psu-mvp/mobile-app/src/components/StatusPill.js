import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";

const tones = {
  active: { bg: "#0f2c5e", text: colors.ice },
  verified: { bg: "rgba(47, 209, 139, 0.18)", text: colors.success },
  invalid: { bg: "rgba(255, 107, 107, 0.16)", text: colors.danger },
  retry: { bg: "rgba(255, 200, 87, 0.16)", text: colors.warning },
  used: { bg: "rgba(255, 107, 107, 0.16)", text: colors.danger },
  expired: { bg: "rgba(255, 200, 87, 0.16)", text: colors.warning },
};

export function StatusPill({ label, tone = "active" }) {
  const current = tones[tone] || tones.active;
  return (
    <View style={[styles.pill, { backgroundColor: current.bg }]}>
      <Text style={[styles.label, { color: current.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
