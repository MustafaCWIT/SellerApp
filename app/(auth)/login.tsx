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

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [salesmanId, setSalesmanId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ salesmanId: '', pin: '' });

  const validate = () => {
    let valid = true;
    const newErrors = { salesmanId: '', pin: '' };

    if (!salesmanId.trim()) {
      newErrors.salesmanId = 'Delivery ID is required';
      valid = false;
    }

    if (!pin.trim()) {
      newErrors.pin = 'PIN is required';
      valid = false;
    } else if (pin.length < 4) {
      newErrors.pin = 'PIN must be at least 4 digits';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (validate()) {
      setLoading(true);
      try {
        // Call login with PIN for verification
        await login(salesmanId.trim(), '', pin);

        // Navigate to index which will route based on role
        router.replace("/");
      } catch (error: any) {
        Alert.alert(
          'Login Failed',
          error.message || 'Invalid credentials. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    } else {
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
          <Text style={styles.appTitle}>VDELIVERY</Text>
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
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            {/* <Text style={styles.instructionText}>Sign in to continue</Text> */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery ID</Text>
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
              <Text style={styles.label}>PIN Code</Text>
              <View style={[styles.inputWrapper, errors.pin && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your PIN"
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

            {/* <TouchableOpacity style={styles.forgotPin}>
            <Text style={styles.forgotPinText}>Forgot PIN?</Text>
          </TouchableOpacity> */}

            <TouchableOpacity onPress={handleLogin} activeOpacity={0.8} disabled={loading}>
              <LinearGradient
                colors={loading ? ['#999', '#777'] : ['#4caf50', '#2e7d32']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={22} color="#fff" />
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={16} color="#4caf50" />
            <Text style={styles.footerText}>Secure Login</Text>
          </View> */}

            <View style={styles.signupFooter}>
              <Text style={styles.signupFooterText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => {
                Keyboard.dismiss();
                router.replace('/(auth)/signup');
              }}>
                <Text style={styles.signupFooterLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
    height: '38%',
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
  forgotPin: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPinText: {
    color: '#4caf50',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
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
  },
  loginButtonText: {
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
    fontSize: 12,
    marginLeft: 6,
  },
  signupFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupFooterText: {
    color: '#666',
    fontSize: 14,
  },
  signupFooterLink: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;