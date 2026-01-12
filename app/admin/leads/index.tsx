// app/admin/leads/index.tsx
// Leads Management Dashboard - Kanban Board Style

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CRMManager } from '@/lib/services/crm-manager';
import { Lead, LeadStatus, LeadStats } from '@/constants/crm-types';
import colors from '@/constants/colors';
import { AdminHeader } from '@/components/admin/AdminHeader';

const STATUS_CONFIG: Record<LeadStatus, { title: string; icon: string; color: string }> = {
  new: { title: 'חדשים', icon: 'add-circle', color: '#3b82f6' },
  contacted: { title: 'יצרנו קשר', icon: 'call', color: '#8b5cf6' },
  interested: { title: 'מעוניינים', icon: 'heart', color: '#ec4899' },
  trial_scheduled: { title: 'אימון ניסיון', icon: 'calendar', color: '#f59e0b' },
  trial_completed: { title: 'סיימו ניסיון', icon: 'checkmark-circle', color: '#10b981' },
  converted: { title: 'לקוחות!', icon: 'trophy', color: colors.primary },
  not_interested: { title: 'לא רלוונטי', icon: 'close-circle', color: '#6b7280' },
  no_response: { title: 'לא עונים', icon: 'time', color: '#ef4444' },
};

export default function LeadsManagementScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leadsData, statsData] = await Promise.all([
        CRMManager.getLeads(),
        CRMManager.getLeadStats(),
      ]);

      setLeads(leadsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading leads:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את הלידים');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      searchQuery === '' ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);

    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>סה״כ לידים</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.new}
          </Text>
          <Text style={styles.statLabel}>חדשים</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {stats.converted}
          </Text>
          <Text style={styles.statLabel}>הומרו</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
            {stats.conversion_rate.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>המרה</Text>
        </View>
      </View>
    );
  };

  const renderStatusFilters = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedStatus === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text
            style={[
              styles.filterText,
              selectedStatus === 'all' && styles.filterTextActive,
            ]}
          >
            הכל ({leads.length})
          </Text>
        </TouchableOpacity>

        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = leads.filter((l) => l.status === status).length;
          if (count === 0) return null;

          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                selectedStatus === status && styles.filterChipActive,
                { borderColor: config.color },
              ]}
              onPress={() => setSelectedStatus(status as LeadStatus)}
            >
              <Ionicons
                name={config.icon as any}
                size={16}
                color={selectedStatus === status ? '#fff' : config.color}
                style={{ marginLeft: 4 }}
              />
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === status && styles.filterTextActive,
                ]}
              >
                {config.title} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderLeadCard = (lead: Lead) => {
    const statusConfig = STATUS_CONFIG[lead.status];
    const daysSinceContact = lead.last_contact_at
      ? Math.floor(
        (Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      : null;

    const needsAttention = daysSinceContact !== null && daysSinceContact > 3;

    return (
      <TouchableOpacity
        key={lead.id}
        style={[
          styles.leadCard,
          needsAttention && styles.leadCardAttention,
        ]}
        onPress={() => router.push(`/admin/leads/${lead.id}` as any)}
      >
        <View style={styles.leadCardHeader}>
          <View style={styles.leadCardInfo}>
            <Text style={styles.leadName}>{lead.name}</Text>
            <Text style={styles.leadPhone}>{lead.phone}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color="#fff" />
            <Text style={styles.statusText}>{statusConfig.title}</Text>
          </View>
        </View>

        <View style={styles.leadCardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{lead.source}</Text>
          </View>

          {lead.referred_by_user_id && (
            <View style={styles.metaItem}>
              <Ionicons name="people" size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                חבר מביא חבר
              </Text>
            </View>
          )}

          {daysSinceContact !== null && (
            <View style={styles.metaItem}>
              <Ionicons
                name="time"
                size={14}
                color={needsAttention ? '#ef4444' : '#6b7280'}
              />
              <Text
                style={[
                  styles.metaText,
                  needsAttention && { color: '#ef4444', fontWeight: '600' },
                ]}
              >
                {daysSinceContact} ימים
              </Text>
            </View>
          )}
        </View>

        {lead.tags && lead.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {lead.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {lead.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{lead.tags.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="ניהול לידים" />

      {/* Header with Search (Modified to remove title/back, kept search/add) */}
      <View style={styles.subHeader}>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/admin/leads/new' as any)}>
            <Ionicons name="add-circle" size={32} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי שם או טלפון..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      {renderStatsCard()}

      {/* Status Filters */}
      {renderStatusFilters()}

      {/* Leads List */}
      <ScrollView
        style={styles.leadsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'לא נמצאו לידים' : 'אין לידים עדיין'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'נסה לחפש משהו אחר'
                : 'התחל להוסיף לידים חדשים'}
            </Text>
          </View>
        ) : (
          filteredLeads.map(renderLeadCard)
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Quick Actions FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/admin/leads/analytics' as any)}
        >
          <Ionicons name="stats-chart" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  subHeader: {
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  filterChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterTextActive: {
    color: '#fff',
  },
  leadsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  leadCardAttention: {
    borderRightWidth: 4,
    borderRightColor: '#ef4444',
  },
  leadCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadCardInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 4,
    textAlign: 'right',
  },
  leadPhone: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  leadCardMeta: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  tagsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#9ca3af',
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
