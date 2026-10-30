import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/contexts/TranslationContext';
import { format, addDays } from 'date-fns';

interface SearchFormProps {
  onTabChange?: (tab: 'rental' | 'transfer') => void;
}

const SearchForm = ({ onTabChange }: SearchFormProps) => {
  const { t, currentLanguage } = useTranslation();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'rental' | 'transfer'>('rental');
  const [pickupDate, setPickupDate] = useState<Date>(addDays(new Date(), 1));
  const [dropoffDate, setDropoffDate] = useState<Date>(addDays(new Date(), 7));
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');

  const handleTabChange = (tab: 'rental' | 'transfer') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleSearch = () => {
    // Navigate to vehicle search with params
    navigation.navigate('VehicleSearch' as never, {
      pickupDate: format(pickupDate, 'yyyy-MM-dd'),
      dropoffDate: format(dropoffDate, 'yyyy-MM-dd'),
      pickupTime,
      dropoffTime,
    } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rental' && styles.tabActive]}
          onPress={() => handleTabChange('rental')}
        >
          <Text style={[styles.tabText, activeTab === 'rental' && styles.tabTextActive]}>
            {t('searchForm.rentalCarSearch')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transfer' && styles.tabActive]}
          onPress={() => handleTabChange('transfer')}
        >
          <Text style={[styles.tabText, activeTab === 'transfer' && styles.tabTextActive]}>
            {t('searchForm.transferSearch')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'rental' ? (
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('searchForm.pickupLocation')}</Text>
            <TouchableOpacity style={styles.input}>
              <Text style={styles.inputText}>{t('searchForm.choosePickupLocation')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('searchForm.dropOffLocation')}</Text>
            <TouchableOpacity style={styles.input}>
              <Text style={styles.inputText}>{t('searchForm.chooseDropOffLocation')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('searchForm.pickupDate')}</Text>
              <TouchableOpacity style={styles.input}>
                <Text style={styles.inputText}>{format(pickupDate, 'dd/MM/yyyy')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('searchForm.pickupTime')}</Text>
              <TouchableOpacity style={styles.input}>
                <Text style={styles.inputText}>{pickupTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('searchForm.returnDate')}</Text>
              <TouchableOpacity style={styles.input}>
                <Text style={styles.inputText}>{format(dropoffDate, 'dd/MM/yyyy')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('searchForm.returnTime')}</Text>
              <TouchableOpacity style={styles.input}>
                <Text style={styles.inputText}>{dropoffTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>{t('searchForm.searchNow')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.comingSoon}>{t('searchForm.transferSearch')} - Coming Soon</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 14,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoon: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
});

export default SearchForm;

