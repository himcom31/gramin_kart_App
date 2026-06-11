import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import AppLoader from '../src/components/Apploader';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';

const PROTECTED_ROUTES = ['dashboard', 'checkout', 'orders'];

function RouteGuard({ children }) {
  const { userToken } = useAuth();
  const router        = useRouter();
  const segments      = useSegments();

  useEffect(() => {
    if (segments[0] === undefined) return;
    const inLoginScreen = segments[0] === 'login';
    const isProtected   = PROTECTED_ROUTES.includes(segments[0]);
    if (!userToken && isProtected) {
      router.replace('/login');
    } else if (userToken && inLoginScreen) {
      router.replace('/');
    }
  }, [userToken, segments]);

  return children;
}

// ── Loader wrapper — reads auth loading state from inside AuthProvider ────────
function AppWithLoader() {
  const { isLoading } = useAuth();

  const [fadeOut,   setFadeOut]   = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  // Dono conditions poori honi chahiye:
  // 1. Auth load ho gayi (isLoading = false)
  // 2. Minimum 3 seconds ho gaaye
  useEffect(() => {
    let authDone    = false;
    let timerDone   = false;
    let fadeStarted = false;

    const tryFade = () => {
      if (authDone && timerDone && !fadeStarted) {
        fadeStarted = true;
        setFadeOut(true);                                    // fade animation shuru
        setTimeout(() => setUnmounted(true), 1000);         // 1 sec baad Modal band
      }
    };

    // 3 second minimum timer
    const timer = setTimeout(() => {
      timerDone = true;
      tryFade();
    }, 4000);

    // Auth complete check
    if (!isLoading) {
      authDone = true;
      tryFade();
    }

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <>
      <StatusBar style="dark" />
      <RouteGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="product/[slug]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerShown: true,
              title: 'Login / Register',
              headerTintColor: '#2d9e2d',
              presentation: 'modal',
            }}
          />
          <Stack.Screen name="products"  options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="checkout"  options={{ headerShown: false }} />
        </Stack>
      </RouteGuard>

      {/* visible=false hone par Modal band ho jaata hai — main screen dikhti hai */}
      <AppLoader fading={fadeOut} visible={!unmounted} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppWithLoader />
      </CartProvider>
    </AuthProvider>
  );
}