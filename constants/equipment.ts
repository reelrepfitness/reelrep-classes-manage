// Shared equipment configuration used across admin screens and workout content
export const EQUIPMENT_TABS = [
  { id: 'kettlebell', label: 'קטלבל', labelEn: 'Kettlebell', icon: require('@/assets/eqe-icons/kettlebell-icon.png') },
  { id: 'barbell', label: 'מוט', labelEn: 'Barbell', icon: require('@/assets/eqe-icons/barbell-icon.png') },
  { id: 'dumbbell', label: 'משקולת יד', labelEn: 'Dumbbell', icon: require('@/assets/eqe-icons/dumbell-icon.png') },
  { id: 'landmine', label: 'מוקש', labelEn: 'Landmine', icon: require('@/assets/eqe-icons/landmine-icon.png') },
  { id: 'bodyweight', label: 'משקל גוף', labelEn: 'BW', icon: require('@/assets/eqe-icons/BW-icon.png') },
  { id: 'cable', label: 'כבל קרוס', labelEn: 'Cable', icon: require('@/assets/eqe-icons/cable-icon.png') },
  { id: 'medicine_ball', label: 'כדור כוח', labelEn: 'Medicine Ball', icon: require('@/assets/eqe-icons/medecine-ball.png') },
  { id: 'machine', label: 'מכשיר', labelEn: 'Machine', icon: require('@/assets/eqe-icons/machine.png') },
];

export const equipmentIconMap: Record<string, any> = Object.fromEntries(
  EQUIPMENT_TABS.map(t => [t.id, t.icon])
);
