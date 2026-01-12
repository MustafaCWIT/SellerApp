import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, DeliveryOrder, DeliveryOrderItem, DeliveryStatus } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const deliveryStatusConfig: Record<DeliveryStatus, { color: string; bg: string; icon: string; label: string }> = {
  pending: { color: '#ff9800', bg: '#fff3e0', icon: 'time', label: 'Pending' },
  out_for_delivery: { color: '#2196f3', bg: '#e3f2fd', icon: 'bicycle', label: 'Out for Delivery' },
  delivered: { color: '#4caf50', bg: '#e8f5e9', icon: 'checkmark-circle', label: 'Delivered' },
  partial: { color: '#9c27b0', bg: '#f3e5f5', icon: 'alert-circle', label: 'Partial' },
  failed: { color: '#f44336', bg: '#ffebee', icon: 'close-circle', label: 'Failed' },
  returned: { color: '#795548', bg: '#efebe9', icon: 'return-down-back', label: 'Returned' },
};

export default function DeliveryHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { salesmanId, userId } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Last 7 days
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (!salesmanId || !userId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch completed deliveries by this delivery person
      const { data, error } = await supabase
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
          ),
          users!orders_user_id_fkey (
            salesman_id,
            salesman_name
          )
        `)
        .eq('delivery_sm_id', salesmanId)
        .in('delivery_status', ['delivered', 'partial', 'failed', 'returned'])
        .gte('order_date', startStr)
        .lte('order_date', endStr)
        .order('delivered_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      if (data) {
        const mappedOrders: DeliveryOrder[] = data.map((order: any) => {
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
            bookerName: order.users?.salesman_name || null,
            bookerId: order.user_id,
            bookerSalesmanId: order.users?.salesman_id || null,
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
      }
    } catch (error) {
      console.error('Error in fetchHistory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [salesmanId, userId, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (date) {
      setStartDate(date);
    }
  };

  const handleEndDateChange = (event: any, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (date) {
      setEndDate(date);
    }
  };

  const handleViewOrder = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.deliveryStatus === 'delivered').length,
    partial: orders.filter(o => o.deliveryStatus === 'partial').length,
    failed: orders.filter(o => o.deliveryStatus === 'failed' || o.deliveryStatus === 'returned').length,
    totalCollected: orders.reduce((sum, o) => sum + (o.collectedAmount || 0), 0),
  };

  const renderOrderCard = ({ item }: { item: DeliveryOrder }) => {
    const config = deliveryStatusConfig[item.deliveryStatus];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() => handleViewOrder(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.storeInfo}>
            <View style={[styles.storeIconContainer, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon as any} size={18} color={config.color} />
            </View>
            <View style={styles.storeDetails}>
              <View style={styles.storeHeaderRow}>
                <Text style={styles.storeName} numberOfLines={1}>{item.storeName}</Text>
                <View style={[styles.statusBadgeSmall, { backgroundColor: config.bg }]}>
                  <Text style={[styles.statusTextSmall, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={10} color="#888" />
                <Text style={styles.storeAddress} numberOfLines={1}>{item.storeAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.orderDetailsSmall}>
          <View style={styles.detailItemSmall}>
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text style={styles.detailTextSmallContent}>
              {item.deliveredAt ? formatDateTime(item.deliveredAt) : item.orderDate}
            </Text>
          </View>
          <View style={styles.detailItemSmall}>
            <Ionicons name="cube-outline" size={12} color="#666" />
            <Text style={styles.detailTextSmallContent}>{item.itemsCount} items</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.collectedAmount}>
              {item.collectedAmount ? formatCurrency(item.collectedAmount) : '-'}
            </Text>
          </View>
        </View>

        {item.paymentMethod && (
          <View style={styles.paymentBadge}>
            <Ionicons
              name={item.paymentMethod === 'cash' ? 'cash' : item.paymentMethod === 'credit' ? 'card' : 'phone-portrait'}
              size={12}
              color="#666"
            />
            <Text style={styles.paymentText}>
              {item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4caf50" translucent={false} />

      {/* Header */}
      <LinearGradient colors={['#4caf50', '#2e7d32']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Delivery History</Text>
        </View>

        {/* Date Range Selector */}
        <View style={styles.dateRangeContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeSeparator}>to</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#c8e6c9' }]}>{stats.delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ffccbc' }]}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontSize: 12 }]}>{formatCurrency(stats.totalCollected)}</Text>
            <Text style={styles.statLabel}>Collected</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          maximumDate={endDate}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={startDate}
          maximumDate={new Date()}
        />
      )}

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={() => fetchHistory(true)}
            colors={['#4caf50']}
            tintColor="#4caf50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No delivery history found</Text>
            <Text style={styles.emptySubtext}>Try adjusting the date range</Text>
          </View>
        }
      />

      {/* View Order Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainerWrapper}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delivery Details</Text>
                <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + 20 }]}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Status Banner */}
                  <View style={[styles.statusBanner, { backgroundColor: deliveryStatusConfig[selectedOrder.deliveryStatus].bg }]}>
                    <Ionicons
                      name={deliveryStatusConfig[selectedOrder.deliveryStatus].icon as any}
                      size={24}
                      color={deliveryStatusConfig[selectedOrder.deliveryStatus].color}
                    />
                    <Text style={[styles.statusBannerText, { color: deliveryStatusConfig[selectedOrder.deliveryStatus].color }]}>
                      {deliveryStatusConfig[selectedOrder.deliveryStatus].label}
                    </Text>
                  </View>

                  {/* Store Info */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="storefront" size={20} color="#4caf50" />
                      <Text style={styles.modalSectionTitle}>Store Information</Text>
                    </View>
                    <Text style={styles.modalText}>{selectedOrder.storeName}</Text>
                    <Text style={styles.modalSubtext}>{selectedOrder.storeAddress}</Text>
                  </View>

                  {/* Delivery Info */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="bicycle" size={20} color="#4caf50" />
                      <Text style={styles.modalSectionTitle}>Delivery Information</Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Order Number:</Text>
                      <Text style={styles.modalValue}>{selectedOrder.orderNumber}</Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Delivered At:</Text>
                      <Text style={styles.modalValue}>
                        {selectedOrder.deliveredAt ? formatDateTime(selectedOrder.deliveredAt) : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Collected Amount:</Text>
                      <Text style={[styles.modalValue, { color: '#4caf50', fontWeight: '700' }]}>
                        {selectedOrder.collectedAmount ? formatCurrency(selectedOrder.collectedAmount) : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Payment Method:</Text>
                      <Text style={styles.modalValue}>
                        {selectedOrder.paymentMethod
                          ? selectedOrder.paymentMethod.charAt(0).toUpperCase() + selectedOrder.paymentMethod.slice(1)
                          : 'N/A'}
                      </Text>
                    </View>
                    {selectedOrder.deliveryNotes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.modalLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{selectedOrder.deliveryNotes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Order Items */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="cube" size={20} color="#4caf50" />
                      <Text style={styles.modalSectionTitle}>Order Items ({selectedOrder.items.length})</Text>
                    </View>
                    {selectedOrder.items.map((item, index) => (
                      <View key={item.id || index} style={styles.modalItemRow}>
                        <View style={styles.modalItemLeft}>
                          <Text style={styles.modalItemName}>{item.productName}</Text>
                          <Text style={styles.modalItemCode}>{item.productCode}</Text>
                          <View style={styles.itemQuantities}>
                            <Text style={styles.itemQuantityText}>
                              Ordered: {item.quantity}
                            </Text>
                            <Text style={[styles.itemQuantityText, { color: '#4caf50' }]}>
                              Delivered: {item.deliveredQuantity}
                            </Text>
                            {item.returnedQuantity > 0 && (
                              <Text style={[styles.itemQuantityText, { color: '#f44336' }]}>
                                Returned: {item.returnedQuantity}
                              </Text>
                            )}
                          </View>
                          {item.returnReason && (
                            <Text style={styles.returnReasonText}>Reason: {item.returnReason}</Text>
                          )}
                        </View>
                        <View style={styles.modalItemRight}>
                          <Text style={styles.modalItemTotal}>
                            {formatCurrency(item.deliveredQuantity * item.price)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Total */}
                  <View style={styles.modalTotalSection}>
                    <Text style={styles.modalTotalLabel}>Order Total</Text>
                    <Text style={styles.modalTotalValue}>{formatCurrency(selectedOrder.totalAmount)}</Text>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: 10,
  },
  headerTop: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  dateRangeSeparator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  ordersList: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f2f5',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  storeDetails: {
    flex: 1,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  storeAddress: {
    fontSize: 11,
    color: '#888',
    flex: 1,
  },
  orderDetailsSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
  },
  detailItemSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailTextSmallContent: {
    fontSize: 11,
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  collectedAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4caf50',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  paymentText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainerWrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    overflow: 'hidden',
  },
  modalContainer: {
    backgroundColor: '#fff',
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingTop: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#666',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  notesContainer: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f5f7fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalItemCode: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  itemQuantities: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  itemQuantityText: {
    fontSize: 12,
    color: '#666',
  },
  returnReasonText: {
    fontSize: 12,
    color: '#f44336',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalItemRight: {
    alignItems: 'flex-end',
  },
  modalItemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4caf50',
  },
  modalTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e8ecf4',
    marginTop: 8,
  },
  modalTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4caf50',
  },
});
