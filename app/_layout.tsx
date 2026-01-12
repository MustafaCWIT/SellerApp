import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { DistributionsProvider } from "../contexts/DistributionsContext";
import { DeliveryProvider } from "../contexts/DeliveryContext";
import { NetworkProvider } from "../contexts/NetworkContext";

export default function RootLayout() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <DeliveryProvider>
          <DistributionsProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </DistributionsProvider>
        </DeliveryProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}
