// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: unknown;
    webkitSpeechRecognition: unknown;
  }
}

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message: string;
};

import { useState, useEffect, useRef, useCallback } from 'react';

// Types
type ZikrType = {
  id: string;
  arabic: string;
  english: string;
  keywords: string[];
};

type HistoryItem = {
  id: string;
  zikr: ZikrType;
  timestamp: number;
};

type DailyRecord = {
  date: string;
  count: number;
  zikr: string;
};

// Zikr data
const ZIKRS: ZikrType[] = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللّٰه', english: 'Subhanallah', keywords: ['subhanallah', 'subhan allah', 'subhan allah'] },
  { id: 'alhamdulillah', arabic: 'ٱلْحَمْدُ لِلّٰه', english: 'Alhamdulillah', keywords: ['alhamdulillah', 'al hamdulillah', 'al hamdulillah'] },
  { id: 'allahuakbar', arabic: 'ٱللّٰهُ أَكْبَر', english: 'Allahu Akbar', keywords: ['allahu akbar', 'allahu akbar', 'allah akbar'] },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللّٰه', english: 'Astaghfirullah', keywords: ['astaghfirullah', 'astaghfir allah', 'astaghfir allah'] },
  { id: 'laailahaillallah', arabic: 'لَا إِلٰهَ إِلَّا اللّٰه', english: 'La Ilaha Illallah', keywords: ['la ilaha illallah', 'la ilaha illallah', 'la ilaha illah'] },
  { id: 'lahawlawaquwata', arabic: 'لَا حَوْلَ وَلَا قُوَّة', english: 'La Hawla Wala Quwwata', keywords: ['la hawla wala quwwata', 'la hawla wala quwwata', 'lahawla'] },
];

const TARGETS = [33, 66, 99, 100, 333, 1000];

