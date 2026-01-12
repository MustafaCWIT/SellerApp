import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function DeliveryLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4caf50",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e8ecf4",
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Deliveries",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Hide complete-delivery from tabs - it's a modal screen */}
      <Tabs.Screen
        name="complete-delivery"
        options={{
          href: null, // This hides it from the tab bar
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
