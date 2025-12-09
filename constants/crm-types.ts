// constants/crm-types.ts
// TypeScript types for CRM and Lead Management System

export type LeadStatus = 
  | 'new'               // ליד חדש שנכנס
  | 'contacted'         // יצרנו קשר
  | 'interested'        // מעוניין/ת
  | 'trial_scheduled'   // קבענו אימון ניסיון
  | 'trial_completed'   // סיים/ה אימון ניסיון
  | 'converted'         // הפך ללקוח משלם
  | 'not_interested'    // לא רלוונטי
  | 'no_response';      // לא עונה

export type LeadSource = 
  | 'direct'      // הגיע ישירות
  | 'referral'    // הופנה על ידי חבר
  | 'instagram'   // אינסטגרם
  | 'facebook'    // פייסבוק
  | 'google'      // גוגל
  | 'website'     // אתר
  | 'whatsapp'    // וואטסאפ
  | 'other';      // אחר

export type ContactMethod = 'whatsapp' | 'phone' | 'email';

export interface Lead {
  id: string;
  
  // Basic Information
  name: string;
  phone: string;
  email?: string;
  
  // Status
  status: LeadStatus;
  source: LeadSource;
  
  // Referral
  referred_by_user_id?: string;
  referral_code?: string;
  referral_plates_awarded: boolean;
  
  // Trial Class
  trial_class_date?: string;
  trial_class_completed: boolean;
  trial_class_feedback?: string;
  
  // Conversion
  converted_to_user_id?: string;
  converted_at?: string;
  
  // Contact
  preferred_contact_method: ContactMethod;
  
  // Organization
  tags: string[];
  notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_contact_at?: string;
  
  // Automation
  automation_stage: number;
  automation_paused: boolean;
  
  metadata: Record<string, any>;
}

export type InteractionType = 
  | 'whatsapp_sent'      // שלחנו הודעה בוואטסאפ
  | 'whatsapp_received'  // קיבלנו הודעה בוואטסאפ
  | 'phone_call'         // שיחת טלפון
  | 'email_sent'         // שלחנו אימייל
  | 'meeting'            // פגישה
  | 'trial_class'        // אימון ניסיון
  | 'note'               // הערה פנימית
  | 'status_change';     // שינוי סטטוס

export type InteractionOutcome = 'positive' | 'neutral' | 'negative' | 'no_response';

export interface LeadInteraction {
  id: string;
  lead_id: string;
  
  interaction_type: InteractionType;
  subject?: string;
  message?: string;
  outcome?: InteractionOutcome;
  
  is_automated: boolean;
  automation_workflow_id?: string;
  
  created_by_user_id?: string;
  created_at: string;
  
  metadata: Record<string, any>;
}

export type TriggerType = 
  | 'new_lead'          // ליד חדש נרשם
  | 'trial_scheduled'   // אימון ניסיון נקבע
  | 'trial_completed'   // אימון ניסיון הסתיים
  | 'no_response'       // לא היה מענה X ימים
  | 'conversion'        // הפך ללקוח
  | 'subscription_end'; // מנוי מסתיים

export interface AutomationWorkflow {
  id: string;
  
  name: string;
  description?: string;
  
  trigger_type: TriggerType;
  trigger_delay_hours: number;
  
  target_status?: LeadStatus;
  message_template: string;
  
  is_active: boolean;
  
  times_sent: number;
  response_rate: number;
  
  created_at: string;
  updated_at: string;
  
  metadata: Record<string, any>;
}

export interface MessageTemplate {
  id: string;
  
  name: string;
  category: string;
  message_text: string;
  
  times_used: number;
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface LeadAnalytics {
  id: string;
  date: string;
  
  new_leads: number;
  contacted_leads: number;
  trials_scheduled: number;
  trials_completed: number;
  conversions: number;
  
  contact_rate: number;
  trial_rate: number;
  conversion_rate: number;
  
  source_breakdown: Record<LeadSource, number>;
  
  created_at: string;
}

export type ReferralRewardStatus = 'pending' | 'awarded' | 'cancelled';

export interface ReferralReward {
  id: string;
  
  referrer_user_id: string;
  referred_lead_id: string;
  
  plates_awarded: number;
  reward_status: ReferralRewardStatus;
  
  awarded_at?: string;
  created_at: string;
}

// Helper types for UI components

export interface LeadWithInteractions extends Lead {
  interactions: LeadInteraction[];
  latest_interaction?: LeadInteraction;
}

export interface LeadKanbanColumn {
  status: LeadStatus;
  title: string;
  leads: Lead[];
}

export interface LeadFilters {
  status?: LeadStatus[];
  source?: LeadSource[];
  dateRange?: {
    from: string;
    to: string;
  };
  tags?: string[];
  hasTrialScheduled?: boolean;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  trial_scheduled: number;
  trial_completed: number;
  converted: number;
  conversion_rate: number;
}

// AI Assistant types

export interface AIAssistantSuggestion {
  lead_id: string;
  suggested_action: 'send_message' | 'call' | 'schedule_trial' | 'follow_up' | 'mark_not_interested';
  message_suggestion?: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIConversationSummary {
  lead_id: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  key_points: string[];
  next_steps: string[];
}
