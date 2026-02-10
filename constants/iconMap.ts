export const ICON_MAP: Record<string, { ios: string; android: string }> = {
  // Navigation
  'arrow-left': { ios: 'arrow.left', android: 'ArrowLeft' },
  'arrow-right': { ios: 'arrow.right', android: 'ArrowRight' },
  'chevron-left': { ios: 'chevron.left', android: 'ChevronLeft' },
  'chevron-right': { ios: 'chevron.right', android: 'ChevronRight' },
  'chevron-down': { ios: 'chevron.down', android: 'ChevronDown' },
  'chevron-up': { ios: 'chevron.up', android: 'ChevronUp' },
  'x': { ios: 'xmark', android: 'X' },

  // Fitness & Activity
  'dumbbell': { ios: 'dumbbell.fill', android: 'Dumbbell' },
  'trophy': { ios: 'trophy.fill', android: 'Trophy' },
  'calendar': { ios: 'calendar', android: 'Calendar' },
  'clock': { ios: 'clock', android: 'Clock' },
  'users': { ios: 'person.2.fill', android: 'Users' },
  'user': { ios: 'person.fill', android: 'User' },
  'user-check': { ios: 'person.check.fill', android: 'UserCheck' },
  'person': { ios: 'person.fill', android: 'User' },

  // Financial
  'dollar-sign': { ios: 'dollarsign.circle.fill', android: 'DollarSign' },
  'credit-card': { ios: 'creditcard.fill', android: 'CreditCard' },
  'banknote': { ios: 'banknote', android: 'Banknote' },

  // Status & Indicators
  'trending-up': { ios: 'arrow.up.right', android: 'TrendingUp' },
  'trending-down': { ios: 'arrow.down.right', android: 'TrendingDown' },
  'alert-circle': { ios: 'exclamationmark.circle.fill', android: 'AlertCircle' },
  'check-circle': { ios: 'checkmark.circle.fill', android: 'CheckCircle' },
  'checkmark-circle': { ios: 'checkmark.circle.fill', android: 'CheckCircle' },
  'x-circle': { ios: 'xmark.circle.fill', android: 'XCircle' },
  'check': { ios: 'checkmark', android: 'Check' },
  'checkmark': { ios: 'checkmark', android: 'Check' },

  // Common Actions
  'plus': { ios: 'plus', android: 'Plus' },
  'minus': { ios: 'minus', android: 'Minus' },
  'edit': { ios: 'pencil', android: 'Edit' },
  'edit-2': { ios: 'pencil', android: 'Edit' },
  'pencil': { ios: 'pencil', android: 'Edit' },
  'trash': { ios: 'trash.fill', android: 'Trash2' },
  'trash-2': { ios: 'trash.fill', android: 'Trash2' },
  'search': { ios: 'magnifyingglass', android: 'Search' },
  'filter': { ios: 'line.3.horizontal.decrease.circle', android: 'Filter' },
  'settings': { ios: 'gearshape.fill', android: 'Settings' },
  'menu': { ios: 'line.3.horizontal', android: 'Menu' },

  // Shopping & Commerce
  'shopping-bag': { ios: 'bag.fill', android: 'ShoppingBag' },
  'shopping-cart': { ios: 'cart.fill', android: 'ShoppingCart' },

  // Communication
  'mail': { ios: 'envelope.fill', android: 'Mail' },
  'phone': { ios: 'phone.fill', android: 'Phone' },
  'message': { ios: 'message.fill', android: 'MessageCircle' },

  // Media
  'image': { ios: 'photo.fill', android: 'Image' },
  'camera': { ios: 'camera.fill', android: 'Camera' },
  'video': { ios: 'video.fill', android: 'Video' },

  // Location & Maps
  'map-pin': { ios: 'mappin.circle.fill', android: 'MapPin' },
  'location': { ios: 'location.fill', android: 'MapPin' },

  // Documents
  'file': { ios: 'doc.fill', android: 'File' },
  'folder': { ios: 'folder.fill', android: 'Folder' },
  'clipboard': { ios: 'doc.on.clipboard.fill', android: 'Clipboard' },

  // Charts & Data
  'bar-chart': { ios: 'chart.bar.fill', android: 'BarChart3' },
  'pie-chart': { ios: 'chart.pie.fill', android: 'PieChart' },
  'line-chart': { ios: 'chart.xyaxis.line', android: 'LineChart' },

  // Weather & Nature
  'snowflake': { ios: 'snowflake', android: 'Snowflake' },
  'sun': { ios: 'sun.max.fill', android: 'Sun' },

  // Others
  'heart': { ios: 'heart.fill', android: 'Heart' },
  'star': { ios: 'star.fill', android: 'Star' },
  'bookmark': { ios: 'bookmark.fill', android: 'Bookmark' },
  'lock': { ios: 'lock.fill', android: 'Lock' },
  'unlock': { ios: 'lock.open.fill', android: 'Unlock' },
  'eye': { ios: 'eye.fill', android: 'Eye' },
  'eye-off': { ios: 'eye.slash.fill', android: 'EyeOff' },
  'bell': { ios: 'bell.fill', android: 'Bell' },
  'home': { ios: 'house.fill', android: 'Home' },
  'link': { ios: 'link', android: 'Link' },
  'download': { ios: 'arrow.down.circle.fill', android: 'Download' },
  'upload': { ios: 'arrow.up.circle.fill', android: 'Upload' },
  'share': { ios: 'square.and.arrow.up', android: 'Share2' },
  'more-vertical': { ios: 'ellipsis.vertical', android: 'MoreVertical' },
  'more-horizontal': { ios: 'ellipsis', android: 'MoreHorizontal' },
  'refresh': { ios: 'arrow.clockwise', android: 'RefreshCw' },
  'zap': { ios: 'bolt.fill', android: 'Zap' },
  'smartphone': { ios: 'iphone', android: 'Smartphone' },
  'gift': { ios: 'gift.fill', android: 'Gift' },
  'package': { ios: 'shippingbox.fill', android: 'Package' },
  'info': { ios: 'info.circle.fill', android: 'Info' },
  'help': { ios: 'questionmark.circle.fill', android: 'HelpCircle' },

  // Additional common icons
  'list': { ios: 'list.bullet', android: 'List' },
  'grid': { ios: 'square.grid.2x2', android: 'Grid' },
  'copy': { ios: 'doc.on.doc', android: 'Copy' },
  'save': { ios: 'square.and.arrow.down', android: 'Save' },
  'play': { ios: 'play.fill', android: 'Play' },
  'pause': { ios: 'pause.fill', android: 'Pause' },
  'stop': { ios: 'stop.fill', android: 'Square' },
  'forward': { ios: 'forward.fill', android: 'FastForward' },
  'backward': { ios: 'backward.fill', android: 'Rewind' },
  'volume': { ios: 'speaker.wave.2.fill', android: 'Volume2' },
  'volume-off': { ios: 'speaker.slash.fill', android: 'VolumeX' },
  'wifi': { ios: 'wifi', android: 'Wifi' },
  'battery': { ios: 'battery.100', android: 'Battery' },
  'activity': { ios: 'waveform.path.ecg', android: 'Activity' },
  'barbell': { ios: 'figure.strengthtraining.traditional', android: 'Dumbbell' },

  // New Dashboard Icons
  'fire': { ios: 'flame.fill', android: 'Flame' },
  'scale': { ios: 'scalemass.fill', android: 'Scale' },
  'sparkles': { ios: 'sparkles', android: 'Sparkles' },
};
