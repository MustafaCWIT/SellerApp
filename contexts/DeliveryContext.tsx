import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, DeliveryOrder, DeliveryOrderItem, DeliveryStatus, PaymentMethod } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNetwork } from './NetworkContext';
import { getFromStorage, saveToStorage, KEYS } from '../services/OfflineStorage';

export interface DeliveryStats {
    totalOrders: number;
    pendingCount: number;
    outForDeliveryCount: number;
    deliveredCount: number;
    failedCount: number;
    totalAmountToCollect: number;
    totalCollected: number;
}

interface DeliveryContextType {
    orders: DeliveryOrder[];
    loading: boolean;
    refreshing: boolean;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    activeFilter: DeliveryStatus | 'all';
    setActiveFilter: (filter: DeliveryStatus | 'all') => void;
    refreshOrders: () => Promise<void>;
    getOrdersByFilter: (filter: DeliveryStatus | 'all') => DeliveryOrder[];
    getDeliveryStats: () => DeliveryStats;
    startDelivery: (orderId: string) => Promise<void>;
    completeDelivery: (
        orderId: string,
        items: DeliveryOrderItem[],
        collectedAmount: number,
        paymentMethod: PaymentMethod,
        deliveryNotes?: string
    ) => Promise<void>;
    markDeliveryFailed: (orderId: string, reason: string) => Promise<void>;
    getOrderById: (orderId: string) => DeliveryOrder | undefined;
    assignedDistributionIds: string[];
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

const DELIVERY_ORDERS_CACHE_KEY = 'delivery_orders_cache';

export const DeliveryProvider = ({ children }: { children: ReactNode }) => {
    const { userId, salesmanId } = useAuth();
    const { isConnected } = useNetwork();
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [activeFilter, setActiveFilter] = useState<DeliveryStatus | 'all'>('all');
    const [assignedBookerIds, setAssignedBookerIds] = useState<string[]>([]);
    const [assignedDistributionIds, setAssignedDistributionIds] = useState<string[]>([]);

    // Fetch user's assigned booker IDs and distribution IDs
    const fetchUserAssignments = useCallback(async () => {
        if (!userId) return;

        try {
            // Get user's assigned booker IDs
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('assigned_booker_ids')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error('Error fetching user assignments:', userError);
                return;
            }

            const bookerIds = userData?.assigned_booker_ids || [];
            setAssignedBookerIds(bookerIds);

            // Get user's assigned distributions
            const { data: distData, error: distError } = await supabase
                .from('user_distributions')
                .select('distribution_id')
                .eq('user_id', userId);

            if (distError) {
                console.error('Error fetching user distributions:', distError);
                return;
            }

            const distIds = distData?.map(d => d.distribution_id) || [];
            setAssignedDistributionIds(distIds);
        } catch (error) {
            console.error('Error in fetchUserAssignments:', error);
        }
    }, [userId]);

