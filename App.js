import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, Pattern, Line, Rect, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

const ENV_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '';
const ENV_BASE_URL = process.env.EXPO_PUBLIC_DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const ENV_MODEL = process.env.EXPO_PUBLIC_DEEPSEEK_MODEL || 'deepseek-flash';

const THINKING_PHASES = [
  'Thinking...',
  'Reviewing live vitals...',
  'Analyzing symptoms...',
  'Checking triage protocol...',
  'Coordinating specialist booking...',
];

const DARK_THEME = {
  bg: '#141414',
  card: '#080808',
  cardBorder: '#1C1C1C',
  surface: '#141414',
  surfaceAlt: '#1F1F1F',
  text: '#FFFFFF',
  textMuted: '#888888',
  textSoft: '#CCCCCC',
  accent: '#98EE00',
  accentText: '#000000',
  dockBg: '#181818',
  dockBorder: '#252525',
  dockBtn: '#232323',
  divider: '#1F1F1F',
};

const LIGHT_THEME = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  surface: '#F3F4F6',
  surfaceAlt: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  textSoft: '#374151',
  accent: '#84CC16',
  accentText: '#000000',
  dockBg: '#FFFFFF',
  dockBorder: '#E5E7EB',
  dockBtn: '#F3F4F6',
  divider: '#E5E7EB',
};

