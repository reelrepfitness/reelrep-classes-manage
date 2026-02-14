import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAdminPlans, SubscriptionPlan, TicketPlan } from '@/hooks/admin/useAdminPlans';
import { useAdminCoupons, Coupon } from '@/hooks/admin/useAdminCoupons';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = 'subscriptions' | 'tickets' | 'coupons';

export default function AdminSubscriptionsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('subscriptions');
  const [refreshing, setRefreshing] = useState(false);

  const handleTabChange = (tab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'subscriptions') {
      await subscriptionsTab.refresh();
    } else if (activeTab === 'tickets') {
      await ticketsTab.refresh();
    } else {
      await couponsTab.refresh();
    }
    setRefreshing(false);
  };

  const subscriptionsTab = useSubscriptionsTab();
  const ticketsTab = useTicketsTab();
  const couponsTab = useCouponsTab();

  return (
    <View style={styles.container}>
      <AdminHeader />

      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segment, activeTab === 'subscriptions' && styles.segmentActive]}
          onPress={() => handleTabChange('subscriptions')}
        >
          <Text style={[styles.segmentText, activeTab === 'subscriptions' && styles.segmentTextActive]}>
            מנויים
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segment, activeTab === 'tickets' && styles.segmentActive]}
          onPress={() => handleTabChange('tickets')}
        >
          <Text style={[styles.segmentText, activeTab === 'tickets' && styles.segmentTextActive]}>
            כרטיסיות
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segment, activeTab === 'coupons' && styles.segmentActive]}
          onPress={() => handleTabChange('coupons')}
        >
          <Text style={[styles.segmentText, activeTab === 'coupons' && styles.segmentTextActive]}>
            קופונים
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {activeTab === 'subscriptions' && <SubscriptionsTab {...subscriptionsTab} />}
        {activeTab === 'tickets' && <TicketsTab {...ticketsTab} />}
        {activeTab === 'coupons' && <CouponsTab {...couponsTab} />}
      </ScrollView>
    </View>
  );
}

function useSubscriptionsTab() {
  const { fetchSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = useAdminPlans();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadPlans = async () => {
    const data = await fetchSubscriptionPlans();
    setPlans(data);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCreate = async (data: Partial<SubscriptionPlan>) => {
    await createSubscriptionPlan(data);
    setShowCreateForm(false);
    await loadPlans();
  };

  const handleUpdate = async (id: number, data: Partial<SubscriptionPlan>) => {
    await updateSubscriptionPlan(id, data);
    setExpandedId(null);
    await loadPlans();
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'מחיקת מנוי',
      'האם אתה בטוח שברצונך למחוק את המנוי?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            await deleteSubscriptionPlan(id);
            await loadPlans();
          },
        },
      ]
    );
  };

  const toggleCreateForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCreateForm(!showCreateForm);
  };

  return {
    plans,
    expandedId,
    toggleExpand,
    handleCreate,
    handleUpdate,
    handleDelete,
    showCreateForm,
    toggleCreateForm,
    refresh: loadPlans,
  };
}

function useTicketsTab() {
  const { fetchTicketPlans, createTicketPlan, updateTicketPlan, deleteTicketPlan } = useAdminPlans();
  const [plans, setPlans] = useState<TicketPlan[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadPlans = async () => {
    const data = await fetchTicketPlans();
    setPlans(data);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCreate = async (data: Partial<TicketPlan>) => {
    await createTicketPlan(data);
    setShowCreateForm(false);
    await loadPlans();
  };

  const handleUpdate = async (id: number, data: Partial<TicketPlan>) => {
    await updateTicketPlan(id, data);
    setExpandedId(null);
    await loadPlans();
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'מחיקת כרטיסייה',
      'האם אתה בטוח שברצונך למחוק את הכרטיסייה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            await deleteTicketPlan(id);
            await loadPlans();
          },
        },
      ]
    );
  };

  const toggleCreateForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCreateForm(!showCreateForm);
  };

  return {
    plans,
    expandedId,
    toggleExpand,
    handleCreate,
    handleUpdate,
    handleDelete,
    showCreateForm,
    toggleCreateForm,
    refresh: loadPlans,
  };
}

