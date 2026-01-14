// app/admin/clients/index.tsx
// Client Management Screen - REDESIGNED

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Users,
  ChevronRight,
  Ban,
  Filter,
} from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { AdminHeader } from '@/components/admin/AdminHeader';

const { width } = Dimensions.get('window');

interface Client {
  id: string;
  full_name: string;
  email: string;
  subscription_type: string;
  subscription_status: string;
  subscription_start: string;
  subscription_end: string;
  classes_per_month: number;
  classes_used: number;
  block_end_date?: string;
  late_cancellations: number;
  plate_balance: number;
  total_workouts: number;
}

export default function ClientManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    applySearch();
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת הלקוחות');
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.full_name?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
    );

    setFilteredClients(filtered);
  };

  const isClientBlocked = (client: Client) => {
    return client.block_end_date && new Date(client.block_end_date) > new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'expired': return '#EF4444';
      case 'frozen': return '#3B82F6';
      default: return '#94A3B8';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'expired': return 'פג תוקף';
      case 'frozen': return 'קפוא';
      default: return 'לא ידוע';
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="ניהול לקוחות" />

      {/* 1. Statistics Summary */}
      {!loading && (
        <View style={styles.statsSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{clients.length}</Text>
            <Text style={styles.summaryLabel}>סה"כ לקוחות</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
              {clients.filter(c => c.subscription_status === 'active').length}
            </Text>
            <Text style={styles.summaryLabel}>מנויים פעילים</Text>
          </View>
        </View>
      )}

      {/* 2. Search & Filter Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.newClientButton}
          onPress={() => router.push('/admin/clients/new')}
          activeOpacity={0.7}
        >
          <Users size={18} color="#fff" />
          <Text style={styles.newClientButtonText}>לקוח חדש</Text>
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי שם או אימייל..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 3. Clients List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredClients.length === 0 ? (
        <View style={styles.centered}>
          <Users size={48} color="#E2E8F0" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>לא נמצאו לקוחות</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredClients.map((client) => {
            const blocked = isClientBlocked(client);
            const statusColor = getStatusColor(client.subscription_status || 'expired');

            return (
              <TouchableOpacity
                key={client.id}
                style={[styles.clientCard, blocked && styles.clientCardBlocked]}
                activeOpacity={0.7}
                onPress={() => router.push(`/admin/clients/${client.id}`)}
              >
                <View style={styles.cardMain}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarText}>{client.full_name?.charAt(0) || '?'}</Text>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  </View>

                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.full_name || 'ללא שם'}</Text>
                    <Text style={styles.clientEmail} numberOfLines={1}>{client.email}</Text>
                  </View>

                  <View style={styles.cardRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {getStatusName(client.subscription_status || 'expired')}
                      </Text>
                    </View>
                    <ChevronRight size={20} color="#CBD5E1" />
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerStat}>
                    <Text style={styles.footerLabel}>שיעורים החודש</Text>
                    <Text style={styles.footerValue}>{client.classes_used || 0}/{client.classes_per_month || 0}</Text>
                  </View>
                  <View style={styles.footerDivider} />
                  <View style={styles.footerStat}>
                    <Text style={styles.footerLabel}>פלטות</Text>
                    <Text style={styles.footerValue}>{client.plate_balance || 0}</Text>
                  </View>
                  {blocked && (
                    <View style={styles.blockedIndicator}>
                      <Ban size={12} color="#EF4444" />
                      <Text style={styles.blockedText}>חסום</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean White
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  statsSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  newClientButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  newClientButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 12,
    marginRight: 10,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  clientCardBlocked: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cardMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  clientInfo: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  clientName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  cardRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FBFCFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerStat: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  blockedIndicator: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  blockedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