export default function App() {
  // Navigation Tabs: 'overview' | 'biometrics' | 'chat' | 'profile' | 'admin'
  const [activeTab, setActiveTab] = useState('overview');
  const [isDark, setIsDark] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [apiStatusNote, setApiStatusNote] = useState('');
  const chatScrollRef = useRef(null);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Central Reactive State
  const [patient, setPatient] = useState({
    name: 'Tafar M',
    id: '#MP-84',
    bloodType: 'Blood O+',
    age: '25 yrs',
    hr: '72',
    sleep: '5.6',
    spo2: '98',
    steps: '8.1K',
    vitalityScore: '94,8%',
  });

  const [medications, setMedications] = useState([
    { id: 'med-1', name: 'Magnesium Glycinate 400mg • Nightly', active: true },
    { id: 'med-2', name: 'Allergy: Penicillin (Mild Rash)', active: true },
  ]);
  const [newMedText, setNewMedText] = useState('');

  const [appointments, setAppointments] = useState([
    {
      id: 'apt-101',
      code: '#04-A',
      doctor: 'Dr. Elena Vance, MD',
      specialty: 'Cardiology & Internal Medicine',
      slot: 'Today, 16:30 • Room 4B',
      complaint: 'Baseline Preventive Telemetry Check',
      triageNotes: 'Patient SpO2 98%, HR 72 bpm. Sleep slightly low at 5.6 hrs.',
      risk: 'LOW',
      status: 'Scheduled',
      source: 'Synced',
    },
  ]);

  // 3x7 Organ System Matrix State (0: dark, 1: olive, 2: light, 3: outlined)
  const [matrix, setMatrix] = useState({
    Cardio: [0, 0, 3, 1, 2, 0, 1],
    Neuro: [0, 1, 0, 2, 0, 3, 2],
    'Resp.': [2, 3, 2, 3, 0, 1, 0],
  });

  // Main-Screen Conversation State
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'agent',
      text: 'Hi Tafar. Your oxygen saturation is strong at 98%, though your sleep dipped to 5.6 hours last night. Tell me how you are feeling—if anything needs a clinical diagnosis, I will book Dr. Elena Vance for you automatically.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [doctorReplyInput, setDoctorReplyInput] = useState('');

  useEffect(() => {
    if (!isThinking) {
      setThinkingIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setThinkingIdx((prev) => (prev + 1) % THINKING_PHASES.length);
    }, 850);
    return () => clearInterval(timer);
  }, [isThinking]);

  const getInitials = (fullName) => {
    const parts = (fullName || 'JM').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.slice(0, 2) || 'JM').toUpperCase();
  };

  const pickProfileImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (e) {
      // Ignore picker cancellation/errors
    }
  };

  const attachPickedAsset = (result) => {
    const asset = result?.assets?.[0];
    if (!result?.canceled && asset?.uri && asset?.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      setPendingImage({
        uri: asset.uri,
        dataUrl: `data:${mime};base64,${asset.base64}`,
      });
    }
  };

  const openChatCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera access in settings to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
      attachPickedAsset(result);
    } catch (e) {
      // Ignore camera cancellation/errors
    }
  };

  const openChatGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Gallery Permission Needed', 'Please allow photo library access in settings to choose an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
      attachPickedAsset(result);
    } catch (e) {
      // Ignore gallery cancellation/errors
    }
  };

  const pickChatImage = () => {
    Alert.alert('Attach Image', 'Choose where to get your photo from:', [
      { text: 'Take Photo (Camera)', onPress: openChatCamera },
      { text: 'Choose from Gallery', onPress: openChatGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleMatrixCell = (rowKey, colIdx) => {
    setMatrix((prev) => {
      const updated = [...prev[rowKey]];
      updated[colIdx] = (updated[colIdx] + 1) % 4;
      return { ...prev, [rowKey]: updated };
    });
  };

  const updatePatientField = (field, value) => {
    const next = { ...patient, [field]: value };
    const hrNum = parseFloat(next.hr) || 72;
    const sleepNum = parseFloat(next.sleep) || 5.6;
    const spo2Num = parseFloat(next.spo2) || 98;
    const score = Math.min(99.9, Math.max(70.0, spo2Num * 0.7 + sleepNum * 3.2 + (hrNum > 95 ? 4 : 8)))
      .toFixed(1)
      .replace('.', ',');
    next.vitalityScore = score + '%';
    setPatient(next);
  };

  const addMedication = () => {
    if (!newMedText.trim()) return;
    setMedications([
      { id: 'med-' + Date.now(), name: newMedText.trim(), active: true },
      ...medications,
    ]);
    setNewMedText('');
  };

  const toggleMedication = (id) => {
    setMedications(medications.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  };

  const deleteMedication = (id) => {
    setMedications(medications.filter((m) => m.id !== id));
  };

  const updateAppointmentStatus = (id, newStatus) => {
    const target = appointments.find((a) => a.id === id);
    setAppointments(appointments.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    if (target) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-' + Date.now(),
          sender: 'doctor',
          text: `Appointment ${target.code} (${target.slot}) updated to: ${newStatus}.`,
        },
      ]);
    }
  };

  const deleteAppointment = (id) => {
    setAppointments(appointments.filter((a) => a.id !== id));
  };

  const callDeepSeek = async (apiKey, modelName, systemPrompt, historyMsgs, userQuery, imageDataUrl) => {
    const endpoint = `${ENV_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
    const userContent = imageDataUrl
      ? [
          { type: 'text', text: userQuery },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]
      : userQuery;

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMsgs,
          { role: 'user', content: userContent },
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
      }),
    });
  };

  const sendSymptomMessage = async (overrideText) => {
    const rawText = (overrideText !== undefined ? overrideText : chatInput).trim();
    const imageToSend = overrideText !== undefined ? null : pendingImage;
    if ((!rawText && !imageToSend) || isThinking) return;

    const query = rawText || 'Please analyze this medical image.';
    setChatInput('');
    setPendingImage(null);
    setApiStatusNote('');

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: rawText || 'Uploaded medical image',
      imageUri: imageToSend?.uri || null,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsThinking(true);

    let decision = null;
    const activeKey = ENV_API_KEY.trim();

    if (activeKey) {
      const activeMeds = medications
        .filter((m) => m.active)
        .map((m) => m.name)
        .join('; ');
      const systemPrompt = `You are MediPulse AI, a clinical triage & wellness assistant. Patient: ${patient.name} (${patient.age}, ${patient.bloodType}), HR ${patient.hr} bpm, Sleep ${patient.sleep}h, SpO2 ${patient.spo2}%, Vitality ${patient.vitalityScore}. Active meds/allergies: ${activeMeds || 'None'}. Respond ONLY with valid JSON: {"reply":"concise helpful clinical guidance","risk_level":"LOW|MODERATE|HIGH","should_book_doctor":boolean,"booking_payload":{"doctor_name":"Dr. Elena Vance, MD","specialty":"Cardiology & Internal Medicine","slot":"Immediate Tele-Consult","chief_complaint":"string","ai_triage_notes":"string"}}`;

      const historyMsgs = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      try {
        const res = await callDeepSeek(
          activeKey,
          ENV_MODEL,
          systemPrompt,
          historyMsgs,
          query,
          imageToSend?.dataUrl
        );
        if (res.ok) {
          const data = await res.json();
          const rawContent = (data?.choices?.[0]?.message?.content || '')
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          decision = JSON.parse(rawContent);
        } else {
          setApiStatusNote(`API error (${res.status}) — using local triage`);
        }
      } catch (e) {
        setApiStatusNote('Network/parse issue — using local triage');
      }
    }

    if (!decision) {
      await new Promise((r) => setTimeout(r, 500));
      const lower = query.toLowerCase();
      const needsDoc =
        lower.includes('chest') ||
        lower.includes('dizzy') ||
        lower.includes('migraine') ||
        lower.includes('vision') ||
        lower.includes('pain') ||
        lower.includes('doctor') ||
        lower.includes('fever');

      if (needsDoc) {
        decision = {
          reply: `Given your symptoms alongside a ${patient.sleep}h sleep deficit, immediate physician evaluation is recommended. I have booked Dr. Elena Vance and forwarded your live telemetry.`,
          risk_level: 'HIGH',
          should_book_doctor: true,
          booking_payload: {
            doctor_name: 'Dr. Elena Vance, MD',
            specialty: 'Cardiology & Acute Triage',
            slot: 'Immediate Tele-Consult • Live Queue',
            chief_complaint: query,
            ai_triage_notes: `Auto-escalated by MediPulse AI. HR ${patient.hr} bpm, SpO2 ${patient.spo2}%, Sleep ${patient.sleep}h.`,
          },
        };
      } else {
        decision = {
          reply: `Your oxygen saturation (${patient.spo2}%) and heart rate (${patient.hr} bpm) remain stable. Prioritize hydration and rest tonight—if you develop chest tightness, dizziness, or pain, tell me and I will auto-book your doctor.`,
          risk_level: 'LOW',
          should_book_doctor: false,
        };
      }
    }

    setIsThinking(false);

    let createdApt = null;
    if (decision.should_book_doctor && decision.booking_payload) {
      createdApt = {
        id: 'apt-' + Date.now(),
        code: '#0' + (appointments.length + 4) + '-AI',
        doctor: decision.booking_payload.doctor_name || 'Dr. Elena Vance, MD',
        specialty: decision.booking_payload.specialty || 'Cardiology & Triage',
        slot: decision.booking_payload.slot || 'Immediate Tele-Consult',
        complaint: decision.booking_payload.chief_complaint || query,
        triageNotes: decision.booking_payload.ai_triage_notes,
        risk: decision.risk_level || 'HIGH',
        status: 'Auto-Booked',
        source: 'AI Auto-Booked',
      };
      setAppointments((prev) => [createdApt, ...prev]);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + (Date.now() + 1),
        sender: 'agent',
        text: decision.reply,
        risk: decision.risk_level,
        bookedApt: createdApt,
      },
    ]);
  };

  const sendDoctorLiveReply = () => {
    if (!doctorReplyInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'doctor',
        text: doctorReplyInput.trim(),
      },
    ]);
    setDoctorReplyInput('');
    setActiveTab('chat');
  };

  const topApt = appointments[0];
  const isOverviewActive = activeTab === 'overview' || activeTab === 'biometrics';
  const isProfileActive = activeTab === 'profile';

  const cardStyle = [
    styles.obsidianCard,
    { backgroundColor: theme.card, borderColor: theme.cardBorder },
  ];
  const inputStyle = [
    styles.crudInput,
    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
  ];

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const swipeBackResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        activeTabRef.current !== 'overview' &&
        gestureState.dx > 18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
      onPanResponderRelease: (_, gestureState) => {
        if (activeTabRef.current !== 'overview' && gestureState.dx > 60) {
          setIsEditingProfile(false);
          setActiveTab('overview');
        }
      },
    })
  ).current;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        {...swipeBackResponder.panHandlers}
        style={[styles.safeArea, { backgroundColor: theme.bg }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.bg}
        />

        {/* SCREEN 1: HEALTH OVERVIEW */}
        {activeTab === 'overview' && (
          <ScrollView
            style={styles.screenScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 115 }}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.greetingTitle, { color: theme.text }]}>
                  Hi, {patient.name.split(' ')[0]}!
                </Text>
                <Text style={[styles.greetingSub, { color: theme.textMuted }]}>
                  ID {patient.id} • {patient.bloodType} • {patient.age}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setActiveTab('biometrics')}
                  style={[styles.iconCircleBtn, { backgroundColor: theme.surfaceAlt }]}
                >
                  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={theme.text} strokeWidth="1.9" />
                    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={theme.text} strokeWidth="1.9" />
                    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={theme.text} strokeWidth="1.9" />
                    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={theme.text} strokeWidth="1.9" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('admin')}
                  style={[styles.iconCircleBtn, { backgroundColor: theme.surfaceAlt }]}
                >
                  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                      stroke={theme.text}
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  {appointments.length > 0 && (
                    <View style={[styles.notifBadge, { backgroundColor: theme.accent }]}>
                      <Text style={styles.notifBadgeText}>{appointments.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('profile')}
                  style={[styles.avatarBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}
                >
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarBtnImg} />
                  ) : (
                    <Text style={[styles.avatarBtnText, { color: isDark ? theme.accent : theme.text }]}>
                      {getInitials(patient.name)}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.bigSectionTitle, { color: theme.text }]}>Health Overview</Text>

            <View style={cardStyle}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[styles.cardMutedLabel, { color: theme.textMuted }]}>Vitality Score</Text>
                  <Text style={[styles.heroStatText, { color: theme.text }]}>{patient.vitalityScore}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveTab('profile')}
                  style={[styles.pillBtnMuted, { backgroundColor: theme.surfaceAlt }]}
                >
                  <Text style={[styles.pillBtnMutedText, { color: theme.textSoft }]}>30 Days</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calloutWrap}>
                <View>
                  <Text style={[styles.calloutLime, { color: theme.accent }]}>+18%</Text>
                  <Text style={[styles.calloutSub, { color: theme.textMuted }]}>better than last month</Text>
                </View>
                <View style={[styles.dottedLine, { backgroundColor: theme.divider }]} />
              </View>

              <View style={styles.barsContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setActiveTab('chat');
                    sendSymptomMessage('Analyze my Heart Rate of ' + patient.hr + ' bpm.');
                  }}
                  style={[styles.barItem, { height: 108, backgroundColor: isDark ? '#171717' : '#E5E7EB', overflow: 'hidden' }]}
                >
                  <View style={styles.barPillLight}>
                    <Text style={styles.barPillLightText}>↗ {patient.hr}bp</Text>
                  </View>
                  <Text style={[styles.barCaptionMuted, { color: isDark ? '#888' : '#374151' }]}>Heart</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setActiveTab('chat');
                    sendSymptomMessage('My sleep is ' + patient.sleep + 'h, how can I recover?');
                  }}
                  style={[styles.barItem, { height: 82, backgroundColor: '#A6A6A6' }]}
                >
                  <View style={styles.barPillLight}>
                    <Text style={styles.barPillLightText}>↙ {patient.sleep}h</Text>
                  </View>
                  <Text style={[styles.barCaptionMuted, { color: '#111' }]}>Sleep</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setActiveTab('chat');
                    sendSymptomMessage('Review my Blood Oxygen SpO2 at ' + patient.spo2 + '%.');
                  }}
                  style={[styles.barItem, { height: 192, backgroundColor: isDark ? '#F5F5F5' : '#111827', overflow: 'hidden' }]}
                >
                  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Defs>
                      <Pattern id="diagLight" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <Line x1="0" y1="0" x2="0" y2="10" stroke={isDark ? '#E2E2E2' : '#1F2937'} strokeWidth="4" />
                      </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#diagLight)" />
                  </Svg>
                  <View style={isDark ? styles.barPillDark : styles.barPillLight}>
                    <Text style={isDark ? styles.barPillDarkText : styles.barPillLightText}>↗ {patient.spo2}%</Text>
                  </View>
                  <Text style={[styles.barCaptionMuted, { color: isDark ? '#111' : '#FFF', fontWeight: '600' }]}>SpO2</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('biometrics')}
                  style={[styles.barItem, { height: 138, backgroundColor: '#484848' }]}
                >
                  <View style={styles.barPillLight}>
                    <Text style={styles.barPillLightText}>↙ {patient.steps}</Text>
                  </View>
                  <Text style={[styles.barCaptionMuted, { color: '#EEE' }]}>Active</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[cardStyle, { marginTop: 16 }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>AI Triage & Care Status</Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('biometrics')}
                  style={[styles.limeCircleArrow, { backgroundColor: theme.accent }]}
                >
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>↗</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: isDark ? '#262626' : '#D1D5DB' }]} />
                  <Text style={[styles.legendText, { color: theme.textSoft }]}>Vitals</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#555555' }]} />
                  <Text style={[styles.legendText, { color: theme.textSoft }]}>Records</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: isDark ? '#E5E5E5' : '#111827' }]} />
                  <Text style={[styles.legendText, { color: theme.textSoft }]}>
                    {topApt ? topApt.status : 'AI Standby'}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: 'center', marginTop: 16 }}>
                <Svg width={260} height={130} viewBox="0 0 220 115">
                  <Path
                    d="M 22 105 A 88 88 0 0 1 46 44"
                    fill="none"
                    stroke={isDark ? '#E5E5E5' : '#111827'}
                    strokeWidth="24"
                    strokeLinecap="round"
                  />
                  <Path d="M 55 36 A 88 88 0 0 1 138 26" fill="none" stroke="#6B7280" strokeWidth="24" />
                  <Path
                    d="M 145 29 A 88 88 0 0 1 198 105"
                    fill="none"
                    stroke={isDark ? '#1E1E1E' : '#E5E7EB'}
                    strokeWidth="24"
                    strokeLinecap="round"
                  />
                </Svg>
                <Text style={[styles.gaugeBadgeText, { color: theme.textMuted }]}>
                  {topApt ? `${topApt.code} • ${topApt.status}` : 'AI Ready'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setActiveTab('chat')}
                style={[styles.homeAiBanner, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
              >
                <Text style={{ color: isDark ? theme.accent : theme.text, fontSize: 12.5, fontWeight: '600' }}>
                  ✦ Ask AI Care
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>Symptom check & triage →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* SCREEN 2: CLINICAL BIOMETRICS */}
        {activeTab === 'biometrics' && (
          <ScrollView
            style={styles.screenScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 115 }}
          >
            <View style={[styles.rowBetween, { marginBottom: 14 }]}>
              <TouchableOpacity
                onPress={() => setActiveTab('overview')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '500' }}>Clinical Biometrics</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>Tap circle to cycle</Text>
            </View>

            <View style={cardStyle}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Organ System Matrix</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.pillBtnOutline, { borderColor: theme.cardBorder }]}>
                    <Text style={{ color: theme.textSoft, fontSize: 11 }}>Weekly ⌄</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveTab('admin')}
                    style={[styles.outlineCircleArrow, { borderColor: theme.cardBorder }]}
                  >
                    <Text style={{ color: theme.text, fontSize: 12 }}>⋯</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.rowBetween, { marginTop: 14 }]}>
                <View>
                  <Text style={{ color: theme.text, fontSize: 28, fontWeight: '600' }}>98.4°F</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>Core Baseline</Text>
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>● Optimal   ● Elevated</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>○ Peak        ◌ Rest</Text>
                </View>
              </View>

              <View style={{ marginTop: 18, gap: 10 }}>
                {Object.keys(matrix).map((rowName) => (
                  <View key={rowName} style={styles.rowBetween}>
                    <Text style={{ color: theme.textMuted, fontSize: 11, width: 52 }}>{rowName}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {matrix[rowName].map((cellState, idx) => {
                        const bgMap = isDark
                          ? ['#242424', '#5A6638', '#D6D6D6', '#383838']
                          : ['#E5E7EB', '#84CC16', '#374151', '#D1D5DB'];
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => toggleMatrixCell(rowName, idx)}
                            style={[
                              styles.matrixCircle,
                              {
                                backgroundColor: bgMap[cellState],
                                borderWidth: cellState === 3 ? 1.5 : 0,
                                borderColor: theme.textMuted,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                ))}
                <View style={[styles.rowBetween, { paddingTop: 4 }]}>
                  <View style={{ width: 52 }} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <Text key={i} style={{ width: 26, textAlign: 'center', color: theme.textMuted, fontSize: 10 }}>
                        {d}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={[cardStyle, { marginTop: 14 }]}>
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.textSoft, fontSize: 15 }}>
                  {topApt ? topApt.doctor : 'Doctor Triage Queue'}
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('admin')}
                  style={[styles.outlineCircleArrow, { borderColor: theme.cardBorder }]}
                >
                  <Text style={{ color: theme.text, fontSize: 13 }}>↗</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 14 }}>
                <Text style={{ color: theme.text, fontSize: 33, fontWeight: '600' }}>
                  {topApt ? topApt.code : 'Clear'}
                </Text>
                <View>
                  <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                    {topApt ? topApt.status : '0 Pending'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    {topApt ? topApt.slot : 'Auto-books on alert'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setActiveTab('chat')}
              style={[cardStyle, { marginTop: 14, minHeight: 155, justifyContent: 'space-between' }]}
            >
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.text, fontSize: 17, maxWidth: 210, lineHeight: 23 }}>
                  Autonomous Doctor Dispatch & Care
                </Text>
                <View style={[styles.outlineCircleArrow, { borderColor: theme.cardBorder }]}>
                  <Text style={{ color: theme.text, fontSize: 13 }}>↗</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}>
                <View style={{ backgroundColor: theme.surfaceAlt, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
                  <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>24/7</Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>instant specialist handoff</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* SCREEN 3: AI CARE CONVERSATION */}
        {activeTab === 'chat' && (
          <KeyboardAvoidingView
            style={{ flex: 1, paddingHorizontal: 18 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.rowBetween, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
              <TouchableOpacity
                onPress={() => setActiveTab('overview')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>AI Care Assistant</Text>
              </TouchableOpacity>
            </View>

            {!!apiStatusNote && (
              <Text style={{ color: '#F59E0B', fontSize: 10.5, marginTop: 6 }}>{apiStatusNote}</Text>
            )}

            <ScrollView
              ref={chatScrollRef}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 16, gap: 18 }}
            >
              {messages.map((m) => {
                if (m.sender === 'user') {
                  return (
                    <View key={m.id} style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10, marginBottom: 4 }}>You</Text>
                      <View style={[styles.userBubble, { backgroundColor: theme.accent }]}>
                        {m.imageUri && (
                          <Image source={{ uri: m.imageUri }} style={styles.chatMsgImage} />
                        )}
                        <Text style={{ color: '#000', fontSize: 14, fontWeight: '500' }}>{m.text}</Text>
                      </View>
                    </View>
                  );
                }
                if (m.sender === 'doctor') {
                  return (
                    <View style={[styles.doctorStreamBlock, { borderLeftColor: theme.accent }]}>
                      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>
                        DR. ELENA VANCE, MD • LIVE PHYSICIAN
                      </Text>
                      <Text style={{ color: theme.text, fontSize: 14, marginTop: 4, lineHeight: 20 }}>{m.text}</Text>
                    </View>
                  );
                }
                return (
                  <View key={m.id} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.agentSparkle, { backgroundColor: theme.accent }]}>
                        <Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>✦</Text>
                      </View>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>MediPulse AI</Text>
                      {m.risk && (
                        <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>• {m.risk}</Text>
                      )}
                    </View>
                    <Text style={{ color: theme.text, fontSize: 14.5, lineHeight: 22, paddingLeft: 22 }}>
                      {m.text}
                    </Text>
                    {m.bookedApt && (
                      <View style={[styles.inlineBookedBanner, { borderLeftColor: theme.accent }]}>
                        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>
                          ⚡ AUTONOMOUS DOCTOR BOOKING EXECUTED
                        </Text>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                          {m.bookedApt.doctor} • {m.bookedApt.code}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>{m.bookedApt.slot}</Text>
                        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                          <TouchableOpacity onPress={() => setActiveTab('profile')}>
                            <Text style={{ color: theme.accent, fontSize: 11, textDecorationLine: 'underline' }}>
                              View in Profile
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setActiveTab('admin')}>
                            <Text style={{ color: theme.textSoft, fontSize: 11, textDecorationLine: 'underline' }}>
                              Open Doctor Admin →
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
              {isThinking && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 22 }}>
                  <View style={[styles.thinkingDot, { backgroundColor: theme.accent }]} />
                  <Text style={{ color: theme.accent, fontSize: 12.5, fontWeight: '500' }}>
                    {THINKING_PHASES[thinkingIdx]}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={{ paddingBottom: 16, paddingTop: 6 }}>
              {pendingImage && (
                <View style={styles.pendingImgWrap}>
                  <Image source={{ uri: pendingImage.uri }} style={styles.pendingImgThumb} />
                  <TouchableOpacity
                    onPress={() => setPendingImage(null)}
                    style={styles.pendingImgRemove}
                  >
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={[styles.chatInputBar, { backgroundColor: theme.surfaceAlt }]}>
                <TouchableOpacity onPress={pickChatImage} style={styles.chatAttachBtn}>
                  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                    <Rect x="3" y="5" width="18" height="14" rx="3" stroke={theme.textMuted} strokeWidth="1.9" />
                    <Circle cx="8.5" cy="10" r="1.5" fill={theme.textMuted} />
                    <Path
                      d="M4 17l5-4.5 3.5 3 4-4 4.5 5.5"
                      stroke={theme.textMuted}
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Describe how you feel or attach an image..."
                  placeholderTextColor={theme.textMuted}
                  style={[styles.chatTextInput, { color: theme.text }]}
                  onSubmitEditing={() => sendSymptomMessage()}
                />
                <TouchableOpacity
                  onPress={() => sendSymptomMessage()}
                  style={[styles.chatSendBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* SCREEN 4: CLEAN VERTICAL MINIMAL PROFILE */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.screenScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 115 }}
          >
            {/* Top Bar */}
            <View style={styles.rowBetween}>
              <TouchableOpacity
                onPress={() => {
                  setIsEditingProfile(false);
                  setActiveTab('overview');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '500' }}>Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Centered Vertical Hero */}
            <View style={styles.profileHeroCenter}>
              <TouchableOpacity
                onPress={isEditingProfile ? pickProfileImage : undefined}
                activeOpacity={isEditingProfile ? 0.7 : 1}
                style={[styles.profileHeroAvatar, { backgroundColor: theme.card, borderColor: theme.accent }]}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileHeroAvatarImg} />
                ) : (
                  <Text style={[styles.profileHeroInitials, { color: isDark ? theme.accent : theme.text }]}>
                    {getInitials(patient.name)}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setIsEditingProfile((prev) => !prev)}
                  style={
                    isEditingProfile
                      ? [styles.editDoneBtn, { backgroundColor: theme.accent }]
                      : [styles.pillBtnMuted, { backgroundColor: theme.surfaceAlt }]
                  }
                >
                  <Text
                    style={
                      isEditingProfile
                        ? styles.editDoneBtnText
                        : [styles.pillBtnMutedText, { color: theme.textSoft }]
                    }
                  >
                    {isEditingProfile ? 'Done' : 'Edit Profile'}
                  </Text>
                </TouchableOpacity>
                {isEditingProfile && (
                  <TouchableOpacity
                    onPress={pickProfileImage}
                    style={[styles.pillBtnMuted, { backgroundColor: theme.surfaceAlt }]}
                  >
                    <Text style={{ color: theme.text, fontSize: 11.5, fontWeight: '600' }}>
                      {profileImage ? 'Change Photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isEditingProfile && profileImage && (
                  <TouchableOpacity
                    onPress={() => setProfileImage(null)}
                    style={[styles.pillBtnMuted, { backgroundColor: theme.surfaceAlt }]}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 11.5, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.profileHeroName, { color: theme.text }]}>
                {patient.name || 'Patient'}
              </Text>
              <Text style={[styles.profileHeroMeta, { color: theme.textMuted }]}>
                {patient.id} • {patient.bloodType} • {patient.age}
              </Text>

              {/* Minimal Vertical/Column Vitals Strip */}
              <View style={[styles.minimalVitalsRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.minimalVitalCell}>
                  <Text style={[styles.minimalVitalVal, { color: theme.text }]}>{patient.hr}</Text>
                  <Text style={[styles.minimalVitalLbl, { color: theme.textMuted }]}>BPM</Text>
                </View>
                <View style={[styles.minimalDividerV, { backgroundColor: theme.divider }]} />
                <View style={styles.minimalVitalCell}>
                  <Text style={[styles.minimalVitalVal, { color: theme.text }]}>{patient.sleep}h</Text>
                  <Text style={[styles.minimalVitalLbl, { color: theme.textMuted }]}>Sleep</Text>
                </View>
                <View style={[styles.minimalDividerV, { backgroundColor: theme.divider }]} />
                <View style={styles.minimalVitalCell}>
                  <Text style={[styles.minimalVitalVal, { color: theme.accent }]}>{patient.spo2}%</Text>
                  <Text style={[styles.minimalVitalLbl, { color: theme.textMuted }]}>SpO2</Text>
                </View>
              </View>
            </View>

            {/* Edit Profile Vertical Form (shown only in Edit mode) */}
            {isEditingProfile && (
              <View style={[cardStyle, { marginTop: 18, gap: 12 }]}>
                <Text style={[styles.minimalSectionTitle, { color: theme.textMuted }]}>EDIT DETAILS</Text>
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Full Name</Text>
                  <TextInput
                    value={patient.name}
                    onChangeText={(v) => updatePatientField('name', v)}
                    style={inputStyle}
                    placeholder="Patient Name"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Blood Type</Text>
                    <TextInput
                      value={patient.bloodType}
                      onChangeText={(v) => updatePatientField('bloodType', v)}
                      style={inputStyle}
                      placeholder="Blood Type"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Age</Text>
                    <TextInput
                      value={patient.age}
                      onChangeText={(v) => updatePatientField('age', v)}
                      style={inputStyle}
                      placeholder="Age"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Heart (bpm)</Text>
                    <TextInput
                      value={patient.hr}
                      onChangeText={(v) => updatePatientField('hr', v)}
                      keyboardType="numeric"
                      style={inputStyle}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Sleep (hrs)</Text>
                    <TextInput
                      value={patient.sleep}
                      onChangeText={(v) => updatePatientField('sleep', v)}
                      keyboardType="numeric"
                      style={inputStyle}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>SpO2 (%)</Text>
                    <TextInput
                      value={patient.spo2}
                      onChangeText={(v) => updatePatientField('spo2', v)}
                      keyboardType="numeric"
                      style={inputStyle}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Minimal Vertical Settings: Theme Switch */}
            <View style={[cardStyle, { marginTop: 18, paddingVertical: 14 }]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '500' }}>Light Theme</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11.5, marginTop: 2 }}>
                    {isDark ? 'Dark mode active' : 'Light mode active'}
                  </Text>
                </View>
                <Switch
                  value={!isDark}
                  onValueChange={(val) => setIsDark(!val)}
                  trackColor={{ false: '#333', true: theme.accent }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            {/* Minimal Vertical Appointments List */}
            <View style={[cardStyle, { marginTop: 14 }]}>
              <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                <Text style={[styles.minimalSectionTitle, { color: theme.textMuted }]}>APPOINTMENTS</Text>
                <TouchableOpacity onPress={() => setActiveTab('admin')}>
                  <Text style={{ color: isDark ? theme.accent : theme.text, fontSize: 11.5, fontWeight: '600' }}>
                    Doctor Portal →
                  </Text>
                </TouchableOpacity>
              </View>
              {appointments.length === 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 12.5 }}>
                  No upcoming visits scheduled.
                </Text>
              ) : (
                appointments.map((a, idx) => (
                  <View
                    key={a.id}
                    style={[
                      styles.minimalListRow,
                      idx > 0 && { borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: 12, marginTop: 12 },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13.5 }}>{a.doctor}</Text>
                      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>
                        {a.code} • {a.status}
                      </Text>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 3 }}>{a.complaint}</Text>
                    <View style={[styles.rowBetween, { marginTop: 6 }]}>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{a.slot}</Text>
                      <TouchableOpacity onPress={() => deleteAppointment(a.id)}>
                        <Text style={{ color: '#EF4444', fontSize: 11.5 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Minimal Vertical Medications & Allergies */}
            <View style={[cardStyle, { marginTop: 14 }]}>
              <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                <Text style={[styles.minimalSectionTitle, { color: theme.textMuted }]}>MEDICATIONS & ALLERGIES</Text>
                <TouchableOpacity onPress={() => setShowAddMed((prev) => !prev)}>
                  <Text style={{ color: isDark ? theme.accent : theme.text, fontSize: 12, fontWeight: '600' }}>
                    {showAddMed ? 'Close' : '+ Add'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showAddMed && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TextInput
                    value={newMedText}
                    onChangeText={setNewMedText}
                    placeholder="Add medication or allergy..."
                    placeholderTextColor={theme.textMuted}
                    style={[inputStyle, { flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      addMedication();
                      setShowAddMed(false);
                    }}
                    style={[styles.crudAddBtn, { backgroundColor: theme.accent }]}
                  >
                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
              {medications.length === 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>No records added.</Text>
              ) : (
                medications.map((m, idx) => (
                  <View
                    key={m.id}
                    style={[
                      styles.rowBetween,
                      { paddingVertical: 8 },
                      idx > 0 && { borderTopWidth: 1, borderTopColor: theme.divider },
                    ]}
                  >
                    <TouchableOpacity onPress={() => toggleMedication(m.id)} style={{ flex: 1 }}>
                      <Text style={{ color: m.active ? theme.text : theme.textMuted, fontSize: 13 }}>
                        {m.active ? '✓ ' : '○ '}
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteMedication(m.id)}>
                      <Text style={{ color: '#EF4444', fontSize: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* SCREEN 5: DOCTOR ADMIN CONSOLE */}
        {activeTab === 'admin' && (
          <ScrollView
            style={styles.screenScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 115, gap: 14 }}
          >
            <View style={styles.rowBetween}>
              <TouchableOpacity
                onPress={() => setActiveTab('overview')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ color: theme.text, fontSize: 20 }}>‹</Text>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '500' }}>Doctor Portal</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                {appointments.length} Active
              </Text>
            </View>

            <View style={cardStyle}>
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>PHYSICIAN CONSOLE</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 2 }}>
                Dr. Elena Vance, MD
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Cardiology & Internal Medicine • Live Triage Queue
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TextInput
                  value={doctorReplyInput}
                  onChangeText={setDoctorReplyInput}
                  placeholder={`Send clinical note to ${patient.name.split(' ')[0]}'s chat...`}
                  placeholderTextColor={theme.textMuted}
                  style={[inputStyle, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={sendDoctorLiveReply}
                  style={[styles.crudAddBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>Send Live</Text>
                </TouchableOpacity>
              </View>
            </View>

            {appointments.map((a) => (
              <View
                key={a.id}
                style={[cardStyle, { borderColor: a.risk === 'HIGH' ? theme.accent : theme.cardBorder }]}
              >
                <View style={styles.rowBetween}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                    {patient.name} ({a.code})
                  </Text>
                  <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                    {a.risk} • {a.source}
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 11.5, marginTop: 2 }}>
                  {a.slot} • Status: {a.status}
                </Text>
                <View style={{ backgroundColor: theme.surface, padding: 10, borderRadius: 14, marginTop: 10 }}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                    Complaint: {a.complaint}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>{a.triageNotes}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => updateAppointmentStatus(a.id, 'Doctor Online Now')}
                    style={[styles.crudAddBtn, { backgroundColor: theme.accent, flex: 1, alignItems: 'center', paddingVertical: 10 }]}
                  >
                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 11.5 }}>
                      ✓ Accept & Connect
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateAppointmentStatus(a.id, 'Rx & Labs Ordered')}
                    style={[styles.pillBtnMuted, { backgroundColor: theme.surfaceAlt, flex: 1, alignItems: 'center', paddingVertical: 10 }]}
                  >
                    <Text style={{ color: theme.text, fontSize: 11.5 }}>Order Labs / Rx</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteAppointment(a.id)}
                    style={[styles.pillBtnMuted, { backgroundColor: theme.surfaceAlt, paddingHorizontal: 12, justifyContent: 'center' }]}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 11.5 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* FLOATING BOTTOM NAVIGATION DOCK — Hidden inside Chat */}
        {activeTab !== 'chat' && (
          <View style={styles.bottomDockWrap}>
            <View style={[styles.bottomDock, { backgroundColor: theme.dockBg, borderColor: theme.dockBorder }]}>
              <TouchableOpacity
                onPress={() => setActiveTab('overview')}
                style={
                  isOverviewActive
                    ? [styles.dockLimePill, { backgroundColor: theme.accent }]
                    : [styles.dockCircleBtn, { backgroundColor: theme.dockBtn }]
                }
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z"
                    stroke={isOverviewActive ? '#000' : theme.text}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                {isOverviewActive && (
                  <Text style={styles.dockLimePillText}>
                    {activeTab === 'biometrics' ? 'Biometrics' : 'Overview'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('chat')}
                style={[styles.dockCircleBtn, { backgroundColor: theme.dockBtn }]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"
                    stroke={theme.accent}
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('profile')}
                style={
                  isProfileActive
                    ? [styles.dockLimePill, { backgroundColor: theme.accent }]
                    : [styles.dockCircleBtn, { backgroundColor: theme.dockBtn }]
                }
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke={isProfileActive ? '#000' : theme.text}
                    strokeWidth="2"
                  />
                  <Path
                    d="M4.5 20c0-3.5 3.4-6 7.5-6s7.5 2.5 7.5 6"
                    stroke={isProfileActive ? '#000' : theme.text}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </Svg>
                {isProfileActive && <Text style={styles.dockLimePillText}>Profile</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenScroll: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  greetingSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarBtnImg: {
    width: '100%',
    height: '100%',
  },
  avatarBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bigSectionTitle: {
    fontSize: 30,
    fontWeight: '400',
    marginTop: 22,
    marginBottom: 16,
  },
  obsidianCard: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMutedLabel: {
    fontSize: 12,
  },
  heroStatText: {
    fontSize: 34,
    fontWeight: '600',
    marginTop: 4,
  },
  pillBtnMuted: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  pillBtnMutedText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  pillBtnOutline: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  calloutWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  calloutLime: {
    fontSize: 17,
    fontWeight: '600',
  },
  calloutSub: {
    fontSize: 10,
  },
  dottedLine: {
    width: 45,
    height: 1,
    marginLeft: 10,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 205,
    marginTop: 10,
    gap: 8,
  },
  barItem: {
    flex: 1,
    borderRadius: 18,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barPillLight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 6,
    width: '100%',
    alignItems: 'center',
  },
  barPillLightText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  barPillDark: {
    backgroundColor: '#0A0A0A',
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 6,
    width: '100%',
    alignItems: 'center',
  },
  barPillDarkText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  barCaptionMuted: {
    fontSize: 10,
  },
  cardTitle: {
    fontSize: 16,
  },
  limeCircleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineCircleArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11.5,
  },
  gaugeBadgeText: {
    fontSize: 11,
    marginTop: -12,
  },
  matrixCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  doctorStreamBlock: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  agentSparkle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineBookedBanner: {
    marginLeft: 22,
    marginTop: 6,
    borderLeftWidth: 2,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 99,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  chatTextInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 6,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 10.5,
    marginBottom: 4,
  },
  crudInput: {
    fontSize: 12.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  crudAddBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 12,
  },
  bottomDockWrap: {
    position: 'absolute',
    bottom: 16,
    left: 18,
    right: 18,
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 99,
    padding: 6,
    gap: 6,
    borderWidth: 1,
  },
  dockLimePill: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLimePillText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  dockCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeAiBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  editDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  editDoneBtnText: {
    color: '#000',
    fontSize: 11.5,
    fontWeight: '700',
  },
  profileHeroCenter: {
    alignItems: 'center',
    marginTop: 18,
  },
  profileHeroAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileHeroAvatarImg: {
    width: '100%',
    height: '100%',
  },
  profileHeroInitials: {
    fontSize: 26,
    fontWeight: '700',
  },
  profileHeroName: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 12,
  },
  profileHeroMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  minimalVitalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    paddingVertical: 14,
    width: '100%',
  },
  minimalVitalCell: {
    flex: 1,
    alignItems: 'center',
  },
  minimalVitalVal: {
    fontSize: 16,
    fontWeight: '600',
  },
  minimalVitalLbl: {
    fontSize: 10.5,
    marginTop: 2,
  },
  minimalDividerV: {
    width: 1,
    height: 26,
  },
  minimalSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  minimalListRow: {
    paddingVertical: 2,
  },
  chatAttachBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  pendingImgWrap: {
    position: 'relative',
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  pendingImgThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  pendingImgRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMsgImage: {
    width: 190,
    height: 150,
    borderRadius: 14,
    marginBottom: 6,
  },
});
