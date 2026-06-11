import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useCart } from '../../src/context/CartContext';

export default function TabLayout() {
  const { cartCount, wishlistCount } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2d9e2d',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          backgroundColor: '#fff',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Product"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
              {cartCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: '#2d9e2d', borderRadius: 8,
                  minWidth: 16, height: 16,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                    {cartCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
              {wishlistCount > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -8,
                  backgroundColor: '#e74c3c', borderRadius: 8,
                  minWidth: 16, height: 16,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                    {wishlistCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}