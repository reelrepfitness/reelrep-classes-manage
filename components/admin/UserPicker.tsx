import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal } from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { Search, X, User as UserIcon } from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

interface UserPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (user: any) => void;
}

export default function UserPicker({ visible, onClose, onSelect }: UserPickerProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const searchUsers = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, full_name, phone')
                .or(`name.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(10);

            if (!error && data) {
                setResults(data);
            }
            setLoading(false);
        };

        const timeout = setTimeout(searchUsers, 500);
        return () => clearTimeout(timeout);
    }, [query]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 }}>

                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>בחר מתאמן</Text>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4, backgroundColor: '#f4f4f5', borderRadius: 20 }}>
                            <X size={20} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 16 }}>
                        <Search size={20} color="#71717A" />
                        <TextInput
                            style={{ flex: 1, textAlign: 'right', marginRight: 8, fontSize: 16 }}
                            placeholder="חפש לפי שם, אימייל או טלפון..."
                            value={query}
                            onChangeText={setQuery}
                            autoFocus
                        />
                    </View>

                    {loading ? (
                        <Spinner size="lg" />
                    ) : (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => onSelect(item)}
                                    style={{ flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e4e4e7', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
                                        <UserIcon size={20} color="#71717A" />
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>{item.full_name || item.name}</Text>
                                        <Text style={{ fontSize: 14, color: '#71717A', textAlign: 'right' }}>{item.email}</Text>
                                        {item.phone && <Text style={{ fontSize: 12, color: '#A1A1AA', textAlign: 'right' }}>{item.phone}</Text>}
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                query.length >= 2 ? (
                                    <Text style={{ textAlign: 'center', color: '#A1A1AA', marginTop: 20 }}>לא נמצאו תוצאות</Text>
                                ) : null
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}
