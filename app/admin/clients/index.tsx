// app/admin/clients/index.tsx
// Client Management Screen - Real Supabase Data

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Users,
  ChevronRight,
  Ban,
  CreditCard,
  Ticket,
  ChevronLeft,
} from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import Colors from '@/constants/colors';
import Fonts from '@/constants/typography';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminClients, ClientListItem } from '@/hooks/admin/useAdminClients';

function AddClientButton({ onPress }: { onPress: () => void }) {
  const lottieRef = useRef<LottieView>(null);
  const hasPlayed = useRef(false);

  useEffect(() => {
    // Play once on mount (screen enter)
    if (lottieRef.current && !hasPlayed.current) {
      hasPlayed.current = true;
      lottieRef.current.play();
    }
  }, []);

  const handlePress = () => {
    lottieRef.current?.play();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <LottieView
        ref={lottieRef}
        source={require('@/assets/animations/lottieflow-chat-17-1-ffffff-easey.json')}
        autoPlay={false}
        loop={false}
        style={{ width: 44, height: 44 }}
        colorFilters={[
          { keypath: 'plus', color: '#d070b8' },
          { keypath: 'body', color: '#d070b8' },
        ]}
      />
    </TouchableOpacity>
  );
}

export default function ClientManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fetchClients } = useAdminClients();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadClients = useCallback(async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת הלקוחות');
    }
  }, [fetchClients]);

  useEffect(() => {
    setLoading(true);
    loadClients().finally(() => setLoading(false));
  }, [loadClients]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredClients(
      clients.filter(
        c =>
          c.full_name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone_number?.includes(query)
      )
    );
  }, [searchQuery, clients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  }, [loadClients]);

  const isClientBlocked = (client: ClientListItem) =>
    client.block_end_date && new Date(client.block_end_date) > new Date();

  const getClientStatus = (client: ClientListItem): string => {
    if (client.subscription) {
      return client.subscription.plan_status || 'active';
    }
    if (client.ticket) {
      return client.ticket.status === 'active' ? 'active' : 'expired';
    }
    return 'inactive';
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
      case 'inactive': return 'לא פעיל';
      default: return 'לא ידוע';
    }
  };

  // Count active members (subscription or ticket)
  const activeCount = clients.filter(c =>
    (c.subscription && c.subscription.is_active && c.subscription.plan_status === 'active') ||
    (c.ticket && c.ticket.status === 'active')
  ).length;

  return (
    <View style={styles.container}>
      <AdminHeader
        title="ניהול לקוחות"
        rightAction={
          <AddClientButton onPress={() => router.push('/admin/clients/new')} />
        }
      />

      {/* Stats Summary */}
      {!loading && (
        <View style={styles.statsSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{clients.length}</Text>
            <Text style={styles.summaryLabel}>סה"כ לקוחות</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#22C55E' }]}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>מנויים פעילים</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Client List */}
      {loading ? (
        <View style={styles.centered}>
          <Spinner size="lg" />
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredClients.map(client => {
            const blocked = isClientBlocked(client);
            const status = getClientStatus(client);
            const statusColor = getStatusColor(status);
            const planName = client.subscription?.plan_name || client.ticket?.plan_name || null;
            const sessionsRemaining = client.subscription?.sessions_remaining ?? client.ticket?.sessions_remaining ?? null;
            const totalSessions = client.ticket?.total_sessions ?? null;

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
                        {getStatusName(status)}
                      </Text>
                    </View>
                    <ChevronLeft size={20} color="#CBD5E1" />
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  {planName ? (
                    <View style={styles.footerPlan}>
                      {client.ticket ? (
                        <Ticket size={13} color="#64748B" />
                      ) : (
                        <CreditCard size={13} color="#64748B" />
                      )}
                      <Text style={styles.footerPlanText}>{planName}</Text>
                    </View>
                  ) : (
                    <Text style={styles.footerNoPlan}>ללא מנוי</Text>
                  )}

                  {sessionsRemaining !== null && (
                    <>
                      <View style={styles.footerDivider} />
                      <View style={styles.footerStat}>
                        <Text style={styles.footerLabel}>אימונים נותרו</Text>
                        <Text style={styles.footerValue}>
                          {sessionsRemaining}{totalSessions !== null ? `/${totalSessions}` : ''}
                        </Text>
                      </View>
                    </>
                  )}

                  {blocked && (
                    <>
                      <View style={styles.footerDivider} />
                      <View style={styles.blockedIndicator}>
                        <Ban size={12} color="#EF4444" />
                        <Text style={styles.blockedText}>חסום</Text>
                      </View>
                    </>
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
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderBottomLeftRadius:20,
    borderBottomRightRadius:20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 25,
    fontFamily: Fonts.black,
    color: '#0F172A',
  },
  summaryLabel: {
    fontSize: 15,
    fontFamily: Fonts.medium,
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
    flexDirection: 'row',
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
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  clientName: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: '#0F172A',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  cardRight: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBFCFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerPlan: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerPlanText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  footerNoPlan: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7b8491ff',
    flex: 1,
    textAlign: 'center',
  },
  footerStat: {
    alignItems: 'center',
    marginHorizontal: 12,
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
