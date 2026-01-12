import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

const SignupScreen = () => {
  const { signup } = useAuth();
  const router = useRouter();
  const [salesmanId, setSalesmanId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    salesmanId: '',
    fullName: '',
    email: '',
    phone: '',
    pin: '',
    confirmPin: '',
  });

  const validate = () => {
    let valid = true;
    const newErrors = {
      salesmanId: '',
      fullName: '',
      email: '',
      phone: '',
      pin: '',
      confirmPin: '',
    };

    if (!salesmanId.trim()) {
      newErrors.salesmanId = 'Delivery ID is required';
      valid = false;
    } else if (salesmanId.trim().length < 3) {
      newErrors.salesmanId = 'Delivery ID must be at least 3 characters';
      valid = false;
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
      valid = false;
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
      valid = false;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (phone.trim() && !/^[0-9]{10,11}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number (10-11 digits)';
      valid = false;
    }

    if (!pin.trim()) {
      newErrors.pin = 'PIN is required';
      valid = false;
    } else if (pin.length < 4) {
      newErrors.pin = 'PIN must be at least 4 digits';
      valid = false;
    }

    if (!confirmPin.trim()) {
      newErrors.confirmPin = 'Please confirm your PIN';
      valid = false;
    } else if (pin !== confirmPin) {
      newErrors.confirmPin = 'PINs do not match';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSignup = async () => {
    Keyboard.dismiss();
    if (validate()) {
      setLoading(true);
      try {
        // Call signup function (now async)
        await signup(
          salesmanId.trim(),
          fullName.trim(),
          email.trim() || undefined,
          phone.trim() || undefined,
          pin
        );

        Alert.alert(
          'Success',
          'Account created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(delivery)/home'),
            },
          ]
        );
      } catch (error: any) {
        Alert.alert(
          'Signup Failed',
          error.message || 'Failed to create account. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#4caf50', '#2e7d32']}
        style={styles.headerGradient}
      >
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="bicycle" size={48} color="#4caf50" />
          </View>
          <Text style={styles.appTitle}>Join VDELIVERY</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* <Text style={styles.welcomeText}>Get Started</Text>
            <Text style={styles.instructionText}>Create your account to begin</Text> */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery ID *</Text>
              <View style={[styles.inputWrapper, errors.salesmanId && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Delivery ID"
                  placeholderTextColor="#999"
                  value={salesmanId}
                  onChangeText={(text) => {
                    setSalesmanId(text);
                    if (errors.salesmanId) setErrors({ ...errors, salesmanId: '' });
                  }}
                  autoCapitalize="characters"
                />
              </View>
              {errors.salesmanId ? <Text style={styles.errorText}>{errors.salesmanId}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
                <Ionicons name="person-circle-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) setErrors({ ...errors, fullName: '' });
                  }}
                  autoCapitalize="words"
                />
              </View>
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone (Optional)</Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/[^0-9]/g, ''));
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PIN Code *</Text>
              <View style={[styles.inputWrapper, errors.pin && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a PIN (min 4 digits)"
                  placeholderTextColor="#999"
                  value={pin}
                  onChangeText={(text) => {
                    setPin(text.replace(/[^0-9]/g, ''));
                    if (errors.pin) setErrors({ ...errors, pin: '' });
                  }}
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPin ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.pin ? <Text style={styles.errorText}>{errors.pin}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm PIN *</Text>
              <View style={[styles.inputWrapper, errors.confirmPin && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your PIN"
                  placeholderTextColor="#999"
                  value={confirmPin}
                  onChangeText={(text) => {
                    setConfirmPin(text.replace(/[^0-9]/g, ''));
                    if (errors.confirmPin) setErrors({ ...errors, confirmPin: '' });
                  }}
                  keyboardType="numeric"
                  secureTextEntry={!showConfirmPin}
                  maxLength={6}
                />
                <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showConfirmPin ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPin ? <Text style={styles.errorText}>{errors.confirmPin}</Text> : null}
            </View>

            <TouchableOpacity onPress={handleSignup} activeOpacity={0.8} disabled={loading}>
              <LinearGradient
                colors={loading ? ['#999', '#777'] : ['#4caf50', '#2e7d32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signupButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={22} color="#fff" />
                    <Text style={styles.signupButtonText}>Create Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => {
                Keyboard.dismiss();
                router.replace('/(auth)/login');
              }}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* <View style={styles.securityFooter}>
              <Ionicons name="shield-checkmark" size={16} color="#4caf50" />
              <Text style={styles.securityFooterText}>Your data is secure</Text>
            </View> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  headerGradient: {
    height: '32%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  formContainer: {
    flex: 1,
    marginTop: -50,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e8ecf4',
    paddingHorizontal: 14,
    height: 54,
  },
  inputError: {
    borderColor: '#e53935',
    backgroundColor: '#fff5f5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  signupButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
  securityFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  securityFooterText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 6,
  },
});

export default SignupScreen;

