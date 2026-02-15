import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch, RefreshControl, LayoutAnimation, Image, ActivityIndicator, Modal, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminCoupons, CouponDetail, CouponUserAssignment, CouponPlanAssignment } from '@/hooks/admin/useAdminCoupons';
import { useAdminPlans, Plan } from '@/hooks/admin/useAdminPlans';
import UserPicker from '@/components/admin/UserPicker';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

type PlanWithType = {
  id: string;
  name: string;
  type: 'subscription' | 'ticket';
  price: number;
};

export default function CouponDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    fetchCouponDetail,
    updateCoupon,
    deleteCoupon,
    assignUser,
    removeUser,
    assignPlan,
    removePlan
  } = useAdminCoupons();

  const { fetchPlans } = useAdminPlans();

  const [coupon, setCoupon] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PlanWithType[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const loadCoupon = useCallback(async () => {
    if (!id) return;

    try {
      const data = await fetchCouponDetail(id);
      if (data) {
        setCoupon(data);
        setCode(data.code);
        setName(data.name || '');
        setDiscountType(data.discount_type);
        setDiscountValue(data.discount_value.toString());
        setMaxUses(data.max_uses ? data.max_uses.toString() : '');
        setIsActive(data.is_active);
      }
    } catch (error) {
      console.error('Error loading coupon:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את פרטי הקופון');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, fetchCouponDetail]);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const allPlans = await fetchPlans();

      const plans: PlanWithType[] = allPlans.map((p: Plan) => ({
        id: p.id,
        name: p.name,
        type: p.category as 'subscription' | 'ticket',
        price: Number(p.category === 'ticket' ? p.price_total : (p.price_upfront || p.price_per_month)),
      }));

      setAvailablePlans(plans);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת התוכניות');
    } finally {
      setLoadingPlans(false);
    }
  }, [fetchPlans]);

  useEffect(() => {
    loadCoupon();
  }, [loadCoupon]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCoupon();
  }, [loadCoupon]);

  const handleSave = async () => {
    if (!id || !code.trim() || !discountValue) {
      Alert.alert('שגיאה', 'יש למלא את כל השדות החובה');
      return;
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert('שגיאה', 'ערך הנחה לא תקין');
      return;
    }

    if (discountType === 'percentage' && value > 100) {
      Alert.alert('שגיאה', 'אחוז הנחה לא יכול להיות גדול מ-100');
      return;
    }

    const maxUsesNum = maxUses ? parseInt(maxUses) : null;
    if (maxUses && (isNaN(maxUsesNum!) || maxUsesNum! <= 0)) {
      Alert.alert('שגיאה', 'מספר שימושים לא תקין');
      return;
    }

    setSaving(true);
    try {
      await updateCoupon(id, {
        code: code.toUpperCase(),
        name: name.trim() || null,
        discount_type: discountType,
        discount_value: value,
        max_uses: maxUsesNum,
        is_active: isActive
      });

      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }

      Alert.alert('הצלחה', 'הקופון עודכן בהצלחה');
      loadCoupon();
    } catch (error) {
      console.error('Error saving coupon:', error);
      Alert.alert('שגיאה', 'לא ניתן לשמור את הקופון');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'מחיקת קופון',
      'האם אתה בטוח שברצונך למחוק את הקופון? פעולה זו לא ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;

            try {
              await deleteCoupon(id);
              Alert.alert('הצלחה', 'הקופון נמחק בהצלחה');
              router.back();
            } catch (error) {
              console.error('Error deleting coupon:', error);
              Alert.alert('שגיאה', 'לא ניתן למחוק את הקופון');
            }
          }
        }
      ]
    );
  };

  const handleAddUser = async (user: { id: string; full_name: string; email: string }) => {
    if (!id) return;

    setUserPickerVisible(false);

    try {
      await assignUser(id, user.id);
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      loadCoupon();
    } catch (error) {
      console.error('Error assigning user:', error);
      Alert.alert('שגיאה', 'לא ניתן לשייך משתמש לקופון');
    }
  };

  const handleRemoveUser = (userId: string) => {
    Alert.alert(
      'הסרת משתמש',
      'האם להסיר את המשתמש מהקופון?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;

            try {
              await removeUser(id, userId);
              if (Platform.OS === 'ios') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              }
              loadCoupon();
            } catch (error) {
              console.error('Error removing user:', error);
              Alert.alert('שגיאה', 'לא ניתן להסיר את המשתמש');
            }
          }
        }
      ]
    );
  };

  const handleAddPlan = async (plan: PlanWithType) => {
    if (!id) return;

    setPlanPickerVisible(false);

    try {
      await assignPlan(id, plan.id, plan.type);
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      loadCoupon();
    } catch (error) {
      console.error('Error assigning plan:', error);
      Alert.alert('שגיאה', 'לא ניתן לשייך תוכנית לקופון');
    }
  };

  const handleRemovePlan = (planId: string) => {
    Alert.alert(
      'הסרת תוכנית',
      'האם להסיר את התוכנית מהקופון?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;

            try {
              await removePlan(id, planId);
              if (Platform.OS === 'ios') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              }
              loadCoupon();
            } catch (error) {
              console.error('Error removing plan:', error);
              Alert.alert('שגיאה', 'לא ניתן להסיר את התוכנית');
            }
          }
        }
      ]
    );
  };

  const openPlanPicker = () => {
    loadPlans();
    setPlanPickerVisible(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="פרטי קופון" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!coupon) {
    return (
      <View style={styles.container}>
        <AdminHeader title="פרטי קופון" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>לא נמצא קופון</Text>
        </View>
      </View>
    );
  }

  const subscriptionPlans = availablePlans.filter(p => p.type === 'subscription');
  const ticketPlans = availablePlans.filter(p => p.type === 'ticket');

  return (
    <View style={styles.container}>
      <AdminHeader title="פרטי קופון" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Coupon Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי קופון</Text>

          <View style={styles.card}>
            <Text style={styles.label}>קוד</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="SAVE20"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />

            <Text style={styles.label}>שם</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="הנחה לחודש הראשון"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.label}>סוג הנחה</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioButton, discountType === 'percentage' && styles.radioButtonActive]}
                onPress={() => setDiscountType('percentage')}
              >
                <View style={[styles.radio, discountType === 'percentage' && styles.radioActive]}>
                  {discountType === 'percentage' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioText, discountType === 'percentage' && styles.radioTextActive]}>
                  אחוז (%)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioButton, discountType === 'fixed' && styles.radioButtonActive]}
                onPress={() => setDiscountType('fixed')}
              >
                <View style={[styles.radio, discountType === 'fixed' && styles.radioActive]}>
                  {discountType === 'fixed' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioText, discountType === 'fixed' && styles.radioTextActive]}>
                  סכום קבוע (₪)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>ערך הנחה</Text>
            <TextInput
              style={styles.input}
              value={discountValue}
              onChangeText={setDiscountValue}
              placeholder={discountType === 'percentage' ? '10' : '50'}
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>מקסימום שימושים (ריק = ללא הגבלה)</Text>
            <TextInput
              style={styles.input}
              value={maxUses}
              onChangeText={setMaxUses}
              placeholder="100"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>קופון פעיל</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#334155', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.usageStats}>
              <Ionicons name="bar-chart" size={20} color="#94A3B8" />
              <Text style={styles.usageText}>
                שימושים: {coupon.times_used} / {coupon.max_uses || '∞'}
              </Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>שמור שינויים</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>מחק קופון</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Assigned Users Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>משתמשים משויכים</Text>
              {coupon.users && coupon.users.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{coupon.users.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setUserPickerVisible(true)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>הוסף</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {!coupon.users || coupon.users.length === 0 ? (
              <Text style={styles.emptyText}>הקופון זמין לכל המשתמשים</Text>
            ) : (
              coupon.users.map((assignment) => (
                <View key={assignment.id} style={styles.userRow}>
                  {assignment.user?.avatar_url ? (
                    <Image
                      source={{ uri: assignment.user.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(assignment.user?.full_name || 'משתמש')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{assignment.user?.full_name || 'משתמש לא ידוע'}</Text>
                    <Text style={styles.userEmail}>{assignment.user?.email || ''}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveUser(assignment.user_id)}
                  >
                    <Ionicons name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Assigned Plans Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>תוכניות משויכות</Text>
              {coupon.plans && coupon.plans.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{coupon.plans.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openPlanPicker}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>הוסף</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {!coupon.plans || coupon.plans.length === 0 ? (
              <Text style={styles.emptyText}>הקופון תקף לכל התוכניות</Text>
            ) : (
              coupon.plans.map((assignment) => (
                <View key={assignment.id} style={styles.planRow}>
                  <View style={[
                    styles.planTypeBadge,
                    assignment.plan_type === 'subscription' ? styles.subscriptionBadge : styles.ticketBadge
                  ]}>
                    <Text style={styles.planTypeBadgeText}>
                      {assignment.plan_type === 'subscription' ? 'מנוי' : 'כרטיסייה'}
                    </Text>
                  </View>
                  <Text style={styles.planName}>{assignment.plan_name || 'תוכנית לא ידועה'}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemovePlan(assignment.plan_id)}
                  >
                    <Ionicons name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <UserPicker
        visible={userPickerVisible}
        onClose={() => setUserPickerVisible(false)}
        onSelect={handleAddUser}
      />

      <Modal
        visible={planPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPlanPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>בחר תוכנית</Text>
              <TouchableOpacity onPress={() => setPlanPickerVisible(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {loadingPlans ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {subscriptionPlans.length > 0 && (
                  <View style={styles.planGroup}>
                    <Text style={styles.planGroupTitle}>מנויים</Text>
                    {subscriptionPlans.map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={styles.planItem}
                        onPress={() => handleAddPlan(plan)}
                      >
                        <View style={[styles.planTypeBadge, styles.subscriptionBadge]}>
                          <Text style={styles.planTypeBadgeText}>מנוי</Text>
                        </View>
                        <View style={styles.planItemInfo}>
                          <Text style={styles.planItemName}>{plan.name}</Text>
                          <Text style={styles.planItemPrice}>₪{plan.price}</Text>
                        </View>
                        <Ionicons name="chevron-back" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {ticketPlans.length > 0 && (
                  <View style={styles.planGroup}>
                    <Text style={styles.planGroupTitle}>כרטיסיות</Text>
                    {ticketPlans.map((plan) => (
                      <TouchableOpacity
                        key={plan.id}
                        style={styles.planItem}
                        onPress={() => handleAddPlan(plan)}
                      >
                        <View style={[styles.planTypeBadge, styles.ticketBadge]}>
                          <Text style={styles.planTypeBadgeText}>כרטיסייה</Text>
                        </View>
                        <View style={styles.planItemInfo}>
                          <Text style={styles.planItemName}>{plan.name}</Text>
                          <Text style={styles.planItemPrice}>₪{plan.price}</Text>
                        </View>
                        <Ionicons name="chevron-back" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {availablePlans.length === 0 && (
                  <Text style={styles.emptyText}>אין תוכניות זמינות</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  radioButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioText: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 1,
  },
  radioTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  usageText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  buttonGroup: {
    marginTop: 20,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 13,
  },
  removeButton: {
    padding: 8,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  planTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subscriptionBadge: {
    backgroundColor: `${Colors.primary}20`,
  },
  ticketBadge: {
    backgroundColor: '#F59E0B20',
  },
  planTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  planGroup: {
    padding: 16,
  },
  planGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 12,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  planItemInfo: {
    flex: 1,
  },
  planItemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  planItemPrice: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
