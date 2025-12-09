// app/admin/leads/[id].tsx
// Single Lead Detail with Interactions Timeline

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CRMManager } from '@/lib/services/crm-manager';
import { TwilioWhatsAppService } from '@/lib/services/twilio-whatsapp';
import { Lead, LeadInteraction, LeadStatus, MessageTemplate } from '@/constants/crm-types';
import colors from '@/constants/colors';

const STATUS_ACTIONS: Record<LeadStatus, { next: LeadStatus; label: string; icon: string }[]> = {
  new: [
    { next: 'contacted', label: 'סימון כיצרנו קשר', icon: 'call' },
    { next: 'interested', label: 'מעוניין/ת', icon: 'heart' },
  ],
  contacted: [
    { next: 'interested', label: 'מעוניין/ת', icon: 'heart' },
    { next: 'trial_scheduled', label: 'קביעת אימון ניסיון', icon: 'calendar' },
    { next: 'not_interested', label: 'לא רלוונטי', icon: 'close' },
  ],
  interested: [
    { next: 'trial_scheduled', label: 'קביעת אימון ניסיון', icon: 'calendar' },
  ],
  trial_scheduled: [
    { next: 'trial_completed', label: 'סיים אימון ניסיון', icon: 'checkmark' },
  ],
  trial_completed: [
    { next: 'converted', label: 'המרה ללקוח! 🎉', icon: 'trophy' },
    { next: 'interested', label: 'עדיין מעוניין/ת', icon: 'heart' },
  ],
  converted: [],
  not_interested: [],
  no_response: [
    { next: 'contacted', label: 'סימון כיצרנו קשר', icon: 'call' },
  ],
};

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    if (id) {
      loadLeadData();
      loadTemplates();
    }
  }, [id]);

  const loadLeadData = async () => {
    try {
      const data = await CRMManager.getLeadWithInteractions(id);
      setLead(data.lead);
      setInteractions(data.interactions);
    } catch (error) {
      console.error('Error loading lead:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את פרטי הליד');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    const templatesData = await CRMManager.getMessageTemplates();
    setTemplates(templatesData);
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    Alert.alert(
      'שינוי סטטוס',
      `האם לשנות את הסטטוס ל-${STATUS_ACTIONS[newStatus]?.[0]?.label || newStatus}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'שינוי',
          onPress: async () => {
            const success = await CRMManager.updateLeadStatus(id, newStatus);
            if (success) {
              await loadLeadData();
              Alert.alert('הצלחה', 'הסטטוס עודכן בהצלחה');
            } else {
              Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הסטטוס');
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !lead) return;

    try {
      const success = await CRMManager.sendWhatsAppMessage(id, messageText);
      
      if (success) {
        setMessageText('');
        setShowMessageModal(false);
        await loadLeadData();
        Alert.alert('הצלחה', 'ההודעה נשלחה בהצלחה');
      } else {
        Alert.alert('שגיאה', 'לא הצלחנו לשלוח את ההודעה');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח את ההודעה');
    }
  };

  const handleCallLead = () => {
    if (!lead) return;
    // TODO: Open phone dialer
    Alert.alert('שיחה', `מתקשר ל-${lead.phone}`);
  };

  const handleScheduleTrial = () => {
    // TODO: Open date picker and schedule trial
    Alert.alert('קביעת אימון ניסיון', 'בקרוב...');
  };

  const renderInteractionItem = (interaction: LeadInteraction) => {
    const icons: Record<string, string> = {
      whatsapp_sent: 'logo-whatsapp',
      whatsapp_received: 'logo-whatsapp',
      phone_call: 'call',
      email_sent: 'mail',
      meeting: 'people',
      trial_class: 'fitness',
      note: 'document-text',
      status_change: 'swap-horizontal',
    };

    const colors: Record<string, string> = {
      whatsapp_sent: '#25D366',
      whatsapp_received: '#128C7E',
      phone_call: '#3b82f6',
      email_sent: '#8b5cf6',
      meeting: '#ec4899',
      trial_class: '#f59e0b',
      note: '#6b7280',
      status_change: '#10b981',
    };

    return (
      <View key={interaction.id} style={styles.interactionItem}>
        <View
          style={[
            styles.interactionIcon,
            { backgroundColor: colors[interaction.interaction_type] || '#6b7280' },
          ]}
        >
          <Ionicons
            name={icons[interaction.interaction_type] as any || 'ellipse'}
            size={16}
            color="#fff"
          />
        </View>

        <View style={styles.interactionContent}>
          <View style={styles.interactionHeader}>
            <Text style={styles.interactionSubject}>
              {interaction.subject || interaction.interaction_type}
            </Text>
            <Text style={styles.interactionTime}>
              {new Date(interaction.created_at).toLocaleDateString('he-IL')}
            </Text>
          </View>

          {interaction.message && (
            <Text style={styles.interactionMessage}>{interaction.message}</Text>
          )}

          {interaction.is_automated && (
            <View style={styles.automatedBadge}>
              <Ionicons name="flash" size={12} color="#f59e0b" />
              <Text style={styles.automatedText}>אוטומטי</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMessageTemplates = () => {
    return (
      <ScrollView style={styles.templatesScroll}>
        <Text style={styles.templatesTitle}>תבניות מהירות:</Text>
        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateItem}
            onPress={() => {
              const personalizedMessage = template.message_text
                .replace(/{name}/g, lead?.name || '')
                .replace(/{phone}/g, lead?.phone || '');
              setMessageText(personalizedMessage);
            }}
          >
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templatePreview} numberOfLines={2}>
              {template.message_text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading || !lead) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>טוען...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרטי ליד</Text>
        <TouchableOpacity onPress={() => Alert.alert('עריכה', 'בקרוב...')}>
          <Ionicons name="create" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Lead Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View>
              <Text style={styles.leadName}>{lead.name}</Text>
              <Text style={styles.leadPhone}>{lead.phone}</Text>
              {lead.email && <Text style={styles.leadEmail}>{lead.email}</Text>}
            </View>

            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>{lead.source}</Text>
            </View>
          </View>

          {lead.referred_by_user_id && (
            <View style={styles.referralBanner}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.referralText}>חבר מביא חבר 🎉</Text>
            </View>
          )}

          {lead.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>הערות:</Text>
              <Text style={styles.notesText}>{lead.notes}</Text>
            </View>
          )}

          {lead.tags && lead.tags.length > 0 && (
            <View style={styles.tagsSection}>
              {lead.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>פעולות מהירות</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowMessageModal(true)}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.actionText}>שלח הודעה</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleCallLead}>
              <Ionicons name="call" size={24} color="#3b82f6" />
              <Text style={styles.actionText}>התקשר</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleScheduleTrial}
            >
              <Ionicons name="calendar" size={24} color="#f59e0b" />
              <Text style={styles.actionText}>קבע ניסיון</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Actions */}
        {STATUS_ACTIONS[lead.status] && STATUS_ACTIONS[lead.status].length > 0 && (
          <View style={styles.statusActionsCard}>
            <Text style={styles.sectionTitle}>שלב הבא</Text>
            {STATUS_ACTIONS[lead.status].map((action) => (
              <TouchableOpacity
                key={action.next}
                style={styles.statusActionButton}
                onPress={() => handleStatusChange(action.next)}
              >
                <Ionicons name={action.icon as any} size={20} color={colors.primary} />
                <Text style={styles.statusActionText}>{action.label}</Text>
                <Ionicons name="chevron-back" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Interactions Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>היסטוריית אינטראקציות</Text>

          {interactions.length === 0 ? (
            <Text style={styles.emptyText}>אין אינטראקציות עדיין</Text>
          ) : (
            interactions.map(renderInteractionItem)
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Send Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>שליחת הודעה WhatsApp</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {renderMessageTemplates()}

            <TextInput
              style={styles.messageInput}
              multiline
              numberOfLines={6}
              placeholder="כתוב הודעה..."
              value={messageText}
              onChangeText={setMessageText}
              textAlign="right"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>שלח</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leadName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 8,
    textAlign: 'right',
  },
  leadPhone: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  leadEmail: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'right',
  },
  sourceBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  referralBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  referralText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'right',
  },
  tagsSection: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 12,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  statusActionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusActionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  statusActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'right',
  },
  timelineCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 20,
  },
  interactionItem: {
    flexDirection: 'row-reverse',
    marginTop: 12,
    gap: 12,
  },
  interactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionContent: {
    flex: 1,
  },
  interactionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  interactionSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
    textAlign: 'right',
  },
  interactionTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  interactionMessage: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    textAlign: 'right',
  },
  automatedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  automatedText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
  },
  templatesScroll: {
    maxHeight: 150,
    marginBottom: 16,
  },
  templatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'right',
  },
  templateItem: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  templateName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
    marginBottom: 4,
    textAlign: 'right',
  },
  templatePreview: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlign: 'right',
    minHeight: 120,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
