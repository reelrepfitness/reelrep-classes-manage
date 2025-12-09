// lib/services/crm-manager.ts
// CRM Manager - Lead Management and Automation System

import { supabase } from '@/constants/supabase';
import {
  Lead,
  LeadStatus,
  LeadSource,
  LeadInteraction,
  InteractionType,
  AutomationWorkflow,
  MessageTemplate,
  LeadAnalytics,
  ReferralReward,
  LeadFilters,
  LeadStats,
} from '@/constants/crm-types';
import { PlatesManager } from '../plates-manager';

export class CRMManager {
  /**
   * Create a new lead
   */
  static async createLead(leadData: {
    name: string;
    phone: string;
    email?: string;
    source: LeadSource;
    referred_by_user_id?: string;
    referral_code?: string;
    tags?: string[];
    notes?: string;
  }): Promise<{ success: boolean; lead?: Lead; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email,
          source: leadData.source,
          referred_by_user_id: leadData.referred_by_user_id,
          referral_code: leadData.referral_code,
          tags: leadData.tags || [],
          notes: leadData.notes,
          status: 'new',
        })
        .select()
        .single();

      if (error) throw error;

      // Create referral reward record if this is a referral
      if (leadData.referred_by_user_id) {
        await supabase.from('referral_rewards').insert({
          referrer_user_id: leadData.referred_by_user_id,
          referred_lead_id: data.id,
          plates_awarded: 200, // כמות ה-plates שיוענקו
          reward_status: 'pending',
        });
      }

      // Trigger welcome automation
      await this.triggerAutomation(data.id, 'new_lead');

      return { success: true, lead: data };
    } catch (error: any) {
      console.error('Error creating lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all leads with optional filters
   */
  static async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.in('status', filters.status);
      }

      if (filters?.source) {
        query = query.in('source', filters.source);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from)
          .lte('created_at', filters.dateRange.to);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.hasTrialScheduled !== undefined) {
        if (filters.hasTrialScheduled) {
          query = query.not('trial_class_date', 'is', null);
        } else {
          query = query.is('trial_class_date', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting leads:', error);
      return [];
    }
  }

  /**
   * Get single lead with all interactions
   */
  static async getLeadWithInteractions(leadId: string): Promise<{
    lead: Lead | null;
    interactions: LeadInteraction[];
  }> {
    try {
      const [leadResult, interactionsResult] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).single(),
        supabase
          .from('lead_interactions')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
      ]);

      return {
        lead: leadResult.data || null,
        interactions: interactionsResult.data || [],
      };
    } catch (error) {
      console.error('Error getting lead with interactions:', error);
      return { lead: null, interactions: [] };
    }
  }

  /**
   * Update lead status
   */
  static async updateLeadStatus(
    leadId: string,
    newStatus: LeadStatus,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Record interaction
      await this.addInteraction({
        lead_id: leadId,
        interaction_type: 'status_change',
        subject: `סטטוס שונה ל: ${newStatus}`,
        message: notes,
      });

      // Trigger relevant automations
      await this.triggerAutomation(leadId, this.mapStatusToTrigger(newStatus));

      return true;
    } catch (error) {
      console.error('Error updating lead status:', error);
      return false;
    }
  }

  /**
   * Add interaction to lead
   */
  static async addInteraction(interactionData: {
    lead_id: string;
    interaction_type: InteractionType;
    subject?: string;
    message?: string;
    outcome?: string;
    is_automated?: boolean;
    created_by_user_id?: string;
  }): Promise<LeadInteraction | null> {
    try {
      const { data, error } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: interactionData.lead_id,
          interaction_type: interactionData.interaction_type,
          subject: interactionData.subject,
          message: interactionData.message,
          outcome: interactionData.outcome,
          is_automated: interactionData.is_automated || false,
          created_by_user_id: interactionData.created_by_user_id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding interaction:', error);
      return null;
    }
  }

  /**
   * Schedule trial class for lead
   */
  static async scheduleTrialClass(
    leadId: string,
    trialDate: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          trial_class_date: trialDate,
          status: 'trial_scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Add interaction
      await this.addInteraction({
        lead_id: leadId,
        interaction_type: 'trial_class',
        subject: 'אימון ניסיון נקבע',
        message: `אימון ניסיון נקבע לתאריך: ${new Date(trialDate).toLocaleDateString('he-IL')}`,
      });

      // Trigger trial reminder automation
      await this.triggerAutomation(leadId, 'trial_scheduled');

      return true;
    } catch (error) {
      console.error('Error scheduling trial class:', error);
      return false;
    }
  }

  /**
   * Mark trial as completed
   */
  static async markTrialCompleted(
    leadId: string,
    feedback?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          trial_class_completed: true,
          trial_class_feedback: feedback,
          status: 'trial_completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Add interaction
      await this.addInteraction({
        lead_id: leadId,
        interaction_type: 'trial_class',
        subject: 'אימון ניסיון הושלם',
        message: feedback || 'אימון ניסיון הושלם בהצלחה',
        outcome: 'positive',
      });

      // Trigger follow-up automation
      await this.triggerAutomation(leadId, 'trial_completed');

      return true;
    } catch (error) {
      console.error('Error marking trial completed:', error);
      return false;
    }
  }

  /**
   * Convert lead to customer
   */
  static async convertLead(
    leadId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_to_user_id: userId,
          converted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Add interaction
      await this.addInteraction({
        lead_id: leadId,
        interaction_type: 'status_change',
        subject: 'הליד הומר ללקוח!',
        message: 'הליד הפך ללקוח משלם',
        outcome: 'positive',
      });

      // Note: The referral plates will be awarded automatically by the trigger

      return true;
    } catch (error) {
      console.error('Error converting lead:', error);
      return false;
    }
  }

  /**
   * Get lead statistics
   */
  static async getLeadStats(): Promise<LeadStats> {
    try {
      const { data, error } = await supabase.from('leads').select('status');

      if (error) throw error;

      const stats = {
        total: data.length,
        new: 0,
        contacted: 0,
        interested: 0,
        trial_scheduled: 0,
        trial_completed: 0,
        converted: 0,
        conversion_rate: 0,
      };

      data.forEach((lead) => {
        switch (lead.status) {
          case 'new':
            stats.new++;
            break;
          case 'contacted':
            stats.contacted++;
            break;
          case 'interested':
            stats.interested++;
            break;
          case 'trial_scheduled':
            stats.trial_scheduled++;
            break;
          case 'trial_completed':
            stats.trial_completed++;
            break;
          case 'converted':
            stats.converted++;
            break;
        }
      });

      stats.conversion_rate =
        stats.total > 0 ? (stats.converted / stats.total) * 100 : 0;

      return stats;
    } catch (error) {
      console.error('Error getting lead stats:', error);
      return {
        total: 0,
        new: 0,
        contacted: 0,
        interested: 0,
        trial_scheduled: 0,
        trial_completed: 0,
        converted: 0,
        conversion_rate: 0,
      };
    }
  }

  /**
   * Get message templates by category
   */
  static async getMessageTemplates(category?: string): Promise<MessageTemplate[]> {
    try {
      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting message templates:', error);
      return [];
    }
  }

  /**
   * Send WhatsApp message to lead
   * This will be implemented with Twilio integration
   */
  static async sendWhatsAppMessage(
    leadId: string,
    message: string,
    templateId?: string
  ): Promise<boolean> {
    try {
      // Get lead phone
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('phone, name')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      // Replace placeholders in message
      const personalizedMessage = message
        .replace(/{name}/g, lead.name)
        .replace(/{phone}/g, lead.phone);

      // TODO: Integrate with Twilio WhatsApp API
      // For now, we'll just record the interaction
      console.log('Sending WhatsApp to:', lead.phone);
      console.log('Message:', personalizedMessage);

      // Record interaction
      await this.addInteraction({
        lead_id: leadId,
        interaction_type: 'whatsapp_sent',
        message: personalizedMessage,
      });

      // Increment template usage if template was used
      if (templateId) {
        await supabase.rpc('increment_template_usage', { template_id: templateId });
      }

      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Trigger automation workflow
   */
  static async triggerAutomation(
    leadId: string,
    triggerType: string
  ): Promise<void> {
    try {
      // Get active workflows for this trigger
      const { data: workflows, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('trigger_type', triggerType)
        .eq('is_active', true);

      if (error) throw error;

      if (!workflows || workflows.length === 0) return;

      // Get lead data
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead) return;

      // Process each workflow
      for (const workflow of workflows) {
        // Check if lead status matches target status
        if (workflow.target_status && lead.status !== workflow.target_status) {
          continue;
        }

        // Schedule message based on delay
        if (workflow.trigger_delay_hours === 0) {
          // Send immediately
          await this.sendWhatsAppMessage(leadId, workflow.message_template);
        } else {
          // TODO: Schedule for later (can use Supabase Edge Functions with cron)
          console.log(
            `Scheduling message for ${workflow.trigger_delay_hours} hours from now`
          );
        }

        // Update workflow stats
        await supabase
          .from('automation_workflows')
          .update({
            times_sent: workflow.times_sent + 1,
          })
          .eq('id', workflow.id);
      }
    } catch (error) {
      console.error('Error triggering automation:', error);
    }
  }

  /**
   * Get leads that need attention (no contact in X days)
   */
  static async getLeadsNeedingAttention(days: number = 3): Promise<Lead[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .in('status', ['new', 'contacted', 'interested'])
        .or(
          `last_contact_at.is.null,last_contact_at.lt.${cutoffDate.toISOString()}`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting leads needing attention:', error);
      return [];
    }
  }

  /**
   * Get user's referral stats
   */
  static async getUserReferralStats(userId: string): Promise<{
    total_referrals: number;
    pending_rewards: number;
    awarded_rewards: number;
    total_plates_earned: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('referrer_user_id', userId);

      if (error) throw error;

      const stats = {
        total_referrals: data.length,
        pending_rewards: data.filter((r) => r.reward_status === 'pending').length,
        awarded_rewards: data.filter((r) => r.reward_status === 'awarded').length,
        total_plates_earned: data
          .filter((r) => r.reward_status === 'awarded')
          .reduce((sum, r) => sum + r.plates_awarded, 0),
      };

      return stats;
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        total_referrals: 0,
        pending_rewards: 0,
        awarded_rewards: 0,
        total_plates_earned: 0,
      };
    }
  }

  /**
   * Helper: Map status to trigger type
   */
  private static mapStatusToTrigger(status: LeadStatus): string {
    const mapping: Record<LeadStatus, string> = {
      new: 'new_lead',
      contacted: '',
      interested: '',
      trial_scheduled: 'trial_scheduled',
      trial_completed: 'trial_completed',
      converted: 'conversion',
      not_interested: '',
      no_response: 'no_response',
    };

    return mapping[status] || '';
  }
}
