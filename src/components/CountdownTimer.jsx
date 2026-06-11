import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

function calcTimeLeft(endDate, endTime) {
  if (!endDate) return { d: 0, h: 0, m: 0, s: 0 };
  const datePart = endDate.split('T')[0];
  const end = endTime ? new Date(`${datePart}T${endTime}:00`) : new Date(endDate);
  const diff = end - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export default function CountdownTimer({ endDate, endTime }) {
  const [time, setTime] = useState(() => calcTimeLeft(endDate, endTime));

  useEffect(() => {
    setTime(calcTimeLeft(endDate, endTime));
    const t = setInterval(() => setTime(calcTimeLeft(endDate, endTime)), 1000);
    return () => clearInterval(t);
  }, [endDate, endTime]);

  const pad = n => String(n).padStart(2, '0');

  return (
    <View style={styles.row}>
      {[
        [time.d, 'DAYS'],
        [time.h, 'HRS'],
        [time.m, 'MIN'],
        [time.s, 'SEC'],
      ].map(([val, label], i) => (
        <View key={label} style={styles.group}>
          <View style={styles.box}>
            <Text style={styles.val}>{pad(val)}</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
          {i < 3 && <Text style={styles.colon}>:</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  group: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  box: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 44, alignItems: 'center' },
  val: { fontSize: 20, fontWeight: '900', color: '#fff' },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  colon: { fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});