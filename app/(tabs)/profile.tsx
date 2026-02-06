import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

// Profile screen has been replaced by the HomeHeader collapsible menu.
// This redirect handles any deep links that might still navigate here.
export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
}
