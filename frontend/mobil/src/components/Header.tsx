import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '@/contexts/TranslationContext';
import { api } from '@/services/api';
import { Language } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBestMatchingLanguage } from '@/utils/languageMapper';
import { getApiAssetUrl } from '@/config/api';

const Header = () => {
  const { t, setCurrentLanguage, currentLanguage } = useTranslation();
  const navigation = useNavigation();
  const [logo, setLogo] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);

  useEffect(() => {
    const initializeHeader = async () => {
      try {
        const savedLanguageId = await AsyncStorage.getItem('selectedLanguageId');
        const savedLanguage = savedLanguageId
          ? JSON.parse(await AsyncStorage.getItem('selectedLanguage') || 'null')
          : null;

        const savedLanguages = await AsyncStorage.getItem('languages');
        if (savedLanguages) {
          try {
            const languagesList: Language[] = JSON.parse(savedLanguages);
            const activeLanguages = languagesList.filter(lang => lang.isActive === true);
            setLanguages(activeLanguages);

            if (savedLanguage && activeLanguages.find(l => l.id === savedLanguage.id)) {
              setSelectedLanguage(savedLanguage);
              setCurrentLanguage(savedLanguage);
            } else {
              const browserLangCode = getBestMatchingLanguage(
                activeLanguages.map(lang => ({ code: lang.code, id: lang.id }))
              );
              const browserMatchedLang = activeLanguages.find(
                lang => lang.code.toLowerCase() === browserLangCode.toLowerCase() ||
                  lang.id.toLowerCase() === browserLangCode.toLowerCase()
              );

              const defaultLang = browserMatchedLang ||
                activeLanguages.find(lang => lang.isDefault === true) ||
                activeLanguages[0];
              if (defaultLang) {
                setSelectedLanguage(defaultLang);
                setCurrentLanguage(defaultLang);
                await AsyncStorage.setItem('selectedLanguageId', defaultLang.id);
                await AsyncStorage.setItem('selectedLanguage', JSON.stringify(defaultLang));
              }
            }
            return;
          } catch (e) {
            if (__DEV__) {
              console.error('Error parsing saved languages:', e);
            }
          }
        }

        // Fetch languages
        const fetchLanguages = async () => {
          try {
            const data = await api.getLanguages();
            let languagesList: Language[] = [];

            if (Array.isArray(data)) {
              languagesList = data;
            } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
              languagesList = data.data;
            } else if (data && typeof data === 'object' && Array.isArray(data.languages)) {
              languagesList = data.languages;
            }

            const activeLanguages = languagesList.filter(lang => lang.isActive === true);
            setLanguages(activeLanguages);
            await AsyncStorage.setItem('languages', JSON.stringify(languagesList));

            const browserLangCode = getBestMatchingLanguage(
              activeLanguages.map(lang => ({ code: lang.code, id: lang.id }))
            );
            const browserMatchedLang = activeLanguages.find(
              lang => lang.code.toLowerCase() === browserLangCode.toLowerCase() ||
                lang.id.toLowerCase() === browserLangCode.toLowerCase()
            );

            const defaultLang = browserMatchedLang ||
              activeLanguages.find(lang => lang.isDefault === true) ||
              activeLanguages[0];
            if (defaultLang) {
              setSelectedLanguage(defaultLang);
              setCurrentLanguage(defaultLang);
              await AsyncStorage.setItem('selectedLanguageId', defaultLang.id);
              await AsyncStorage.setItem('selectedLanguage', JSON.stringify(defaultLang));
            }
          } catch (error) {
            console.error('Error fetching languages:', error);
          }
        };

        fetchLanguages();

        // Load tenant settings for logo and phone
        try {
          const tenantSettings = await api.getStaticData();
          if (tenantSettings?.settings) {
            const settings = tenantSettings.settings;
            if (settings.logo) {
              setLogo(getApiAssetUrl(settings.logo));
            }
            if (settings.phone) {
              setPhone(settings.phone);
            }
          }
        } catch (error) {
          console.error('Error loading tenant settings:', error);
        }
      } catch (error) {
        console.error('Error initializing header:', error);
      }
    };

    initializeHeader();
  }, []);

  const handleLanguageSelect = async (language: Language) => {
    setSelectedLanguage(language);
    setCurrentLanguage(language);
    setLanguageModalOpen(false);
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => navigation.navigate('Index' as never)}
        >
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.logoText}>Berg Rent A Car</Text>
          )}
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {phone && (
            <TouchableOpacity style={styles.phoneButton}>
              <Text style={styles.phoneText}>{phone}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setLanguageModalOpen(true)}
          >
            <Text style={styles.languageText}>
              {selectedLanguage?.code.toUpperCase() || 'EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={languageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLanguageModalOpen(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('header.selectLanguage') || 'Select Language'}</Text>
            <ScrollView>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.languageItem,
                    selectedLanguage?.id === lang.id && styles.languageItemSelected,
                  ]}
                  onPress={() => handleLanguageSelect(lang)}
                >
                  <Text
                    style={[
                      styles.languageItemText,
                      selectedLanguage?.id === lang.id && styles.languageItemTextSelected,
                    ]}
                  >
                    {lang.name} ({lang.code.toUpperCase()})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    width: 150,
    height: 40,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phoneText: {
    fontSize: 14,
    color: '#333',
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  languageItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  languageItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  languageItemText: {
    fontSize: 16,
    color: '#333',
  },
  languageItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default Header;

