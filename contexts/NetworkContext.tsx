import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
    const [networkState, setNetworkState] = useState<NetInfoState | null>(null);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setNetworkState(state);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const value = {
        isConnected: networkState?.isConnected ?? true, // Default to true to assume online initially
        isInternetReachable: networkState?.isInternetReachable ?? true,
        type: networkState?.type ?? null,
    };

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};