function useCouponsTab() {
  const { fetchCoupons, createCoupon, deleteCoupon } = useAdminCoupons();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadCoupons = async () => {
    const data = await fetchCoupons();
    setCoupons(data);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (data: Partial<Coupon>) => {
    await createCoupon(data);
    setShowCreateForm(false);
    await loadCoupons();
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'מחיקת קופון',
      'האם אתה בטוח שברצונך למחוק את הקופון?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            await deleteCoupon(id);
            await loadCoupons();
          },
        },
      ]
    );
  };

  const toggleCreateForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCreateForm(!showCreateForm);
  };

  return {
    coupons,
    handleCreate,
    handleDelete,
    showCreateForm,
    toggleCreateForm,
    refresh: loadCoupons,
  };
}

function SubscriptionsTab({
  plans,
  expandedId,
  toggleExpand,
  handleCreate,
  handleUpdate,
  handleDelete,
  showCreateForm,
  toggleCreateForm,
}: ReturnType<typeof useSubscriptionsTab>) {
  return (
    <View style={styles.tabContent}>
      {showCreateForm && (
        <SubscriptionPlanForm
          onSave={handleCreate}
          onCancel={toggleCreateForm}
        />
      )}

      {plans.map((plan) => (
        <SubscriptionPlanCard
          key={plan.id}
          plan={plan}
          expanded={expandedId === plan.id}
          onToggle={() => toggleExpand(plan.id)}
          onUpdate={(data) => handleUpdate(plan.id, data)}
          onDelete={() => handleDelete(plan.id)}
        />
      ))}

      <TouchableOpacity style={styles.addButton} onPress={toggleCreateForm}>
        <Ionicons name="add-circle" size={24} color={Colors.primary} />
        <Text style={styles.addButtonText}>הוסף מנוי חדש</Text>
      </TouchableOpacity>
    </View>
  );
}

