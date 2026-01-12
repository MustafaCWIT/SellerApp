import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
    PRODUCTS: 'offline_products',
    STORES: 'offline_stores',
    ORDERS: 'offline_orders',
    PENDING_ORDERS: 'pending_offline_orders',
    DISTRIBUTIONS: 'offline_distributions',
    LAST_SYNC: 'last_sync_timestamp',
    USER_SESSION: 'user_session',
};

export const saveToStorage = async (key: string, data: any) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      
    }
};

export const getFromStorage = async (key: string) => {
    try {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
      
        return null;
    }
};

export const removeFromStorage = async (key: string) => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
      
    }
};

export const clearAllStorage = async () => {
    try {
        await AsyncStorage.clear();
    } catch (error) {
      
    }
};
