import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useDelivery } from '../../contexts/DeliveryContext';
import { supabase } from '../../lib/supabase';

export default function DeliveryProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { salesmanId, salesmanName, email, phone, logout, assignedBookerIds } = useAuth();
  const { orders } = useDelivery();

  const [lifetimeStats, setLifetimeStats] = useState({
    totalDeliveries: 0,
    successRate: 0,
    totalCollected: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchLifetimeStats();
  }, [salesmanId]);

  const fetchLifetimeStats = async () => {
    if (!salesmanId) return;

    try {
      setLoadingStats(true);

      // Fetch all completed deliveries by this delivery person
      const { data, error } = await supabase
        .from('orders')
        .select('delivery_status, collected_amount')
        .eq('delivery_sm_id', salesmanId)
        .in('delivery_status', ['delivered', 'partial', 'failed', 'returned']);

      if (error) {
        console.error('Error fetching lifetime stats:', error);
        return;
      }

      if (data) {
        const total = data.length;
        const successful = data.filter(o => o.delivery_status === 'delivered' || o.delivery_status === 'partial').length;
        const collected = data.reduce((sum, o) => sum + (o.collected_amount || 0), 0);
        const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

        setLifetimeStats({
          totalDeliveries: total,
          successRate,
          totalCollected: collected,
        });
      }
    } catch (error) {
      console.error('Error in fetchLifetimeStats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Today's stats
  const todayStats = {
    pending: orders.filter(o => o.deliveryStatus === 'pending').length,
    completed: orders.filter(o => o.deliveryStatus === 'delivered' || o.deliveryStatus === 'partial').length,
    failed: orders.filter(o => o.deliveryStatus === 'failed' || o.deliveryStatus === 'returned').length,
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const displayName = salesmanName?.trim() || 'Delivery Person';
  const displayId = salesmanId?.trim() || 'N/A';

  const handleLogout = () => {
    logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'index' }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4caf50" translucent={false} />

      {/* Header */}
      <LinearGradient colors={['#4caf50', '#2e7d32']} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="bicycle" size={16} color="#4caf50" />
            </View>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileRole}>Delivery Person</Text>
          <Text style={styles.profileId}>ID: {displayId}</Text>
        </View>

        {/* Today's Performance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={20} color="#4caf50" />
            <Text style={styles.sectionTitle}>Today's Performance</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="time-outline" size={24} color="#ff9800" />
              </View>
              <Text style={styles.statValue}>{todayStats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#4caf50" />
              </View>
              <Text style={styles.statValue}>{todayStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ffebee' }]}>
                <Ionicons name="close-circle-outline" size={24} color="#f44336" />
              </View>
              <Text style={styles.statValue}>{todayStats.failed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Lifetime Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color="#4caf50" />
            <Text style={styles.sectionTitle}>Lifetime Statistics</Text>
          </View>

          <View style={styles.lifetimeCard}>
            <View style={styles.lifetimeRow}>
              <View style={styles.lifetimeItem}>
                <Text style={styles.lifetimeValue}>{lifetimeStats.totalDeliveries}</Text>
                <Text style={styles.lifetimeLabel}>Total Deliveries</Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeItem}>
                <Text style={[styles.lifetimeValue, { color: '#4caf50' }]}>{lifetimeStats.successRate}%</Text>
                <Text style={styles.lifetimeLabel}>Success Rate</Text>
              </View>
            </View>
            <View style={styles.lifetimeAmountRow}>
              <Text style={styles.lifetimeAmountLabel}>Total Collected</Text>
              <Text style={styles.lifetimeAmountValue}>{formatCurrency(lifetimeStats.totalCollected)}</Text>
            </View>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#4caf50" />
            <Text style={styles.sectionTitle}>Profile Information</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Full Name</Text>
              </View>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="id-card-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Delivery ID</Text>
              </View>
              <Text style={styles.infoValue}>{displayId}</Text>
            </View>

            {email && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons name="mail-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Email</Text>
                  </View>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </>
            )}

            {phone && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons name="call-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Phone</Text>
                  </View>
                  <Text style={styles.infoValue}>{phone}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Assigned Bookers</Text>
              </View>
              <Text style={styles.infoValue}>{assignedBookerIds.length}</Text>
            </View>
          </View>
        </View>

        {/* Assigned Bookers */}
        {assignedBookerIds.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#4caf50" />
              <Text style={styles.sectionTitle}>Assigned Bookers</Text>
            </View>

            <View style={styles.bookersCard}>
              <View style={styles.bookersList}>
                {assignedBookerIds.map((bookerId, index) => (
                  <View key={bookerId} style={styles.bookerBadge}>
                    <Ionicons name="person" size={14} color="#4caf50" />
                    <Text style={styles.bookerBadgeText}>{bookerId}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#e53935" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 13,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  lifetimeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lifetimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lifetimeItem: {
    flex: 1,
    alignItems: 'center',
  },
  lifetimeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e8ecf4',
  },
  lifetimeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  lifetimeLabel: {
    fontSize: 12,
    color: '#666',
  },
  lifetimeAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8ecf4',
  },
  lifetimeAmountLabel: {
    fontSize: 14,
    color: '#666',
  },
  lifetimeAmountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4caf50',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f2f5',
    marginVertical: 4,
  },
  bookersCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bookersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bookerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f7fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4caf50',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#ffebee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e53935',
  },
});
