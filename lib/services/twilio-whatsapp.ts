// lib/services/twilio-whatsapp.ts
// Twilio WhatsApp Business API Integration

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // Your Twilio WhatsApp number (e.g., 'whatsapp:+14155238886')
}

interface WhatsAppMessage {
  to: string; // Recipient phone number with country code (e.g., '+972501234567')
  body: string;
  mediaUrl?: string; // Optional image/video URL
}

interface WhatsAppMessageResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export class TwilioWhatsAppService {
  private static config: TwilioConfig | null = null;

  /**
   * Initialize Twilio configuration
   * Call this once at app startup with your credentials
   */
  static initialize(config: TwilioConfig) {
    this.config = config;
  }

  /**
   * Send a WhatsApp message via Twilio
   */
  static async sendMessage(
    message: WhatsAppMessage
  ): Promise<WhatsAppMessageResponse> {
    if (!this.config) {
      return {
        success: false,
        error: 'Twilio not initialized. Call TwilioWhatsAppService.initialize() first.',
      };
    }

    try {
      // Format phone number for WhatsApp
      const toWhatsApp = message.to.startsWith('whatsapp:')
        ? message.to
        : `whatsapp:${message.to}`;

      // Prepare request body
      const body = new URLSearchParams({
        To: toWhatsApp,
        From: this.config.whatsappNumber,
        Body: message.body,
      });

      if (message.mediaUrl) {
        body.append('MediaUrl', message.mediaUrl);
      }

      // Make request to Twilio API
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
              'Basic ' +
              btoa(`${this.config.accountSid}:${this.config.authToken}`),
          },
          body: body.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send WhatsApp message');
      }

      console.log('✅ WhatsApp message sent:', data.sid);

      return {
        success: true,
        messageSid: data.sid,
      };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send message with template personalization
   */
  static async sendTemplatedMessage(
    to: string,
    template: string,
    variables: Record<string, string>,
    mediaUrl?: string
  ): Promise<WhatsAppMessageResponse> {
    // Replace all {variable} placeholders in template
    let personalizedMessage = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      personalizedMessage = personalizedMessage.replace(regex, value);
    });

    return this.sendMessage({
      to,
      body: personalizedMessage,
      mediaUrl,
    });
  }

  /**
   * Format Israeli phone number for WhatsApp
   * Converts various formats to +972XXXXXXXXX
   */
  static formatIsraeliPhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different Israeli phone formats
    if (cleaned.startsWith('972')) {
      // Already has country code
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add country code
      return '+972' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // 9 digits without leading 0
      return '+972' + cleaned;
    }

    // Default: assume it's correct
    return '+' + cleaned;
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Basic validation - adjust regex based on your needs
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Get message status
   */
  static async getMessageStatus(
    messageSid: string
  ): Promise<{
    status?: string;
    error?: string;
  }> {
    if (!this.config) {
      return { error: 'Twilio not initialized' };
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages/${messageSid}.json`,
        {
          headers: {
            Authorization:
              'Basic ' +
              btoa(`${this.config.accountSid}:${this.config.authToken}`),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get message status');
      }

      return { status: data.status };
    } catch (error: any) {
      console.error('Error getting message status:', error);
      return { error: error.message };
    }
  }
}

// Example usage:
/*

// 1. Initialize at app startup (preferably in _layout.tsx or similar)
import { TwilioWhatsAppService } from '@/lib/services/twilio-whatsapp';

TwilioWhatsAppService.initialize({
  accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
  authToken: 'YOUR_TWILIO_AUTH_TOKEN',
  whatsappNumber: 'whatsapp:+14155238886', // Your Twilio WhatsApp sandbox number
});

// 2. Send a simple message
await TwilioWhatsAppService.sendMessage({
  to: '+972501234567',
  body: 'היי! ברוך הבא ל-Reel Rep Training! 💪'
});

// 3. Send a templated message
await TwilioWhatsAppService.sendTemplatedMessage(
  '+972501234567',
  'היי {name}! האימון שלך מחר בשעה {time} 🔥',
  { name: 'יוסי', time: '18:00' }
);

// 4. Send with image
await TwilioWhatsAppService.sendMessage({
  to: '+972501234567',
  body: 'תראו את התוצאות המדהימות! 💪',
  mediaUrl: 'https://example.com/image.jpg'
});

*/