export default function App() {
  // State
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [selectedZikr, setSelectedZikr] = useState<ZikrType>(ZIKRS[0]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'stats' | 'settings'>('home');
  const [adsenseId, setAdsenseId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Refs
  const recognitionRef = useRef<unknown | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load saved data
  useEffect(() => {
    const savedData = localStorage.getItem('tasbeehData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setCount(data.count || 0);
      setTarget(data.target || 33);
      setSelectedZikr(data.selectedZikr || ZIKRS[0]);
      setHistory(data.history || []);
      setDailyRecords(data.dailyRecords || []);
      setSoundEnabled(data.soundEnabled !== false);
      setDarkMode(data.darkMode !== false);
      setAdsenseId(data.adsenseId || '');
    }
  }, []);

  // Save data
  useEffect(() => {
    const data = { count, target, selectedZikr, history, dailyRecords, soundEnabled, darkMode, adsenseId };
    localStorage.setItem('tasbeehData', JSON.stringify(data));
  }, [count, target, selectedZikr, history, dailyRecords, soundEnabled, darkMode, adsenseId]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Play beep sound
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [soundEnabled]);

  // Increment count
  const incrementCount = useCallback((zikr: ZikrType) => {
    setCount(prev => prev + 1);
    setHistory(prev => [...prev, { id: Date.now().toString(), zikr, timestamp: Date.now() }]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 300);
    playBeep();

    // Update daily record
    const today = new Date().toISOString().split('T')[0];
    setDailyRecords(prev => {
      const existing = prev.find(r => r.date === today);
      if (existing) {
        return prev.map(r => r.date === today ? { ...r, count: r.count + 1, zikr: zikr.english } : r);
      }
      return [...prev, { date: today, count: 1, zikr: zikr.english }];
    });
  }, [playBeep]);

  // Decrement count
  const decrementCount = useCallback(() => {
    if (count > 0) {
      setCount(prev => prev - 1);
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop();
        return newHistory;
      });
    }
  }, [count]);

  // Reset all
  const resetAll = useCallback(() => {
    setCount(0);
    setHistory([]);
    setDailyRecords([]);
  }, []);

  // Voice recognition
  const startVoiceRecognition = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const combinedTranscript = finalTranscript || interimTranscript;
      
      // Check if any keyword matches
      const matchedKeyword = selectedZikr.keywords.find(keyword => 
        combinedTranscript.includes(keyword.toLowerCase())
      );

      if (matchedKeyword && combinedTranscript.length > 0) {
        incrementCount(selectedZikr);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [selectedZikr, incrementCount, isListening]);

  const stopVoiceRecognition = useCallback(() => {
    if (recognitionRef.current && typeof recognitionRef.current === 'object' && 'stop' in recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && typeof recognitionRef.current === 'object' && 'stop' in recognitionRef.current) {
        (recognitionRef.current as { stop: () => void }).stop();
      }
    };
  }, []);

  // Calculate stats
  const todayCount = dailyRecords
    .filter(r => r.date === new Date().toISOString().split('T')[0])
    .reduce((sum, r) => sum + r.count, 0);

  const totalCount = dailyRecords.reduce((sum, r) => sum + r.count, 0);
  const uniqueDays = new Set(dailyRecords.map(r => r.date)).size;

  // WhatsApp link
  const whatsappNumber = '923132020392';
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg ${darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'} border-b`}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tasbeeh Counter</h1>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Islamic Zikr Counter</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* WhatsApp Button */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pb-24">
        {activeTab === 'home' && (
          <div className="py-6 space-y-6">
            {/* Counter Display */}
            <div className={`rounded-2xl p-6 text-center ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <div className="relative">
                <div className={`text-7xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {count}
                </div>
                {showSuccess && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                of {target} • {Math.round((count / target) * 100)}%
              </p>
              
              {/* Progress Bar */}
              <div className={`mt-4 h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min((count / target) * 100, 100)}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={decrementCount}
                  disabled={count === 0}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    count === 0
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : darkMode
                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Undo
                  </span>
                </button>
                <button
                  onClick={() => incrementCount(selectedZikr)}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Count
                  </span>
                </button>
              </div>
            </div>

            {/* Target Selection */}
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Target: {target}
              </h3>
              <div className="flex flex-wrap gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      target === t
                        ? 'bg-amber-500 text-white'
                        : darkMode
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Zikr Cards */}
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Select Zikr (Tap to Count)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {ZIKRS.map((zikr) => (
                  <button
                    key={zikr.id}
                    onClick={() => {
                      setSelectedZikr(zikr);
                      incrementCount(zikr);
                    }}
                    className={`p-4 rounded-xl transition-all text-left ${
                      selectedZikr.id === zikr.id
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                        : darkMode
                        ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="arabic-text text-lg font-bold mb-1">{zikr.arabic}</p>
                    <p className="text-xs opacity-80">{zikr.english}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Count Section */}
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Voice Count
                </h3>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-lg transition-colors ${
                    soundEnabled
                      ? 'bg-green-500/20 text-green-500'
                      : darkMode
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {soundEnabled ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  )}
                </button>
              </div>

              <div className={`p-3 rounded-xl mb-4 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Listening for:
                </p>
                <p className="arabic-text text-lg font-bold text-amber-500">{selectedZikr.arabic}</p>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Say: "{selectedZikr.english}"
                </p>
              </div>

              <button
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <div className="flex gap-1">
                      <span className="w-1 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    Stop Listening
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Start Voice Count
                  </>
                )}
              </button>

              <p className={`text-xs text-center mt-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {!window.SpeechRecognition && !window.webkitSpeechRecognition
                  ? '⚠️ Speech recognition not supported. Use Chrome or Edge.'
                  : '🎤 Works best in Chrome. Allow microphone permission.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="py-6">
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  History ({history.length})
                </h3>
                <button
                  onClick={() => setHistory([])}
                  className={`px-3 py-1 rounded-lg text-sm ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  Clear
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {history.length === 0 ? (
                  <p className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    No history yet. Start counting!
                  </p>
                ) : (
                  [...history].reverse().map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                    >
                      <div>
                        <p className="arabic-text font-bold text-amber-500">{item.zikr.arabic}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.zikr.english}
                        </p>
                      </div>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="py-6 space-y-4">
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Statistics
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>{todayCount}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Today</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-green-500' : 'text-green-600'}`}>{totalCount}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total</p>
                </div>
                <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}>{uniqueDays}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Days</p>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Daily Records
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {dailyRecords.length === 0 ? (
                  <p className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    No records yet. Start counting!
                  </p>
                ) : (
                  [...dailyRecords].reverse().map((record, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                    >
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{record.zikr}</p>
                      </div>
                      <p className={`text-lg font-bold ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>{record.count}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="py-6 space-y-4">
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Sound Effects
                  </label>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-full p-3 rounded-xl flex items-center justify-between ${
                      darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                    }`}
                  >
                    <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                      {soundEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-green-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : ''}`} />
                    </div>
                  </button>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    AdSense Publisher ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={adsenseId}
                    onChange={(e) => setAdsenseId(e.target.value)}
                    placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                    className={`w-full p-3 rounded-xl ${darkMode ? 'bg-slate-700/50 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'}`}
                  />
                </div>

                <button
                  onClick={resetAll}
                  className="w-full p-3 rounded-xl bg-red-500/20 text-red-500 font-semibold hover:bg-red-500/30 transition-colors"
                >
                  Reset All Data
                </button>
              </div>
            </div>

            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'}`}>
              <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                About
              </h3>
              
              <div className="space-y-3">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Tasbeeh Counter is a beautiful Islamic zikr counter app with voice recognition support.
                  </p>
                </div>

                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    📚 Learn more at:
                  </p>
                  <a
                    href="https://darsenizami.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-600 font-medium"
                  >
                    darsenizami.net
                  </a>
                </div>

                <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    👨‍💻 Developer:
                  </p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Syed Muhammad Talha
                  </p>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:text-green-600 text-sm"
                  >
                    📱 WhatsApp: +92 313 2020392
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'} border-t backdrop-blur-lg`}>
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex justify-around">
            {[
              { id: 'home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
              { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'History' },
              { id: 'stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Stats' },
              { id: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? 'text-amber-500'
                    : darkMode
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <footer className={`py-4 text-center ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
        <p className="text-xs">
          Made with ❤️ by <span className="font-semibold">Syed Muhammad Talha</span>
        </p>
        <p className="text-xs mt-1">
          📚 <a href="https://darsenizami.net" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-600">
            darsenizami.net
          </a>
        </p>
        <p className="text-xs mt-1">
          📱 WhatsApp: +92 313 2020392
        </p>
      </footer>
    </div>
  );
}
