import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import { DeliveryOrder, DeliveryStatus } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const deliveryStatusConfig: Record<DeliveryStatus | 'all', { color: string; bg: string; icon: string; label: string }> = {
  all: { color: '#666', bg: '#f5f5f5', icon: 'list', label: 'All' },
  pending: { color: '#ff9800', bg: '#fff3e0', icon: 'time', label: 'Pending' },
  out_for_delivery: { color: '#2196f3', bg: '#e3f2fd', icon: 'bicycle', label: 'Out for Delivery' },
  delivered: { color: '#4caf50', bg: '#e8f5e9', icon: 'checkmark-circle', label: 'Delivered' },
  partial: { color: '#9c27b0', bg: '#f3e5f5', icon: 'alert-circle', label: 'Partial' },
  failed: { color: '#f44336', bg: '#ffebee', icon: 'close-circle', label: 'Failed' },
  returned: { color: '#795548', bg: '#efebe9', icon: 'return-down-back', label: 'Returned' },
};

export default function DeliveryHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { salesmanId, salesmanName } = useAuth();
  const {
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
  } = useDelivery();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const stats = getDeliveryStats();
  const filteredOrders = getOrdersByFilter(activeFilter);

  // Filter orders by search query
  const searchFilteredOrders = searchQuery.trim()
    ? filteredOrders.filter(order => {
        const query = searchQuery.trim().toLowerCase();
        return (
          order.storeName.toLowerCase().includes(query) ||
          order.storeAddress.toLowerCase().includes(query) ||
          order.orderNumber.toLowerCase().includes(query) ||
          (order.bookerName && order.bookerName.toLowerCase().includes(query))
        );
      })
    : filteredOrders;

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

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleViewOrder = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
  };

  const handleStartDelivery = async (order: DeliveryOrder) => {
    Alert.alert(
      'Start Delivery',
      `Are you sure you want to start delivery for ${order.storeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              await startDelivery(order.id);
              Alert.alert('Success', 'Delivery started!');
              setViewModalVisible(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to start delivery');
            }
          },
        },
      ]
    );
  };

  const handleCompleteDelivery = (order: DeliveryOrder) => {
    setViewModalVisible(false);
    router.push({
      pathname: '/(delivery)/complete-delivery',
      params: { orderId: order.id },
    } as any);
  };

  const handleCallStore = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigateToStore = (order: DeliveryOrder) => {
    if (order.storeLatitude && order.storeLongitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${order.storeLatitude},${order.storeLongitude}`,
        android: `geo:0,0?q=${order.storeLatitude},${order.storeLongitude}(${encodeURIComponent(order.storeName)})`,
      });
      if (url) {
        Linking.openURL(url).catch(() => {
          // Fallback to Google Maps URL
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${order.storeLatitude},${order.storeLongitude}`);
        });
      }
    } else {
      Alert.alert('Navigation Error', 'Store location not available');
    }
  };

  const renderOrderCard = ({ item }: { item: DeliveryOrder }) => {
    const config = deliveryStatusConfig[item.deliveryStatus] || deliveryStatusConfig.pending;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() => handleViewOrder(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.storeInfo}>
            <View style={styles.storeIconContainer}>
              <Ionicons name="storefront" size={18} color="#4caf50" />
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

        <View style={styles.orderMetaRow}>
          <View style={styles.orderIdBadge}>
            <Text style={styles.orderIdText}>{item.orderNumber}</Text>
          </View>
          {item.bookerName && (
            <View style={styles.bookerBadge}>
              <Ionicons name="person-outline" size={10} color="#666" />
              <Text style={styles.bookerText}>{item.bookerName}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderDetailsSmall}>
          <View style={styles.detailItemSmall}>
            <Ionicons name="cube-outline" size={12} color="#666" />
            <Text style={styles.detailTextSmallContent}>{item.itemsCount} Items</Text>
          </View>
          <View style={styles.detailItemSmall}>
            <Ionicons name="calendar-outline" size={12} color="#666" />
            <Text style={styles.detailTextSmallContent}>{item.orderDate}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.totalAmountSmall}>{formatCurrency(item.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.cardActionsSmall}>
          {item.storePhone && (
            <TouchableOpacity
              style={[styles.miniActionBtn, { backgroundColor: '#e3f2fd' }]}
              onPress={() => handleCallStore(item.storePhone!)}
            >
              <Ionicons name="call-outline" size={16} color="#1a73e8" />
            </TouchableOpacity>
          )}
          {item.storeLatitude && item.storeLongitude && (
            <TouchableOpacity
              style={[styles.miniActionBtn, { backgroundColor: '#e8f5e9' }]}
              onPress={() => handleNavigateToStore(item)}
            >
              <Ionicons name="navigate-outline" size={16} color="#4caf50" />
            </TouchableOpacity>
          )}
          {item.deliveryStatus === 'pending' && (
            <TouchableOpacity
              style={[styles.miniActionBtn, { backgroundColor: '#4caf50' }]}
              onPress={() => handleStartDelivery(item)}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={[styles.miniActionText, { color: '#fff' }]}>Start</Text>
            </TouchableOpacity>
          )}
          {item.deliveryStatus === 'out_for_delivery' && (
            <TouchableOpacity
              style={[styles.miniActionBtn, { backgroundColor: '#2196f3' }]}
              onPress={() => handleCompleteDelivery(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={[styles.miniActionText, { color: '#fff' }]}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const tabs: { key: DeliveryStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: orders.length },
    { key: 'pending', label: 'Pending', count: stats.pendingCount },
    { key: 'out_for_delivery', label: 'In Progress', count: stats.outForDeliveryCount },
    { key: 'delivered', label: 'Delivered', count: stats.deliveredCount },
    { key: 'failed', label: 'Failed', count: stats.failedCount },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4caf50" translucent={false} />

      {/* Header */}
      <LinearGradient colors={['#4caf50', '#2e7d32']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(salesmanName || 'D').charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Delivery Dashboard</Text>
              <Text style={styles.userName}>{salesmanName || 'Delivery Person'}</Text>
              <Text style={styles.userId}>ID: {salesmanId || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Date Selector */}
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text style={styles.dateSelectorText}>{formatDate(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={16} color="#fff" />
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.deliveredCount}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontSize: 14 }]}>{formatCurrency(stats.totalAmountToCollect)}</Text>
            <Text style={styles.statLabel}>To Collect</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          data={tabs}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeFilter === item.key && styles.activeTab]}
              onPress={() => setActiveFilter(item.key)}
            >
              <Text style={[styles.tabText, activeFilter === item.key && styles.activeTabText]}>
                {item.label}
              </Text>
              <View style={[styles.tabBadge, activeFilter === item.key && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeFilter === item.key && styles.activeTabBadgeText]}>
                  {item.count}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by store, address, or booker..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={searchFilteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={refreshOrders}
            colors={['#4caf50']}
            tintColor="#4caf50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No deliveries for this date</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
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
                <Text style={styles.modalTitle}>Order Details</Text>
                <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <View style={styles.modalContentWrapper}>
                  <ScrollView
                    style={styles.modalScrollView}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {/* Store Info */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="storefront" size={20} color="#4caf50" />
                        <Text style={styles.modalSectionTitle}>Store Information</Text>
                      </View>
                      <Text style={styles.modalText}>{selectedOrder.storeName}</Text>
                      <Text style={styles.modalSubtext}>{selectedOrder.storeAddress}</Text>
                      {selectedOrder.storePhone && (
                        <TouchableOpacity
                          style={styles.phoneRow}
                          onPress={() => handleCallStore(selectedOrder.storePhone!)}
                        >
                          <Ionicons name="call" size={16} color="#4caf50" />
                          <Text style={styles.phoneText}>{selectedOrder.storePhone}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsRow}>
                      {selectedOrder.storePhone && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#e3f2fd' }]}
                          onPress={() => handleCallStore(selectedOrder.storePhone!)}
                        >
                          <Ionicons name="call" size={20} color="#1a73e8" />
                          <Text style={[styles.actionButtonText, { color: '#1a73e8' }]}>Call</Text>
                        </TouchableOpacity>
                      )}
                      {selectedOrder.storeLatitude && selectedOrder.storeLongitude && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#e8f5e9' }]}
                          onPress={() => handleNavigateToStore(selectedOrder)}
                        >
                          <Ionicons name="navigate" size={20} color="#4caf50" />
                          <Text style={[styles.actionButtonText, { color: '#4caf50' }]}>Navigate</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Order Info */}
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="information-circle" size={20} color="#4caf50" />
                        <Text style={styles.modalSectionTitle}>Order Information</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Order Number:</Text>
                        <Text style={styles.modalValue}>{selectedOrder.orderNumber}</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Booker:</Text>
                        <Text style={styles.modalValue}>{selectedOrder.bookerName || 'N/A'}</Text>
                      </View>
                      {selectedOrder.distributionName && (
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Distribution:</Text>
                          <Text style={styles.modalValue}>{selectedOrder.distributionName}</Text>
                        </View>
                      )}
                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Order Date:</Text>
                        <Text style={styles.modalValue}>{selectedOrder.orderDate}</Text>
                      </View>
                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Status:</Text>
                        <View style={[styles.statusBadge, { backgroundColor: deliveryStatusConfig[selectedOrder.deliveryStatus].bg }]}>
                          <Text style={[styles.statusText, { color: deliveryStatusConfig[selectedOrder.deliveryStatus].color }]}>
                            {deliveryStatusConfig[selectedOrder.deliveryStatus].label}
                          </Text>
                        </View>
                      </View>
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
                          </View>
                          <View style={styles.modalItemRight}>
                            <Text style={styles.modalItemQty}>{item.quantity} x {formatCurrency(item.price)}</Text>
                            <Text style={styles.modalItemTotal}>{formatCurrency(item.lineTotal)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Footer with Total and Actions */}
                  <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.modalTotalSection}>
                      <Text style={styles.modalTotalLabel}>Total Amount</Text>
                      <Text style={styles.modalTotalValue}>{formatCurrency(selectedOrder.totalAmount)}</Text>
                    </View>

                    {selectedOrder.deliveryStatus === 'pending' && (
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => handleStartDelivery(selectedOrder)}
                      >
                        <LinearGradient
                          colors={['#4caf50', '#2e7d32']}
                          style={styles.primaryButtonGradient}
                        >
                          <Ionicons name="play" size={20} color="#fff" />
                          <Text style={styles.primaryButtonText}>Start Delivery</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    {selectedOrder.deliveryStatus === 'out_for_delivery' && (
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => handleCompleteDelivery(selectedOrder)}
                      >
                        <LinearGradient
                          colors={['#2196f3', '#1565c0']}
                          style={styles.primaryButtonGradient}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.primaryButtonText}>Complete Delivery</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userId: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  dateSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabsWrapper: {
    marginTop: 16,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: '#fff',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTab: {
    backgroundColor: '#4caf50',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#e8ecf4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  searchClearBtn: {
    padding: 4,
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
    backgroundColor: '#e8f5e9',
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
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  orderIdBadge: {
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4caf50',
  },
  bookerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookerText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
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
  totalAmountSmall: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4caf50',
  },
  cardActionsSmall: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  miniActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4caf50',
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalContainer: {
    backgroundColor: '#fff',
    flex: 1,
    paddingTop: 20,
    display: 'flex',
    flexDirection: 'column',
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
  modalContentWrapper: {
    flex: 1,
    minHeight: 0,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 0,
  },
  modalScrollContent: {
    paddingTop: 20,
    paddingBottom: 8,
    flexGrow: 1,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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
  },
  modalItemRight: {
    alignItems: 'flex-end',
  },
  modalItemQty: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  modalItemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4caf50',
  },
  modalFooter: {
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: '#e8ecf4',
    backgroundColor: '#fff',
  },
  modalTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
