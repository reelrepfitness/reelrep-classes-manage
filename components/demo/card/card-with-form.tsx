import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import React, { useState } from 'react';
import { TextInput, Alert } from 'react-native'; // הוספתי Alert לבדיקה

export function CardWithForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const borderColor = useColor('border');
  const backgroundColor = useColor('background');
  const textColor = useColor('text');

  // פונקציה לטיפול בלחיצה על התחברות
  const handleSignIn = () => {
    console.log('Signing in with:', email, password);
    // כאן תוסיף את הלוגיקה של ה-Auth שלך
    Alert.alert('Form Data', `Email: ${email}\nPassword: ${password}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ marginBottom: 8, fontWeight: '500' }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder='Enter your email'
              placeholderTextColor="#999" // אופציונלי: צבע לטקסט רקע אם לא רואים אותו טוב
              style={{
                borderWidth: 1,
                borderColor,
                borderRadius: 999,
                padding: 12,
                backgroundColor,
                color: textColor,
              }}
              keyboardType='email-address'
              autoCapitalize='none'
            />
          </View>
          <View>
            <Text style={{ marginBottom: 8, fontWeight: '500' }}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder='Enter your password'
              placeholderTextColor="#999"
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor,
                borderRadius: 999,
                padding: 12,
                backgroundColor,
                color: textColor,
              }}
            />
          </View>
        </View>
      </CardContent>
      <CardFooter>
        <Button variant='outline' onPress={() => console.log('Cancel pressed')}>
          Cancel
        </Button>
        {/* הוספתי כאן את ה-onPress */}
        <Button onPress={handleSignIn}>Sign In</Button>
      </CardFooter>
    </Card>
  );
}