    // Fetch orders for delivery
    const fetchOrders = useCallback(async (isRefresh = false) => {
        if (!userId || !salesmanId) return;

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            // Load cached orders first
            const cachedOrders = await getFromStorage(DELIVERY_ORDERS_CACHE_KEY);
            if (cachedOrders && !isRefresh) {
                setOrders(cachedOrders);
            }

            if (!isConnected) {
                return;
            }

            // Get the date string for filtering
            const dateStr = selectedDate.toISOString().split('T')[0];

            // First, get booker user IDs that match our assigned salesman_ids
            const { data: bookerUsers, error: bookerError } = await supabase
                .from('users')
                .select('id, salesman_id, salesman_name')
                .in('salesman_id', assignedBookerIds.length > 0 ? assignedBookerIds : ['NONE']);

            if (bookerError) {
                console.error('Error fetching booker users:', bookerError);
                return;
            }

            const bookerUserIds = bookerUsers?.map(u => u.id) || [];
            const bookerMap = new Map(bookerUsers?.map(u => [u.id, { name: u.salesman_name, salesmanId: u.salesman_id }]) || []);

            if (bookerUserIds.length === 0) {
                setOrders([]);
                await saveToStorage(DELIVERY_ORDERS_CACHE_KEY, []);
                return;
            }

            // Fetch exported orders for assigned bookers and distributions
            let query = supabase
                .from('orders')
                .select(`
                    *,
                    stores (
                        id,
                        name,
                        address,
                        phone,
                        latitude,
                        longitude
                    ),
                    order_items (
                        id,
                        product_id,
                        product_code,
                        product_name,
                        price,
                        quantity,
                        line_total,
                        delivered_quantity,
                        returned_quantity,
                        return_reason
                    )
                `)
                .eq('status', 'exported')
                .in('user_id', bookerUserIds)
                .eq('order_date', dateStr)
                .order('created_at', { ascending: false });

            // Filter by distribution if user has assigned distributions
            if (assignedDistributionIds.length > 0) {
                query = query.in('distribution_id', assignedDistributionIds);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching delivery orders:', error);
                return;
            }

            if (data) {
                const mappedOrders: DeliveryOrder[] = data.map((order: any) => {
                    const bookerInfo = bookerMap.get(order.user_id);
                    const items: DeliveryOrderItem[] = (order.order_items || []).map((item: any) => ({
                        id: item.id,
                        productId: item.product_id,
                        productCode: item.product_code,
                        productName: item.product_name,
                        price: item.price,
                        quantity: item.quantity,
                        lineTotal: item.line_total,
                        deliveredQuantity: item.delivered_quantity ?? item.quantity,
                        returnedQuantity: item.returned_quantity ?? 0,
                        returnReason: item.return_reason,
                    }));

                    return {
                        id: order.id,
                        orderNumber: order.order_number,
                        storeId: order.store_id,
                        storeName: order.store_name || order.stores?.name || 'Unknown Store',
                        storeAddress: order.store_address || order.stores?.address || '',
                        storePhone: order.stores?.phone || null,
                        storeLatitude: order.stores?.latitude || null,
                        storeLongitude: order.stores?.longitude || null,
                        totalAmount: order.total_amount,
                        status: order.status,
                        distributionId: order.distribution_id,
                        distributionName: order.distributions?.name || null,
                        orderDate: order.order_date || order.created_at?.split('T')[0],
                        createdAt: order.created_at,
                        bookerName: bookerInfo?.name || null,
                        bookerId: order.user_id,
                        bookerSalesmanId: bookerInfo?.salesmanId || null,
                        deliveryStatus: order.delivery_status || 'pending',
                        deliverySmId: order.delivery_sm_id,
                        deliveredAt: order.delivered_at,
                        collectedAmount: order.collected_amount,
                        paymentMethod: order.payment_method,
                        deliveryNotes: order.delivery_notes,
                        items,
                        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
                    };
                });

                setOrders(mappedOrders);
                await saveToStorage(DELIVERY_ORDERS_CACHE_KEY, mappedOrders);
            }
        } catch (error) {
            console.error('Error in fetchOrders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId, salesmanId, isConnected, selectedDate, assignedBookerIds, assignedDistributionIds]);

    // Initialize on mount
    useEffect(() => {
        if (userId) {
            fetchUserAssignments();
        }
    }, [userId, fetchUserAssignments]);

    // Fetch orders when assignments or date changes
    useEffect(() => {
        if (userId && assignedBookerIds.length >= 0) {
            fetchOrders();
        }
    }, [userId, assignedBookerIds, selectedDate, fetchOrders]);

    const refreshOrders = async () => {
        await fetchOrders(true);
    };

    const getOrdersByFilter = (filter: DeliveryStatus | 'all'): DeliveryOrder[] => {
        if (filter === 'all') return orders;
        return orders.filter(order => order.deliveryStatus === filter);
    };

    const getDeliveryStats = (): DeliveryStats => {
        const pending = orders.filter(o => o.deliveryStatus === 'pending');
        const outForDelivery = orders.filter(o => o.deliveryStatus === 'out_for_delivery');
        const delivered = orders.filter(o => o.deliveryStatus === 'delivered' || o.deliveryStatus === 'partial');
        const failed = orders.filter(o => o.deliveryStatus === 'failed' || o.deliveryStatus === 'returned');

        const totalToCollect = orders
            .filter(o => o.deliveryStatus === 'pending' || o.deliveryStatus === 'out_for_delivery')
            .reduce((sum, o) => sum + o.totalAmount, 0);

        const totalCollected = orders
            .filter(o => o.deliveryStatus === 'delivered' || o.deliveryStatus === 'partial')
            .reduce((sum, o) => sum + (o.collectedAmount || 0), 0);

        return {
            totalOrders: orders.length,
            pendingCount: pending.length,
            outForDeliveryCount: outForDelivery.length,
            deliveredCount: delivered.length,
            failedCount: failed.length,
            totalAmountToCollect: totalToCollect,
            totalCollected,
        };
    };

    const startDelivery = async (orderId: string) => {
        if (!salesmanId) return;

        try {
            setLoading(true);

            const { error } = await supabase
                .from('orders')
                .update({
                    delivery_status: 'out_for_delivery',
                    delivery_sm_id: salesmanId,
                })
                .eq('id', orderId);

            if (error) throw error;

            // Optimistic update
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId
                        ? { ...order, deliveryStatus: 'out_for_delivery' as DeliveryStatus, deliverySmId: salesmanId }
                        : order
                )
            );
        } catch (error) {
            console.error('Error starting delivery:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const completeDelivery = async (
        orderId: string,
        items: DeliveryOrderItem[],
        collectedAmount: number,
        paymentMethod: PaymentMethod,
        deliveryNotes?: string
    ) => {
        if (!salesmanId) return;

        try {
            setLoading(true);

            // Calculate final delivery status
            const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalDelivered = items.reduce((sum, item) => sum + item.deliveredQuantity, 0);
            const totalReturned = items.reduce((sum, item) => sum + item.returnedQuantity, 0);

            let finalStatus: DeliveryStatus;
            if (totalReturned === totalOrdered) {
                finalStatus = 'returned';
            } else if (totalDelivered === totalOrdered && totalReturned === 0) {
                finalStatus = 'delivered';
            } else {
                finalStatus = 'partial';
            }

            // Update order
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    delivery_status: finalStatus,
                    delivery_sm_id: salesmanId,
                    delivered_at: new Date().toISOString(),
                    collected_amount: collectedAmount,
                    payment_method: paymentMethod,
                    delivery_notes: deliveryNotes || null,
                })
                .eq('id', orderId);

            if (orderError) throw orderError;

            // Update order items
            for (const item of items) {
                const { error: itemError } = await supabase
                    .from('order_items')
                    .update({
                        delivered_quantity: item.deliveredQuantity,
                        returned_quantity: item.returnedQuantity,
                        return_reason: item.returnReason,
                    })
                    .eq('id', item.id);

                if (itemError) {
                    console.error('Error updating order item:', itemError);
                }
            }

            // Optimistic update
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId
                        ? {
                            ...order,
                            deliveryStatus: finalStatus,
                            deliverySmId: salesmanId,
                            deliveredAt: new Date().toISOString(),
                            collectedAmount,
                            paymentMethod,
                            deliveryNotes: deliveryNotes || null,
                            items,
                        }
                        : order
                )
            );
        } catch (error) {
            console.error('Error completing delivery:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const markDeliveryFailed = async (orderId: string, reason: string) => {
        if (!salesmanId) return;

        try {
            setLoading(true);

            const { error } = await supabase
                .from('orders')
                .update({
                    delivery_status: 'failed',
                    delivery_sm_id: salesmanId,
                    delivery_notes: reason,
                })
                .eq('id', orderId);

            if (error) throw error;

            // Optimistic update
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId
                        ? { ...order, deliveryStatus: 'failed' as DeliveryStatus, deliverySmId: salesmanId, deliveryNotes: reason }
                        : order
                )
            );
        } catch (error) {
            console.error('Error marking delivery as failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const getOrderById = (orderId: string): DeliveryOrder | undefined => {
        return orders.find(order => order.id === orderId);
    };

    return (
        <DeliveryContext.Provider
            value={{
                orders,
                loading,
                refreshing,
                selectedDate,
                setSelectedDate,
                activeFilter,
                setActiveFilter,
                refreshOrders,
                getOrdersByFilter,
                getDeliveryStats,
                startDelivery,
                completeDelivery,
                markDeliveryFailed,
                getOrderById,
                assignedDistributionIds,
            }}
        >
            {children}
        </DeliveryContext.Provider>
    );
};

export const useDelivery = () => {
    const context = useContext(DeliveryContext);
    if (context === undefined) {
        throw new Error('useDelivery must be used within a DeliveryProvider');
    }
    return context;
};
