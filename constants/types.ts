export type UserRole = 'user' | 'coach' | 'admin';

export type SubscriptionType = 'basic' | 'premium' | 'vip' | 'unlimited' | 'limited' | 'ticket';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  subscription?: UserSubscription;
  ticket?: UserTicket;
  achievements?: Achievement[];
  totalWorkouts?: number;
  weeklyGoal?: number;
  currentStreak?: number;
  stats?: {
    totalWorkouts: number;
    totalMinutes: number;
    currentStreak: number;
  };
  lateCancellations?: number;
  blockEndDate?: string;
  plateBalance?: number;
}

export interface UserSubscription {
  type: SubscriptionType;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  classesPerMonth: number;
  classesUsed: number;
}

export interface UserTicket {
  id: string;
  name: string;
  totalSessions: number;
  classesUsed: number;
  validityDays: number;
  purchaseDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'depleted';
}

export interface Workout {
  id: string;
  userId: string;
  title: string;
  date: string;
  duration: number;
  calories?: number;
  type: WorkoutType;
  exercises: Exercise[];
  notes?: string;
  heartRateAvg?: number;
  heartRateMax?: number;
  distance?: number;
}

export type WorkoutType = 
  | 'strength' 
  | 'cardio' 
  | 'yoga' 
  | 'hiit' 
  | 'pilates' 
  | 'boxing' 
  | 'dance' 
  | 'other';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
}

export interface Class {
  id: string;
  scheduleId?: string;
  classDate?: string;
  title: string;
  description: string;
  instructor: string;
  instructorImage?: string;
  date: string;
  time: string;
  duration: number;
  capacity: number;
  enrolled: number;
  type?: WorkoutType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  location: string;
  requiredSubscription: SubscriptionType[];
  enrolledAvatars?: string[];
}

export interface ClassBooking {
  id: string;
  userId: string;
  classId: string;
  bookingDate: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'waiting_list' | 'no_show';
  scheduleId?: string | null;
  classDate?: string | null;
  attendedAt?: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  name_hebrew: string;
  catagory: string | null;
  icon: string;
  description?: string | null;
  description_hebrew: string | null;
  task_requirement: number;
  points: number;
  task_type: 'total_weight' | 'challenge' | 'disapline' | 'classes_attended';
  created_at: string;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  achievement: Achievement;
  progress: number;
  completed: boolean;
  dateEarned?: string;
  isChallenge?: boolean;
  acceptedAt?: string;
}

export interface SubscriptionPackage {
  id: string;
  type: SubscriptionType;
  name: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  features: string[];
  classesPerMonth: number;
  popular?: boolean;
  durationLabel?: string;
  durationMonths?: number;
  planId?: string;
  highlight?: boolean;
  planType?: string;
  totalClasses?: number;
  expiryDays?: number;
}

export interface CartItem {
  id: string;
  package: SubscriptionPackage;
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'paypal' | 'bank_transfer';
  last4?: string;
  expiryDate?: string;
  isDefault: boolean;
}

export interface HealthMetrics {
  date: string;
  steps: number;
  activeMinutes: number;
  calories: number;
  distance: number;
  heartRateResting?: number;
  sleep?: number;
}
