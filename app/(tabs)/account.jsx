import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import UserDashboard from '../../src/components/Userdashboard'; // adjust path if needed
import { useAuth } from '../../src/context/AuthContext';

export default function AccountScreen() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  // If logged in, render the full dashboard in place of this screen
  if (isLoggedIn) {
    return <UserDashboard />;
  }

  // Not logged in — show the welcome/login prompt
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>👤</Text>
      <Text style={styles.title}>Welcome to Gramin Kart</Text>
      <Text style={styles.sub}>Login to access your account</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/login')}>
        <Text style={styles.btnText}>Login / Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f8f8',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  sub:   { fontSize: 13, color: '#888', marginBottom: 24 },
  btn:   { backgroundColor: '#2d9e2d', paddingHorizontal: 40, paddingVertical: 13, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});