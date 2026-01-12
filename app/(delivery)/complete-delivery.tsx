import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDelivery } from '../../contexts/DeliveryContext';
import { DeliveryOrderItem, PaymentMethod } from '../../lib/supabase';
import * as Location from 'expo-location';
import { isWithinRadius, formatDistance, calculateDistance } from '../../utils/locationUtils';

const GEOFENCE_RADIUS_METERS = 100;

export default function CompleteDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { getOrderById, completeDelivery, markDeliveryFailed, loading } = useDelivery();

  const order = getOrderById(orderId || '');

  const [items, setItems] = useState<DeliveryOrderItem[]>([]);
  const [collectedAmount, setCollectedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      // Initialize items with default values
      setItems(order.items.map(item => ({
        ...item,
        deliveredQuantity: item.quantity,
        returnedQuantity: 0,
        returnReason: null,
      })));
      setCollectedAmount(order.totalAmount.toString());
    }
  }, [order]);

  if (!order) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const updateItemQuantity = (itemId: string, field: 'deliveredQuantity' | 'returnedQuantity', value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const maxQty = item.quantity;
        const newValue = Math.max(0, Math.min(value, maxQty));

        if (field === 'deliveredQuantity') {
          return {
            ...item,
            deliveredQuantity: newValue,
            returnedQuantity: Math.max(0, maxQty - newValue),
          };
        } else {
          return {
            ...item,
            returnedQuantity: newValue,
            deliveredQuantity: Math.max(0, maxQty - newValue),
          };
        }
      }
      return item;
    }));
  };

  const updateReturnReason = (itemId: string, reason: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, returnReason: reason || null } : item
    ));
  };

  const calculateTotals = () => {
    const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalDelivered = items.reduce((sum, item) => sum + item.deliveredQuantity, 0);
    const totalReturned = items.reduce((sum, item) => sum + item.returnedQuantity, 0);
    const deliveredValue = items.reduce((sum, item) => sum + (item.deliveredQuantity * item.price), 0);

    return { totalOrdered, totalDelivered, totalReturned, deliveredValue };
  };

  const verifyLocation = async () => {
    if (!order.storeLatitude || !order.storeLongitude) {
      Alert.alert(
        'Location Unavailable',
        'Store location is not available. Do you want to continue without location verification?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => setLocationVerified(true) },
        ]
      );
      return;
    }

    setIsVerifyingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for verification. Continue without verification?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => setLocationVerified(true) },
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;
      const storeLat = order.storeLatitude;
      const storeLon = order.storeLongitude;

      const isWithin = isWithinRadius(userLat, userLon, storeLat, storeLon, GEOFENCE_RADIUS_METERS);

      if (isWithin) {
        setLocationVerified(true);
        Alert.alert('Success', 'Location verified! You are at the store.');
      } else {
        const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
        Alert.alert(
          'Location Mismatch',
          `You are ${formatDistance(distance)} away from the store. Continue anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => setLocationVerified(true) },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Location Error',
        'Unable to verify location. Continue without verification?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => setLocationVerified(true) },
        ]
      );
    } finally {
      setIsVerifyingLocation(false);
    }
  };

  const handleComplete = async () => {
    // Validate items with returns have reasons
    const itemsWithReturns = items.filter(item => item.returnedQuantity > 0);
    const missingReasons = itemsWithReturns.filter(item => !item.returnReason?.trim());

    if (missingReasons.length > 0) {
      Alert.alert('Missing Information', 'Please provide a reason for all returned items.');
      return;
    }

    // Validate collected amount
    const amount = parseFloat(collectedAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid collected amount.');
      return;
    }

    if (!locationVerified) {
      Alert.alert(
        'Location Not Verified',
        'Please verify your location before completing the delivery.',
        [
          { text: 'Verify Now', onPress: verifyLocation },
          { text: 'Skip Verification', onPress: () => setLocationVerified(true) },
        ]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await completeDelivery(
        order.id,
        items,
        amount,
        paymentMethod,
        deliveryNotes.trim() || undefined
      );

      Alert.alert('Success', 'Delivery completed successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkFailed = () => {
    Alert.prompt(
      'Mark as Failed',
      'Please enter the reason for failed delivery:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert('Error', 'Please provide a reason');
              return;
            }
            try {
              setIsSubmitting(true);
              await markDeliveryFailed(order.id, reason.trim());
              Alert.alert('Success', 'Delivery marked as failed', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update delivery');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const totals = calculateTotals();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#2196f3" translucent={false} />

      {/* Header */}
      <LinearGradient colors={['#2196f3', '#1565c0']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Complete Delivery</Text>
            <Text style={styles.headerSubtitle}>{order.storeName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location Verification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#2196f3" />
            <Text style={styles.sectionTitle}>Location Verification</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              locationVerified && styles.verifyButtonSuccess,
            ]}
            onPress={verifyLocation}
            disabled={isVerifyingLocation || locationVerified}
          >
            {isVerifyingLocation ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={locationVerified ? 'checkmark-circle' : 'navigate'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.verifyButtonText}>
                  {locationVerified ? 'Location Verified' : 'Verify Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={20} color="#2196f3" />
            <Text style={styles.sectionTitle}>Order Items ({items.length})</Text>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemCode}>{item.productCode}</Text>
                  <Text style={styles.itemPrice}>
                    {item.quantity} x {formatCurrency(item.price)} = {formatCurrency(item.lineTotal)}
                  </Text>
                </View>
              </View>

              <View style={styles.quantityRow}>
                <View style={styles.quantityColumn}>
                  <Text style={styles.quantityLabel}>Delivered</Text>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateItemQuantity(item.id, 'deliveredQuantity', item.deliveredQuantity - 1)}
                    >
                      <Ionicons name="remove" size={16} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.quantityValue}>{item.deliveredQuantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateItemQuantity(item.id, 'deliveredQuantity', item.deliveredQuantity + 1)}
                    >
                      <Ionicons name="add" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quantityColumn}>
                  <Text style={styles.quantityLabel}>Returned</Text>
                  <View style={[styles.quantityControl, item.returnedQuantity > 0 && styles.quantityControlWarning]}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateItemQuantity(item.id, 'returnedQuantity', item.returnedQuantity - 1)}
                    >
                      <Ionicons name="remove" size={16} color="#666" />
                    </TouchableOpacity>
                    <Text style={[styles.quantityValue, item.returnedQuantity > 0 && styles.quantityValueWarning]}>
                      {item.returnedQuantity}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => updateItemQuantity(item.id, 'returnedQuantity', item.returnedQuantity + 1)}
                    >
                      <Ionicons name="add" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {item.returnedQuantity > 0 && (
                <View style={styles.returnReasonContainer}>
                  <TextInput
                    style={styles.returnReasonInput}
                    placeholder="Reason for return (required)"
                    placeholderTextColor="#999"
                    value={item.returnReason || ''}
                    onChangeText={(text) => updateReturnReason(item.id, text)}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calculator" size={20} color="#2196f3" />
            <Text style={styles.sectionTitle}>Summary</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Ordered:</Text>
              <Text style={styles.summaryValue}>{totals.totalOrdered} items</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivered:</Text>
              <Text style={[styles.summaryValue, { color: '#4caf50' }]}>{totals.totalDelivered} items</Text>
            </View>
            {totals.totalReturned > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Returned:</Text>
                <Text style={[styles.summaryValue, { color: '#f44336' }]}>{totals.totalReturned} items</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Delivered Value:</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totals.deliveredValue)}</Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet" size={20} color="#2196f3" />
            <Text style={styles.sectionTitle}>Payment Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Collected Amount</Text>
            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencyPrefix}>Rs</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#999"
                value={collectedAmount}
                onChangeText={setCollectedAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {(['cash', 'credit', 'online'] as PaymentMethod[]).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodBtn,
                    paymentMethod === method && styles.paymentMethodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Ionicons
                    name={method === 'cash' ? 'cash' : method === 'credit' ? 'card' : 'phone-portrait'}
                    size={18}
                    color={paymentMethod === method ? '#fff' : '#666'}
                  />
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === method && styles.paymentMethodTextActive,
                  ]}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this delivery..."
              placeholderTextColor="#999"
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.failedButton}
            onPress={handleMarkFailed}
            disabled={isSubmitting}
          >
            <Ionicons name="close-circle" size={20} color="#f44336" />
            <Text style={styles.failedButtonText}>Mark as Failed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={isSubmitting ? ['#9e9e9e', '#757575'] : ['#4caf50', '#2e7d32']}
              style={styles.completeButtonGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>Complete Delivery</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196f3',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196f3',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  verifyButtonSuccess: {
    backgroundColor: '#4caf50',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  itemCode: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quantityColumn: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    padding: 4,
  },
  quantityControlWarning: {
    backgroundColor: '#ffebee',
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    minWidth: 40,
    textAlign: 'center',
  },
  quantityValueWarning: {
    color: '#f44336',
  },
  returnReasonContainer: {
    marginTop: 12,
  },
  returnReasonInput: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e8ecf4',
    marginTop: 8,
    paddingTop: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4caf50',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8ecf4',
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    paddingVertical: 14,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8ecf4',
  },
  paymentMethodBtnActive: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8ecf4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a2e',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    gap: 12,
  },
  failedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffebee',
  },
  failedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
