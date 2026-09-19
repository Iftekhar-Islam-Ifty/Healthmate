/* =========================================================
   HEALTHMATE — AI COMPANION (VOICE & CHAT ASSISTANT)
   - Real-time Health Assistant powered by Gemini 2.5 Flash
   - Speech-to-Text (Voice Input) & Text-to-Speech (Voice Output)
   - Function execution (auto adds meds, vitals, appointments, routines)
   - Strict medical guardrails & patient context injection
========================================================= */

(function () {
  let aiConversationHistory = [];
  let isSpeechRecording = false;
  let speechRecognition = null;
  let isVoiceMuted = false;
  let isAiWidgetOpen = false;

  // Initialize Speech Recognition if supported
  function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      speechRecognition = new SpeechRecognition();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = false;
      speechRecognition.lang = 'bn-BD'; // Default Bengali, works great with English too

      speechRecognition.onstart = function () {
        isSpeechRecording = true;
        updateVoiceButtonState(true);
      };

      speechRecognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('hmAiInput');
        if (input) {
          input.value = transcript;
        }
        sendAiMessage(transcript, null, true);
      };

      speechRecognition.onerror = function (event) {
        console.warn('Speech recognition error:', event.error);
        isSpeechRecording = false;
        updateVoiceButtonState(false);
        if (event.error === 'not-allowed') {
          showToast('মাইক্রোফোনের অনুমতি প্রয়োজন (Microphone access required)');
        }
      };

      speechRecognition.onend = function () {
        isSpeechRecording = false;
        updateVoiceButtonState(false);
      };
    }
  }

  function updateVoiceButtonState(isListening) {
    const micBtn = document.getElementById('hmAiMicBtn');
    if (!micBtn) return;
    if (isListening) {
      micBtn.classList.add('is-listening');
      micBtn.setAttribute('title', 'শুনছি... কথা বলুন (Listening...)');
      micBtn.innerHTML = `
        <span class="hm-mic-pulse"></span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      `;
    } else {
      micBtn.classList.remove('is-listening');
      micBtn.setAttribute('title', 'ভয়েস ইনপুট (Voice Input)');
      micBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      `;
    }
  }

  function toggleVoiceInput() {
    if (!speechRecognition) {
      initSpeech();
    }

    if (!speechRecognition) {
      showToast('আপনার ব্রাউজার ভয়েস ইনপুট সমর্থন করে না (Voice input not supported)');
      return;
    }

    if (isSpeechRecording) {
      speechRecognition.stop();
    } else {
      try {
        speechRecognition.start();
      } catch (e) {
        console.warn('Speech start error:', e);
      }
    }
  }

  function speakText(text) {
    if (isVoiceMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop prior speech
      const cleanText = text.replace(/[*#_`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      // Auto-detect language
      const hasBengali = /[\u0980-\u09FF]/.test(cleanText);
      utterance.lang = hasBengali ? 'bn-BD' : 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }

  function shouldSpeakReply(userText) {
    if (!userText || typeof userText !== 'string') return false;
    const t = userText.toLowerCase().trim();
    // Strictly match explicit commands requesting spoken / voice audio output
    // Must NOT match conversational words like "বলো", "কথা বলো", "উত্তর দাও", "speak", or "tell me"
    const bnSpeakPattern = /(মুখে\s*(বলো?|বলুন|শোনাও|শোনান)|পড়ে\s*(শোনাও|শোনান)|ভয়েসে\s*(বলো?|বলুন)|ভয়েস\s*(রিপ্লাই|মেসেজ|উত্তর|দাও|দেও)|আওয়াজ\s*করে\s*(বলো?|বলুন|পড়ো?|পড়ুন)|উচ্চস্বরে\s*(পড়ো?|পড়ুন|বলো?|বলুন))/i;
    const enSpeakPattern = /\b((speak|read|say)\s+(it\s+|this\s+)?(out\s*loud|aloud)|voice\s+(reply|response|note|message)|audio\s+(reply|response)|in\s+voice)\b/i;

    return bnSpeakPattern.test(t) || enSpeakPattern.test(t);
  }

  function getPatientSnapshot() {
    if (!window.HMStore) return {};
    const user = HMStore.getUser ? HMStore.getUser() : {};
    const meds = HMStore.getMedicines ? HMStore.getMedicines() : [];
    const records = HMStore.getRecords ? HMStore.getRecords() : {};
    const routines = HMStore.getRoutines ? HMStore.getRoutines() : [];
    const appointments = HMStore.getAppointments ? HMStore.getAppointments() : [];
    const documents = HMStore.getDocuments ? HMStore.getDocuments() : [];

    return {
      profile: {
        name: user.name || 'User',
        age: user.age,
        bloodGroup: user.blood,
        emergencyContact: user.emergency,
        chronicConditions: user.conditions || [],
        allergies: user.allergies || []
      },
      currentMedications: meds.map(m => ({
        name: m.name,
        dosage: m.dosage,
        time: m.time,
        frequency: m.frequency,
        meal: m.meal,
        stock: m.stock,
        status: m.status
      })),
      recentVitals: {
        bp: (records.bp || []).slice(-3),
        sugar: (records.sugar || []).slice(-3),
        weight: (records.weight || []).slice(-2),
        temp: (records.temp || []).slice(-2)
      },
      routines: routines.map(r => ({
        name: r.name,
        category: r.category,
        target: r.target,
        frequency: r.frequency
      })),
      upcomingAppointments: appointments.filter(a => a.status === 'upcoming').map(a => ({
        doctorName: a.doctorName,
        specialty: a.specialty,
        date: a.date,
        time: a.time,
        reason: a.reason
      })),
      vaultDocumentsCount: documents.length,
      // Full document and prescription details so AI can read, scan, and extract prescriptions
      medicalVaultDocuments: documents.map(d => ({
        id: d.id,
        title: d.title,
        category: d.category,
        categoryName: d.categoryName,
        date: d.date,
        doctor: d.doctor,
        facility: d.facility,
        fileType: d.fileType,
        fileName: d.fileName,
        notes: d.notes,
        tags: d.tags || [],
        hasImage: !!(d.fileData && d.fileData.startsWith('data:image/'))
      }))
    };
  }

  // Execute client-side tool actions returned by Gemini
  async function executeClientAction(action) {
    if (!action || !action.name || !window.HMStore) return null;
    const { name, args } = action;

    try {
      if (name === 'addMedicine') {
        const newMed = {
          name: args.name,
          dosage: args.dosage || '1 tablet',
          time: args.time || '08:00 AM',
          frequency: args.frequency || 'Once daily',
          meal: args.meal || 'After meal',
          stock: typeof args.stock === 'number' ? args.stock : 10,
          refillThreshold: typeof args.refillThreshold === 'number' ? args.refillThreshold : 5,
          unit: args.unit || 'tablets',
          status: 'upcoming'
        };
        await HMStore.saveMedicine(newMed);
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderMedicinesList === 'function') renderMedicinesList();
        showToast(`ঔষধ যোগ করা হয়েছে: ${newMed.name}`);
        return `Successfully added medication: ${newMed.name}`;
      } else if (name === 'addMedicinesBatch') {
        const list = Array.isArray(args.medicines) ? args.medicines : [];
        let addedCount = 0;
        for (const item of list) {
          if (!item || !item.name) continue;
          const newMed = {
            name: item.name,
            dosage: item.dosage || '1 tablet',
            time: item.time || '08:00 AM',
            frequency: item.frequency || 'Once daily',
            meal: item.meal || 'After meal',
            stock: typeof item.stock === 'number' ? item.stock : 14,
            refillThreshold: 5,
            unit: 'tablets',
            status: 'upcoming'
          };
          await HMStore.saveMedicine(newMed);
          addedCount++;
        }
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderMedicinesList === 'function') renderMedicinesList();
        showToast(`প্রেসক্রিপশন থেকে ${addedCount}টি ঔষধ সফলভাবে যুক্ত করা হয়েছে!`);
        return `Successfully added ${addedCount} medications from prescription`;
      } else if (name === 'logVitalRecord') {
        const type = args.vitalType || 'bp';
        const entry = {
          date: args.date || new Date().toISOString().slice(0, 10),
          note: args.note || 'Recorded via AI Assistant'
        };
        if (type === 'bp') {
          entry.systolic = Number(args.systolic) || 120;
          entry.diastolic = Number(args.diastolic) || 80;
        } else if (type === 'sugar') {
          entry.value = Number(args.value) || 5.6;
          entry.context = args.context || 'Fasting';
        } else {
          entry.value = Number(args.value) || 65;
        }
        await HMStore.saveHealthRecord(type, entry);
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderRecordsView === 'function') renderRecordsView();
        showToast(`স্বাস্থ্য রিডিং সংরক্ষিত: ${type.toUpperCase()}`);
        return `Successfully logged health record for ${type}`;
      } else if (name === 'scheduleAppointment') {
        const newAppt = {
          doctorName: args.doctorName || 'Doctor',
          specialty: args.specialty || 'General Physician',
          hospital: args.hospital || 'Hospital',
          phone: args.phone || '',
          date: args.date || new Date().toISOString().slice(0, 10),
          time: args.time || '10:00 AM',
          status: 'upcoming',
          reason: args.reason || 'Medical Consultation',
          preVisitChecklist: ['Previous Prescriptions', 'Recent Lab Reports'],
          notes: 'Scheduled by HealthMate AI Companion'
        };
        await HMStore.addAppointment(newAppt);
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderAppointmentsList === 'function') renderAppointmentsList();
        showToast(`অ্যাপয়েন্টমেন্ট নির্ধারিত: ${newAppt.doctorName}`);
        return `Successfully scheduled appointment with ${newAppt.doctorName}`;
      } else if (name === 'addRoutine') {
        const newRoutine = {
          name: args.name,
          category: args.category || 'Health',
          target: args.target || 'Daily',
          frequency: args.frequency || 'Daily',
          reminder: true,
          week: [false, false, false, false, false, false, false]
        };
        await HMStore.saveRoutine(newRoutine);
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderRoutinesList === 'function') renderRoutinesList();
        showToast(`রুটিন যোগ করা হয়েছে: ${newRoutine.name}`);
        return `Successfully added routine: ${newRoutine.name}`;
      }
    } catch (err) {
      console.error('Error executing AI action:', err);
    }
    return null;
  }

  function appendAiChatMessage(role, text, actions) {
    const list = document.getElementById('hmAiMessagesList');
    if (!list) return;

    const msgRow = document.createElement('div');
    msgRow.className = `hm-ai-msg-row ${role === 'user' ? 'is-user' : 'is-ai'}`;

    let actionBadges = '';
    if (Array.isArray(actions) && actions.length > 0) {
      actionBadges = `
        <div class="hm-ai-action-pills">
          ${actions.map(a => `<span class="hm-ai-action-badge">⚡ Auto-updated: ${a.name}</span>`).join('')}
        </div>
      `;
    }

    // Format simple markdown bold or bullets
    let formattedText = escapeAiHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\s*-\s*(.*?)(?=\n|$)/g, '<br>• $1')
      .replace(/\n/g, '<br>');

    if (role === 'user') {
      msgRow.innerHTML = `
        <div class="hm-ai-bubble user-bubble">${formattedText}</div>
      `;
    } else {
      msgRow.innerHTML = `
        <div class="hm-ai-avatar">🤖</div>
        <div class="hm-ai-bubble ai-bubble">
          <div class="hm-ai-bubble-content">${formattedText}</div>
          ${actionBadges}
          <div class="hm-ai-bubble-actions" style="display:flex;justify-content:flex-end;margin-top:6px;">
            <button type="button" class="hm-ai-play-voice-btn" title="কথা শুনুন (Listen response)" style="background:transparent;border:none;cursor:pointer;color:var(--color-text-muted);font-size:0.72rem;display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span>শুনুন</span>
            </button>
          </div>
        </div>
      `;
      const playBtn = msgRow.querySelector('.hm-ai-play-voice-btn');
      if (playBtn) {
        playBtn.onclick = () => {
          if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          } else {
            speakText(text);
          }
        };
      }
    }

    list.appendChild(msgRow);
    list.scrollTop = list.scrollHeight;
  }

  function escapeAiHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showAiTypingIndicator() {
    const list = document.getElementById('hmAiMessagesList');
    if (!list) return;
    const typing = document.createElement('div');
    typing.id = 'hmAiTypingIndicator';
    typing.className = 'hm-ai-msg-row is-ai';
    typing.innerHTML = `
      <div class="hm-ai-avatar">🤖</div>
      <div class="hm-ai-bubble ai-bubble hm-ai-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    list.appendChild(typing);
    list.scrollTop = list.scrollHeight;
  }

  function removeAiTypingIndicator() {
    const typing = document.getElementById('hmAiTypingIndicator');
    if (typing) typing.remove();
  }

  async function sendAiMessage(customText = null, attachedImage = null, isFromVoice = false) {
    const isTextString = typeof customText === 'string';
    const input = document.getElementById('hmAiInput');
    const text = (isTextString ? customText : (input ? input.value : '')).trim();
    if (!text) return;

    if (input && !isTextString) {
      input.value = '';
    }
    appendAiChatMessage('user', text);
    aiConversationHistory.push({ role: 'user', content: text });

    // Voice response condition:
    // Only speak aloud if:
    // 1. The input came via microphone/voice (isFromVoice === true), OR
    // 2. The user explicitly requested in their prompt to speak aloud ("মুখে বলো", "পড়ে শোনাও", "speak aloud", etc.)
    const wantsVoiceReply = isFromVoice || shouldSpeakReply(text);

    showAiTypingIndicator();

    const patientContext = getPatientSnapshot();

    try {
      const payload = {
        message: text,
        conversationHistory: aiConversationHistory,
        patientContext: patientContext
      };
      if (attachedImage) {
        payload.image = attachedImage;
      }

      const response = await fetch('/api/health-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      removeAiTypingIndicator();

      if (data.success) {
        // Execute tool actions if returned
        if (Array.isArray(data.actions) && data.actions.length > 0) {
          for (const act of data.actions) {
            await executeClientAction(act);
          }
        }

        const reply = data.reply || 'আপনার অনুরোধ সম্পন্ন হয়েছে।';
        appendAiChatMessage('assistant', reply, data.actions);
        aiConversationHistory.push({ role: 'assistant', content: reply });

        // Only reply with voice when voice input was used or explicitly asked
        if (wantsVoiceReply) {
          speakText(reply);
        }
      } else {
        const errMsg = data.error || 'একটি অপ্রত্যাশিত সমস্যা হয়েছে।';
        appendAiChatMessage('assistant', errMsg);
      }
    } catch (err) {
      console.error('AI chat network error:', err);
      removeAiTypingIndicator();
      appendAiChatMessage('assistant', 'সার্ভারে সংযোগ করতে সমস্যা হচ্ছে। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ চেক করুন।');
    }
  }

  function toggleAiWidget() {
    const widget = document.getElementById('hmAiWidget');
    if (!widget) return;
    isAiWidgetOpen = !isAiWidgetOpen;
    if (isAiWidgetOpen) {
      widget.classList.add('is-open');
      const input = document.getElementById('hmAiInput');
      if (input) setTimeout(() => input.focus(), 200);
      // Greet if first time
      const list = document.getElementById('hmAiMessagesList');
      if (list && list.children.length === 0) {
        const user = HMStore.getUser ? HMStore.getUser() : {};
        const greetName = user.name || 'Friend';
        const welcome = `হ্যালো ${greetName}! আমি আপনার পার্সোনাল HealthMate AI সহযোগী। আপনার ঔষধ, ব্লাড প্রেসার, সুগার, ডাক্তারের অ্যাপয়েন্টমেন্ট বা যেকোনো স্বাস্থ্য বিষয়ক প্রশ্ন করতে পারেন।`;
        appendAiChatMessage('assistant', welcome);
      }
    } else {
      widget.classList.remove('is-open');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (isSpeechRecording && speechRecognition) {
        speechRecognition.stop();
      }
    }
  }

  function injectAiWidget() {
    // Avoid double injecting
    if (document.getElementById('hmAiWidgetTrigger')) return;

    // Trigger button
    const trigger = document.createElement('button');
    trigger.id = 'hmAiWidgetTrigger';
    trigger.className = 'hm-ai-floating-btn';
    trigger.setAttribute('aria-label', 'Open HealthMate AI Assistant');
    trigger.innerHTML = `
      <div class="hm-ai-med-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <span class="hm-ai-btn-text">HealthMate AI</span>
    `;
    trigger.addEventListener('click', toggleAiWidget);
    document.body.appendChild(trigger);

    // AI Drawer/Modal Panel
    const widget = document.createElement('div');
    widget.id = 'hmAiWidget';
    widget.className = 'hm-ai-modal-panel';
    widget.innerHTML = `
      <div class="hm-ai-header">
        <div class="hm-ai-header-left">
          <div class="hm-ai-header-avatar">🤖</div>
          <div>
            <div class="hm-ai-header-title">HealthMate AI</div>
            <div class="hm-ai-header-status">
              <span class="hm-ai-online-dot"></span> Personal Medical Companion
            </div>
          </div>
        </div>
        <div class="hm-ai-header-actions">
          <button type="button" class="hm-ai-icon-btn" id="hmAiVoiceMuteBtn" title="Mute/Unmute AI Voice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          </button>
          <button type="button" class="hm-ai-icon-btn" id="hmAiCloseBtn" title="Close AI Assistant">✕</button>
        </div>
      </div>

      <!-- Guardrail notice banner -->
      <div class="hm-ai-guardrail-banner">
        <span class="hm-ai-shield-icon">🛡️</span>
        <span>Strict Health Guardrails Active — Dedicated purely to your personal medical vault & health care.</span>
      </div>

      <!-- Quick prompts row -->
      <div class="hm-ai-quick-prompts">
        <button type="button" class="hm-ai-chip" data-prompt="আমার মেডিকেল ভল্টের প্রেসক্রিপশনগুলো বিশ্লেষণ করো এবং ঔষধের নিয়মগুলো বলো">📑 প্রেসক্রিপশন স্ক্যান</button>
        <button type="button" class="hm-ai-chip" data-prompt="আজকের ঔষধের তালিকা দেখাও">💊 আজকের ঔষধ</button>
        <button type="button" class="hm-ai-chip" data-prompt="আমার সাম্প্রতিক ব্লাড প্রেশার কেমন আছে?">🩺 ব্লাড প্রেশার</button>
        <button type="button" class="hm-ai-chip" data-prompt="আগামী ডাক্তারের অ্যাপয়েন্টমেন্ট কবে?">🗓️ অ্যাপয়েন্টমেন্ট</button>
        <button type="button" class="hm-ai-chip" data-prompt="Napa 500mg ঔষধটি সকালে এবং রাতে খাবারের পর যোগ করো">➕ ঔষধ যোগ করুন</button>
      </div>

      <!-- Chat messages container -->
      <div class="hm-ai-messages" id="hmAiMessagesList"></div>

      <!-- Chat input area -->
      <div class="hm-ai-input-wrapper">
        <button type="button" class="hm-ai-mic-btn" id="hmAiMicBtn" title="ভয়েস ইনপুট (Voice Input)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <input type="text" id="hmAiInput" class="hm-ai-text-input" placeholder="স্বাস্থ্য সম্পর্কে কিছু জিজ্ঞেস করুন বা বলুন..." autocomplete="off">
        <button type="button" class="hm-ai-send-btn" id="hmAiSendBtn" title="মেসেজ পাঠান (Send)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    `;
    document.body.appendChild(widget);

    // Event listeners
    document.getElementById('hmAiCloseBtn')?.addEventListener('click', toggleAiWidget);
    document.getElementById('hmAiSendBtn')?.addEventListener('click', () => sendAiMessage());
    document.getElementById('hmAiMicBtn')?.addEventListener('click', toggleVoiceInput);
    document.getElementById('hmAiInput')?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendAiMessage();
      }
    });

    // Voice mute toggle
    const muteBtn = document.getElementById('hmAiVoiceMuteBtn');
    muteBtn?.addEventListener('click', function () {
      isVoiceMuted = !isVoiceMuted;
      if (isVoiceMuted) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        muteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
        showToast('AI ভয়েস নিঃশব্দ করা হয়েছে (Muted)');
      } else {
        muteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        showToast('AI ভয়েস চালু করা হয়েছে (Unmuted)');
      }
    });

    // Quick prompt chips click
    widget.querySelectorAll('.hm-ai-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        const prompt = this.getAttribute('data-prompt');
        const input = document.getElementById('hmAiInput');
        if (input && prompt) {
          input.value = '';
          sendAiMessage(prompt, null, false);
        }
      });
    });
  }

  // Global helper to open AI modal with a specific prompt (and optional image)
  window.openHealthAiWithPrompt = function (promptText, attachedImage = null) {
    if (!isAiWidgetOpen) {
      toggleAiWidget();
    }
    const input = document.getElementById('hmAiInput');
    if (input && promptText) {
      input.value = '';
      sendAiMessage(promptText, attachedImage, false);
    }
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAiWidget);
  } else {
    injectAiWidget();
  }
})();