function SubscriptionPlanCard({
  plan,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  plan: SubscriptionPlan;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<SubscriptionPlan>) => void;
  onDelete: () => void;
}) {
  const [formData, setFormData] = useState(plan);

  useEffect(() => {
    setFormData(plan);
  }, [plan]);

  const handleSave = () => {
    onUpdate(formData);
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.card} onPress={onToggle}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.cardTitle}>{plan.name}</Text>
            <View style={[styles.badge, plan.type === 'unlimited' ? styles.badgeUnlimited : styles.badgeLimited]}>
              <Text style={styles.badgeText}>{plan.type === 'unlimited' ? 'ללא הגבלה' : 'מוגבל'}</Text>
            </View>
          </View>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardPrice}>₪{plan.full_price_in_advance}</Text>
            <View style={[styles.statusDot, plan.is_active ? styles.statusActive : styles.statusInactive]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.collapseButton} onPress={onToggle}>
        <Ionicons name="chevron-up" size={24} color="#9CA3AF" />
      </TouchableOpacity>

      <Text style={styles.formLabel}>שם המנוי</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="שם המנוי"
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>סוג מנוי</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={[styles.radioButton, formData.type === 'unlimited' && styles.radioButtonActive]}
          onPress={() => setFormData({ ...formData, type: 'unlimited', sessions_per_week: null })}
        >
          <Text style={[styles.radioText, formData.type === 'unlimited' && styles.radioTextActive]}>
            ללא הגבלה
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, formData.type === 'limited' && styles.radioButtonActive]}
          onPress={() => setFormData({ ...formData, type: 'limited' })}
        >
          <Text style={[styles.radioText, formData.type === 'limited' && styles.radioTextActive]}>
            מוגבל
          </Text>
        </TouchableOpacity>
      </View>

      {formData.type === 'limited' && (
        <>
          <Text style={styles.formLabel}>אימונים לשבוע</Text>
          <TextInput
            style={styles.input}
            value={formData.sessions_per_week?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, sessions_per_week: parseInt(text) || 0 })}
            placeholder="מספר אימונים"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={styles.formLabel}>מחיר מלא מראש</Text>
      <TextInput
        style={styles.input}
        value={formData.full_price_in_advance?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, full_price_in_advance: parseFloat(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>מחיר לחודש (אופציונלי)</Text>
      <TextInput
        style={styles.input}
        value={formData['price-per-month']?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, 'price-per-month': text ? parseFloat(text) : null })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>תיאור</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description || ''}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="תיאור המנוי"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>הסתייגויות</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.desclaimers || ''}
        onChangeText={(text) => setFormData({ ...formData, desclaimers: text })}
        placeholder="הסתייגויות"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>קישור לתמונה</Text>
      <TextInput
        style={styles.input}
        value={formData.image_url || ''}
        onChangeText={(text) => setFormData({ ...formData, image_url: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>קישור Green Invoice</Text>
      <TextInput
        style={styles.input}
        value={formData.green_invoice_URL || ''}
        onChangeText={(text) => setFormData({ ...formData, green_invoice_URL: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>מנוי פעיל</Text>
        <Switch
          value={formData.is_active}
          onValueChange={(value) => setFormData({ ...formData, is_active: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>שמור</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteButtonText}>מחק</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SubscriptionPlanForm({
  onSave,
  onCancel,
}: {
  onSave: (data: Partial<SubscriptionPlan>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    type: 'unlimited',
    sessions_per_week: null,
    full_price_in_advance: 0,
    'price-per-month': null,
    description: '',
    desclaimers: '',
    image_url: '',
    green_invoice_URL: '',
    is_active: true,
  });

  const handleSave = () => {
    if (!formData.name || !formData.full_price_in_advance) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }
    onSave(formData);
  };

  return (
    <View style={styles.card}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>מנוי חדש</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.formLabel}>שם המנוי</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="שם המנוי"
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>סוג מנוי</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={[styles.radioButton, formData.type === 'unlimited' && styles.radioButtonActive]}
          onPress={() => setFormData({ ...formData, type: 'unlimited', sessions_per_week: null })}
        >
          <Text style={[styles.radioText, formData.type === 'unlimited' && styles.radioTextActive]}>
            ללא הגבלה
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, formData.type === 'limited' && styles.radioButtonActive]}
          onPress={() => setFormData({ ...formData, type: 'limited' })}
        >
          <Text style={[styles.radioText, formData.type === 'limited' && styles.radioTextActive]}>
            מוגבל
          </Text>
        </TouchableOpacity>
      </View>

      {formData.type === 'limited' && (
        <>
          <Text style={styles.formLabel}>אימונים לשבוע</Text>
          <TextInput
            style={styles.input}
            value={formData.sessions_per_week?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, sessions_per_week: parseInt(text) || 0 })}
            placeholder="מספר אימונים"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={styles.formLabel}>מחיר מלא מראש</Text>
      <TextInput
        style={styles.input}
        value={formData.full_price_in_advance?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, full_price_in_advance: parseFloat(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>מחיר לחודש (אופציונלי)</Text>
      <TextInput
        style={styles.input}
        value={formData['price-per-month']?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, 'price-per-month': text ? parseFloat(text) : null })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>תיאור</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description || ''}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="תיאור המנוי"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>הסתייגויות</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.desclaimers || ''}
        onChangeText={(text) => setFormData({ ...formData, desclaimers: text })}
        placeholder="הסתייגויות"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>קישור לתמונה</Text>
      <TextInput
        style={styles.input}
        value={formData.image_url || ''}
        onChangeText={(text) => setFormData({ ...formData, image_url: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>קישור Green Invoice</Text>
      <TextInput
        style={styles.input}
        value={formData.green_invoice_URL || ''}
        onChangeText={(text) => setFormData({ ...formData, green_invoice_URL: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>מנוי פעיל</Text>
        <Switch
          value={formData.is_active}
          onValueChange={(value) => setFormData({ ...formData, is_active: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>צור מנוי</Text>
      </TouchableOpacity>
    </View>
  );
}

function TicketsTab({
  plans,
  expandedId,
  toggleExpand,
  handleCreate,
  handleUpdate,
  handleDelete,
  showCreateForm,
  toggleCreateForm,
}: ReturnType<typeof useTicketsTab>) {
  return (
    <View style={styles.tabContent}>
      {showCreateForm && (
        <TicketPlanForm
          onSave={handleCreate}
          onCancel={toggleCreateForm}
        />
      )}

      {plans.map((plan) => (
        <TicketPlanCard
          key={plan.id}
          plan={plan}
          expanded={expandedId === plan.id}
          onToggle={() => toggleExpand(plan.id)}
          onUpdate={(data) => handleUpdate(plan.id, data)}
          onDelete={() => handleDelete(plan.id)}
        />
      ))}

      <TouchableOpacity style={styles.addButton} onPress={toggleCreateForm}>
        <Ionicons name="add-circle" size={24} color={Colors.primary} />
        <Text style={styles.addButtonText}>הוסף כרטיסייה חדשה</Text>
      </TouchableOpacity>
    </View>
  );
}

function TicketPlanCard({
  plan,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  plan: TicketPlan;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<TicketPlan>) => void;
  onDelete: () => void;
}) {
  const [formData, setFormData] = useState(plan);

  useEffect(() => {
    setFormData(plan);
  }, [plan]);

  const handleSave = () => {
    onUpdate(formData);
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.card} onPress={onToggle}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.cardTitle}>{plan.name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{plan.total_sessions} אימונים</Text>
            </View>
          </View>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardPrice}>₪{plan.price}</Text>
            <View style={[styles.statusDot, plan.is_active ? styles.statusActive : styles.statusInactive]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.collapseButton} onPress={onToggle}>
        <Ionicons name="chevron-up" size={24} color="#9CA3AF" />
      </TouchableOpacity>

      <Text style={styles.formLabel}>שם הכרטיסייה</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="שם הכרטיסייה"
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>מספר אימונים</Text>
      <TextInput
        style={styles.input}
        value={formData.total_sessions?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, total_sessions: parseInt(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>תוקף בימים</Text>
      <TextInput
        style={styles.input}
        value={formData.validity_days?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, validity_days: parseInt(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>מחיר</Text>
      <TextInput
        style={styles.input}
        value={formData.price?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, price: parseFloat(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>תיאור</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description || ''}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="תיאור הכרטיסייה"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>הסתייגות</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.disclaimer || ''}
        onChangeText={(text) => setFormData({ ...formData, disclaimer: text })}
        placeholder="הסתייגות"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>קישור לתמונה</Text>
      <TextInput
        style={styles.input}
        value={formData.image_url || ''}
        onChangeText={(text) => setFormData({ ...formData, image_url: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>קישור Green Invoice</Text>
      <TextInput
        style={styles.input}
        value={formData.green_invoice_URL || ''}
        onChangeText={(text) => setFormData({ ...formData, green_invoice_URL: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>למנויים חדשים בלבד</Text>
        <Switch
          value={formData.is_for_new_members_only}
          onValueChange={(value) => setFormData({ ...formData, is_for_new_members_only: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>כרטיסייה פעילה</Text>
        <Switch
          value={formData.is_active}
          onValueChange={(value) => setFormData({ ...formData, is_active: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>שמור</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteButtonText}>מחק</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TicketPlanForm({
  onSave,
  onCancel,
}: {
  onSave: (data: Partial<TicketPlan>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<TicketPlan>>({
    name: '',
    total_sessions: 0,
    validity_days: 0,
    price: 0,
    description: '',
    disclaimer: '',
    image_url: '',
    green_invoice_URL: '',
    is_for_new_members_only: false,
    is_active: true,
  });

  const handleSave = () => {
    if (!formData.name || !formData.total_sessions || !formData.price) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }
    onSave(formData);
  };

  return (
    <View style={styles.card}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>כרטיסייה חדשה</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.formLabel}>שם הכרטיסייה</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="שם הכרטיסייה"
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>מספר אימונים</Text>
      <TextInput
        style={styles.input}
        value={formData.total_sessions?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, total_sessions: parseInt(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>תוקף בימים</Text>
      <TextInput
        style={styles.input}
        value={formData.validity_days?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, validity_days: parseInt(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>מחיר</Text>
      <TextInput
        style={styles.input}
        value={formData.price?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, price: parseFloat(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>תיאור</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description || ''}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="תיאור הכרטיסייה"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>הסתייגות</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.disclaimer || ''}
        onChangeText={(text) => setFormData({ ...formData, disclaimer: text })}
        placeholder="הסתייגות"
        placeholderTextColor="#6B7280"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.formLabel}>קישור לתמונה</Text>
      <TextInput
        style={styles.input}
        value={formData.image_url || ''}
        onChangeText={(text) => setFormData({ ...formData, image_url: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>קישור Green Invoice</Text>
      <TextInput
        style={styles.input}
        value={formData.green_invoice_URL || ''}
        onChangeText={(text) => setFormData({ ...formData, green_invoice_URL: text })}
        placeholder="https://..."
        placeholderTextColor="#6B7280"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>למנויים חדשים בלבד</Text>
        <Switch
          value={formData.is_for_new_members_only}
          onValueChange={(value) => setFormData({ ...formData, is_for_new_members_only: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>כרטיסייה פעילה</Text>
        <Switch
          value={formData.is_active}
          onValueChange={(value) => setFormData({ ...formData, is_active: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>צור כרטיסייה</Text>
      </TouchableOpacity>
    </View>
  );
}

function CouponsTab({
  coupons,
  handleCreate,
  handleDelete,
  showCreateForm,
  toggleCreateForm,
}: ReturnType<typeof useCouponsTab>) {
  return (
    <View style={styles.tabContent}>
      {showCreateForm && (
        <CouponForm
          onSave={handleCreate}
          onCancel={toggleCreateForm}
        />
      )}

      {coupons.map((coupon) => (
        <CouponCard
          key={coupon.id}
          coupon={coupon}
          onDelete={() => handleDelete(coupon.id)}
        />
      ))}

      <TouchableOpacity style={styles.addButton} onPress={toggleCreateForm}>
        <Ionicons name="add-circle" size={24} color={Colors.primary} />
        <Text style={styles.addButtonText}>הוסף קופון חדש</Text>
      </TouchableOpacity>
    </View>
  );
}

function CouponCard({
  coupon,
  onDelete,
}: {
  coupon: Coupon;
  onDelete: () => void;
}) {
  const discountBadge = coupon.discount_type === 'percentage'
    ? `${coupon.discount_value}%`
    : `₪${coupon.discount_value}`;

  const usage = coupon.max_uses
    ? `${coupon.times_used}/${coupon.max_uses}`
    : 'ללא הגבלה';

  return (
    <View style={styles.card}>
      <View style={styles.couponHeader}>
        <View style={styles.couponInfo}>
          <Text style={styles.couponCode}>{coupon.code}</Text>
          <Text style={styles.couponName}>{coupon.name}</Text>
        </View>
        <View style={styles.couponRight}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{discountBadge}</Text>
          </View>
          <View style={[styles.statusDot, coupon.is_active ? styles.statusActive : styles.statusInactive]} />
        </View>
      </View>

      <View style={styles.couponFooter}>
        <Text style={styles.couponUsage}>שימושים: {usage}</Text>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CouponForm({
  onSave,
  onCancel,
}: {
  onSave: (data: Partial<Coupon>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: 0,
    max_uses: null,
    is_active: true,
    valid_from: null,
    valid_until: null,
  });

  const handleSave = () => {
    if (!formData.code || !formData.name || !formData.discount_value) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }
    onSave(formData);
  };

  return (
    <View style={styles.card}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>קופון חדש</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.formLabel}>קוד</Text>
      <TextInput
        style={styles.input}
        value={formData.code}
        onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
        placeholder="SUMMER2026"
        placeholderTextColor="#6B7280"
        autoCapitalize="characters"
      />

      <Text style={styles.formLabel}>שם הקופון</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="הנחת קיץ"
        placeholderTextColor="#6B7280"
      />

      <Text style={styles.formLabel}>סוג הנחה</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          style={[styles.radioButton, formData.discount_type === 'percentage' && styles.radioButtonActive]}
          onPress={() => setFormData({ ...formData, discount_type: 'percentage' })}
        >
          <Text style={[styles.radioText, formData.discount_type === 'percentage' && styles.radioTextActive]}>
            אחוזים
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, formData.discount_type === 'fixed' && styles.radioButtonActive]}
          onPress={() => setFormData({ ...formData, discount_type: 'fixed' })}
        >
          <Text style={[styles.radioText, formData.discount_type === 'fixed' && styles.radioTextActive]}>
            סכום קבוע
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.formLabel}>
        {formData.discount_type === 'percentage' ? 'אחוז הנחה' : 'סכום הנחה'}
      </Text>
      <TextInput
        style={styles.input}
        value={formData.discount_value?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, discount_value: parseFloat(text) || 0 })}
        placeholder="0"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <Text style={styles.formLabel}>מקסימום שימושים (אופציונלי)</Text>
      <TextInput
        style={styles.input}
        value={formData.max_uses?.toString() || ''}
        onChangeText={(text) => setFormData({ ...formData, max_uses: text ? parseInt(text) : null })}
        placeholder="ללא הגבלה"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>קופון פעיל</Text>
        <Switch
          value={formData.is_active}
          onValueChange={(value) => setFormData({ ...formData, is_active: value })}
          trackColor={{ false: '#374151', true: Colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>צור קופון</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  tabContent: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderRight: {
    flex: 1,
    gap: 8,
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  cardPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#933f78',
  },
  badgeUnlimited: {
    backgroundColor: '#059669',
  },
  badgeLimited: {
    backgroundColor: '#DC2626',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusInactive: {
    backgroundColor: '#6B7280',
  },
  collapseButton: {
    alignSelf: 'center',
    padding: 8,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'left',
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'left',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a2e',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  radioButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  radioText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  radioTextActive: {
    color: Colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  couponHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponInfo: {
    flex: 1,
    gap: 0,
    alignItems: 'flex-end',
  },
  couponCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  couponName: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'right',
  },
  couponRight: {
    alignItems: 'flex-start',
    gap: 8,
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  discountBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  couponUsage: {
    fontSize: 15,
    color: '#64748b',
  },
});
