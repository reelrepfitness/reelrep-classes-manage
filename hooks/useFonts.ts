import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export function useAppFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Ploni-Regular': require('../assets/fonts/PloniRegular.otf'),
          'Ploni-Bold': require('../assets/fonts/PloniBold.otf'),
          'Ploni-Light': require('../assets/fonts/PloniLight.otf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue even if fonts fail to load
      }
    }

    loadFonts();
  }, []);

  return fontsLoaded;
}
