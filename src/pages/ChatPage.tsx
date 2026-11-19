import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Copy,
  Bookmark,
  RotateCcw,
  Square,
  Check,
  Bot,
  User as UserIcon,
  HelpCircle,
  TrendingUp,
  FileText,
  Code,
  Globe,
  Zap,
  ExternalLink,
  Mic,
  X,
  Image as ImageIcon,
  ChevronDown,
  Trash2,
  Download,
  Plus,
  Clock,
  Search,
  Edit2,
  ChevronLeft,
  MessageSquare,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useApp } from '../context/AppContext';
import './ChatPage.css';

export const ChatPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    activeMessages,
    isAiResponding,
    selectedModel,
    setSelectedModel,
    sendMessage,
    saveToLibrary,
    showToast,
    user,
    clearActiveChat,
    regenerateMessage,
    stopGeneration,
    createNewChat,
    selectConversation,
    deleteConversation
  } = useApp();
  const navigate = useNavigate();

  const [inputMessage, setInputMessage] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [msgFeedback, setMsgFeedback] = useState<Record<string, 'like' | 'dislike'>>({});
  const [webSearchActive, setWebSearchActive] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(true);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [voiceModeOpen, setVoiceModeOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>(
    'Explain the competitive advantages of Zunme AI compared to traditional LLMs in 2026.'
  );
  const [deepResearchActive, setDeepResearchActive] = useState<boolean>(false);
  const [isImageMode, setIsImageMode] = useState<boolean>(false);


  const handleToggleWebSearch = () => {
    const next = !webSearchActive;
    setWebSearchActive(next);
    showToast(
      next
        ? '🌐 Live Web Search enabled (real-time internet context)'
        : 'Web Search disabled (direct neural model)',
      'info'
    );
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (editingTitle.trim()) {
      apiClient.renameConversation(id, editingTitle.trim()).catch(() => {});
      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        conv.title = editingTitle.trim();
      }
      showToast('Conversation renamed', 'success');
    }
    setEditingChatId(null);
  };

  const getConversationGroup = (chat: any) => {
    const dateStr = chat.updatedAt || chat.updated_at || chat.createdAt || chat.created_at;
    if (!dateStr) return 'TODAY';
    let str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
    const date = new Date(str);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays <= 7) return 'PREVIOUS 7 DAYS';
    return 'EARLIER';
  };

  const filteredConversations = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  const historyGroups = ['TODAY', 'YESTERDAY', 'PREVIOUS 7 DAYS', 'EARLIER'];
  const groupedConversations = historyGroups.reduce<Record<string, typeof conversations>>((acc, grp) => {
    acc[grp] = filteredConversations.filter((c) => getConversationGroup(c) === grp);
    return acc;
  }, {});

  // Model Selection Dropdown State
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    {
      id: 'grok-4.20-0309-non-reasoning',
      name: 'Grok 🚀 [xAI - Ultra Fast 700ms]',
      tag: 'Fast',
      desc: 'xAI Grok high speed conversational & coding intelligence with live internet grounding'
    },
    {
      id: 'grok-4.3',
      name: 'Grok 4.3 🧠 [xAI - Deep Reasoning]',
      tag: 'Deep',
      desc: 'Advanced multi-step reasoning, mathematical proof & complex system architecture'
    },
    {
      id: 'gemma3:4b',
      name: 'Gemma 3 (4B) 🌟 [Deep Quality]',
      tag: 'Quality',
      desc: 'Google Gemma 3 - Deep reasoning, rich formatting & high precision output'
    },
    {
      id: 'qwen2.5:3b',
      name: 'Qwen 2.5 (3B) ⚡ [Fast]',
      tag: 'Fast',
      desc: 'High-speed multilingual assistant with instant CPU inference'
    }
  ];

  // Multimodal Image & Screenshot Attachment State
  const [attachedImage, setAttachedImage] = useState<{
    name: string;
    url: string;
    sizeKb: number;
    file?: File;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Modals & Lightbox
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSentInitialPrompt = useRef(false);

  // Sync conversation history from backend on page load
  useEffect(() => {
    apiClient.getConversations().catch(() => {});
  }, []);

  // Check if routed with a prompt from Landing Page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPrompt = params.get('prompt');
    if (initialPrompt && !hasSentInitialPrompt.current) {
      hasSentInitialPrompt.current = true;
      sendMessage(initialPrompt, { model: selectedModel?.id, webSearch: webSearchActive });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [sendMessage, selectedModel?.id, webSearchActive]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isAiResponding]);

  // Click outside to close model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        name: file.name,
        url: event.target?.result as string,
        sizeKb: Math.round(file.size / 1024),
        file
      });
      showToast(`Attached "${file.name}" for Multimodal Vision inspection`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSampleScreenshot = (sampleType: 'dashboard' | 'mockup') => {
    if (sampleType === 'dashboard') {
      setAttachedImage({
        name: 'analytics_conversion_dashboard.png',
        url: '/assets/client-icons/documents_icon.png',
        sizeKb: 148
      });
      setInputMessage(
        'Analyze this analytics dashboard screenshot. Identify key conversion drop-offs, visual hierarchy, and metric anomalies.'
      );
    } else {
      setAttachedImage({
        name: 'landing_page_ui_mockup.png',
        url: '/assets/client-icons/interactive_content_icon.png',
        sizeKb: 216
      });
      setInputMessage('Audit this landing page UI mockup. Evaluate visual contrast, CTA placement, and accessibility.');
    }
    showToast('Loaded sample screenshot for Multimodal AI analysis', 'info');
  };

  const handleSend = () => {
    if ((!inputMessage.trim() && !attachedImage) || isAiResponding) return;

    let finalMsg = inputMessage.trim();
    if (attachedImage) {
      finalMsg = `[MULTIMODAL IMAGE ATTACHMENT: ${attachedImage.name} (${attachedImage.sizeKb} KB)]\n${finalMsg || 'Please analyze this uploaded visual asset and provide comprehensive insights.'}`;
    }
    if (deepResearchActive) {
      finalMsg = `[DEEP RESEARCH SYNTHESIS: Multi-Step Verified Data Gathering]\n${finalMsg}`;
    }

    const filesToPass: File[] = [];
    if (attachedImage?.file) {
      filesToPass.push(attachedImage.file);
    }

    sendMessage(finalMsg, {
      model: selectedModel?.id,
      webSearch: webSearchActive,
      files: filesToPass,
      isImageMode
    });

    setInputMessage('');
    setAttachedImage(null);
    setIsImageMode(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  };

  const handleSendVoiceTranscript = () => {
    if (!voiceTranscript.trim() || isAiResponding) return;
    sendMessage(voiceTranscript.trim(), { model: selectedModel?.id, webSearch: webSearchActive });
    setVoiceModeOpen(false);
    setIsListening(false);
    showToast('Sent voice transcription to Zunme AI', 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleToggleSpeak = (msgId: string, content: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      showToast('Speech playback is not supported in this browser.', 'error');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      showToast('Voice playback stopped.', 'info');
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = content
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~>]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith('en-IN') ||
        v.lang.startsWith('hi-IN') ||
        v.lang.startsWith('en-US') ||
        v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
    showToast('Reading response aloud...', 'info');
  };

  const handleEditMessage = (content: string) => {
    setInputMessage(content);
    textareaRef.current?.focus();
    showToast('Loaded message into composer to edit', 'info');
  };

  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setMsgFeedback((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? undefined : type
    } as any));
    showToast(type === 'like' ? 'Thank you for your feedback!' : 'Feedback recorded', 'info');
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) {
      const now = new Date();
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleSaveToLibrary = (content: string) => {
    const firstLine = content.split('\n')[0].replace(/[#*`]/g, '').trim() || 'AI Conversation Extract';
    saveToLibrary({
      title: firstLine.slice(0, 48),
      contentType: 'TEXT',
      previewText: content.slice(0, 140) + '...',
      content,
      tags: ['AI Chat', 'Notes']
    });
  };

  const handlePromptCardClick = (promptText: string) => {
    sendMessage(promptText, { model: selectedModel?.id, webSearch: webSearchActive });
  };

  const handleDownloadImage = (url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `zunme-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Image downloaded successfully!', 'success');
  };

  return (
    <div className="chat-page-layout">
      {/* Mobile Drawer Backdrop for Chat History */}
      {isHistoryOpen && (
        <div
          className="history-drawer-backdrop"
          onClick={() => setIsHistoryOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Collapsible Chat History Sidebar (Kiaan AI Style) */}
      {isHistoryOpen && (
        <aside className="chat-history-sidebar">
          {/* Header */}
          <div className="history-sidebar-header">
            <div className="history-title-wrap">
              <Clock size={16} color="#635BFF" />
              <span className="history-title">Chat History</span>
            </div>
            <div className="history-header-actions">
              <button
                type="button"
                className="btn-new-chat-icon"
                onClick={createNewChat}
                title="Start New Chat"
              >
                <Plus size={15} />
              </button>
              <button
                type="button"
                className="btn-collapse-history"
                onClick={() => setIsHistoryOpen(false)}
                title="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>

          {/* New Chat Primary Button */}
          <button
            type="button"
            className="history-new-chat-btn"
            onClick={createNewChat}
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>

          {/* Search Box */}
          <div className="history-search-box">
            <Search size={13} className="history-search-icon" />
            <input
              type="text"
              placeholder="Search chats..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="history-search-input"
            />
            {historySearch && (
              <button
                type="button"
                className="history-search-clear"
                onClick={() => setHistorySearch('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Conversation Groups List */}
          <div className="history-conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="history-empty-hint">
                {historySearch ? 'No matching conversations' : 'No chats yet'}
              </div>
            ) : (
              historyGroups.map((grp) => {
                const items = groupedConversations[grp] || [];
                if (items.length === 0) return null;

                return (
                  <div key={grp} className="history-group-section">
                    <div className="history-group-header">{grp}</div>
                    {items.map((chat) => {
                      const isActive = chat.id === activeConversationId;
                      const isEditing = editingChatId === chat.id;

                      return (
                        <div
                          key={chat.id}
                          className={`history-chat-item ${isActive ? 'active' : ''}`}
                          onClick={() => !isEditing && selectConversation(chat.id)}
                        >
                          <MessageSquare size={14} className="history-item-icon" />

                          {isEditing ? (
                            <div className="history-rename-box" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(chat.id, e);
                                  if (e.key === 'Escape') setEditingChatId(null);
                                }}
                                autoFocus
                                className="history-rename-input"
                              />
                              <button
                                type="button"
                                className="btn-rename-action save"
                                onClick={(e) => handleSaveRename(chat.id, e)}
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn-rename-action cancel"
                                onClick={() => setEditingChatId(null)}
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="history-item-title" title={chat.title}>
                                {chat.title || 'Untitled Conversation'}
                              </span>

                              <div className="history-item-actions">
                                <button
                                  type="button"
                                  className="btn-item-action"
                                  onClick={(e) => handleStartRename(chat.id, chat.title, e)}
                                  title="Rename"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-item-action delete"
                                  onClick={(e) => handleDeleteChat(chat.id, e)}
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main Chat Workspace */}
      <div className="chat-workspace">
        {/* Chat Top Info Bar */}
        <div className="chat-header-bar">
          <div className="chat-model-info">
            {/* History Toggle Button in Header */}
            <button
              type="button"
              className={`history-toggle-btn ${isHistoryOpen ? 'active' : ''}`}
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              title={isHistoryOpen ? 'Collapse Chat History' : 'View Chat History'}
            >
              <Clock size={14} color={isHistoryOpen ? '#635BFF' : '#64748B'} />
              <span>{isHistoryOpen ? 'Hide History' : 'Chat History'}</span>
            </button>
          {/* Interactive Model Selector Dropdown */}
          <div className="model-dropdown-wrapper" ref={modelDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="model-selector-pill-btn"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              title="Click to switch AI Model"
            >
              <span className="model-live-dot" />
              <span style={{ fontWeight: 700 }}>{selectedModel?.name || 'Grok 🚀 [xAI - Ultra Fast 700ms]'}</span>
              <ChevronDown
                size={13}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: isModelDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>

            {isModelDropdownOpen && (
              <>
                <div
                  className="model-dropdown-backdrop"
                  onClick={() => setIsModelDropdownOpen(false)}
                  aria-hidden="true"
                />
                <div className="model-dropdown-menu">
                  <div className="model-dropdown-header-row">
                    <span className="model-dropdown-header">Select AI Engine &amp; Speed</span>
                    <button
                      type="button"
                      className="model-dropdown-close-btn"
                      onClick={() => setIsModelDropdownOpen(false)}
                      title="Close menu"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {availableModels.map((m) => {
                    const isSelected = selectedModel?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`model-dropdown-option ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedModel({ id: m.id, name: m.name });
                          setIsModelDropdownOpen(false);
                          showToast(`Switched model to ${m.name}`);
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="model-option-title">
                            <span>{m.name}</span>
                            <span className={`model-tag-pill ${m.tag.toLowerCase()}`}>{m.tag}</span>
                          </div>
                          <div className="model-option-desc">{m.desc}</div>
                        </div>
                        {isSelected && <Check size={14} color="#635BFF" style={{ marginLeft: '8px', flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Context Window: 128k
          </span>
        </div>

        <div className="chat-header-actions">
          {/* Web Search Toggle Pill */}
          <button
            type="button"
            className={`web-search-toggle-pill ${webSearchActive ? 'active' : ''}`}
            onClick={handleToggleWebSearch}
            title={webSearchActive ? 'Live Web Search is ON. Click to turn off.' : 'Live Web Search is OFF. Click to turn on.'}
          >
            <Globe size={13} color={webSearchActive ? '#059669' : '#64748B'} />
            <span>Web Search: {webSearchActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={createNewChat}
            title="Start a new chat conversation"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700' }}
          >
            <Plus size={13} />
            <span>New Chat</span>
          </button>

          

          {/* Clear Messages in Current Chat */}
          {activeMessages.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setClearConfirmOpen(true)}
              title="Clear messages in this conversation"
              style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}

          <span className="badge badge-success">Online &amp; Ready</span>
        </div>
      </div>

      {/* Chat Messages Canvas */}
      <div className="chat-canvas">
        <div className="chat-scroll-inner">
          {activeMessages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-state-icon">
                <Bot size={32} />
              </div>
              <h2 className="empty-state-title">Welcome to Zunme AI Assistant</h2>
              <p className="empty-state-desc">
                Powered by high-speed neural models. Ask anything, draft strategic plans, analyze visual screenshots, or generate high-resolution images.
              </p>

              <div className="starter-prompts-grid">
                <div
                  className="starter-prompt-card"
                  onClick={() =>
                    handlePromptCardClick(
                      'Can you propose a 4-step go-to-market plan for an AI productivity tool designed for creators?'
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} color="var(--color-primary)" />
                    <strong>Creator GTM Strategy</strong>
                  </div>
                  <span>4-step framework for early adopter traction</span>
                </div>

                <div
                  className="starter-prompt-card"
                  onClick={() =>
                    handlePromptCardClick(
                      'create a modern sleek 3D logo for an AI technology company'
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon size={15} color="#635BFF" />
                    <strong>🎨 AI Image &amp; Logo Generation</strong>
                  </div>
                  <span>Generate professional 8K branding graphics &amp; logos</span>
                </div>

                <div
                  className="starter-prompt-card"
                  onClick={() =>
                    handlePromptCardClick(
                      'What are the main best practices for organizing shared design tokens in a React + TypeScript project?'
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <Code size={15} color="var(--color-primary)" />
                    <strong>Frontend Architecture</strong>
                  </div>
                  <span>Type-safe CSS tokens &amp; component primitives</span>
                </div>

                <div
                  className="starter-prompt-card"
                  onClick={() =>
                    handlePromptCardClick(
                      'Explain the difference between retrieval-augmented generation (RAG) and model fine-tuning with practical examples.'
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={15} color="var(--color-primary)" />
                    <strong>RAG vs Fine-Tuning</strong>
                  </div>
                  <span>Practical trade-offs and implementation cost</span>
                </div>
              </div>

              {/* Sample Screenshots for Multimodal Vision Testing */}
              <div className="sample-screenshots-container">
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '700' }}>
                  📸 Multimodal Vision Analysis:
                </span>
                <button
                  type="button"
                  className="sample-screenshot-chip"
                  onClick={() => handleSelectSampleScreenshot('dashboard')}
                >
                  <ImageIcon size={13} color="#635BFF" />
                  <span>Analyze Analytics Dashboard Screenshot</span>
                </button>
                <button
                  type="button"
                  className="sample-screenshot-chip"
                  onClick={() => handleSelectSampleScreenshot('mockup')}
                >
                  <ImageIcon size={13} color="#059669" />
                  <span>Audit Landing Page UI Mockup</span>
                </button>
              </div>
            </div>
          ) : (
            activeMessages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`message-row ${isAssistant ? 'assistant' : 'user'}`}
                >
                  <div className={`message-avatar ${isAssistant ? 'assistant' : 'user'}`}>
                    {isAssistant ? (
                      <div className="avatar-ai-orb">
                        <Bot size={17} />
                      </div>
                    ) : (
                      <div className="avatar-user-circle">
                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={15} />}
                      </div>
                    )}
                  </div>

                  <div className="message-body-wrapper">
                    <div className="message-meta">
                      <span className="message-author-name">
                        {isAssistant ? 'Zunme AI' : 'You'}
                      </span>
                      {isAssistant && (
                        <span className="message-badge">
                          {msg.model ? msg.model.replace(/^grok-4\.20-0309.*/, 'grok-4.20') : (selectedModel?.name?.split(' ')[0] || 'Grok')}
                        </span>
                      )}
                      <span className="message-time">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>

                    <div className={`message-bubble ${isAssistant ? 'assistant' : 'user'}`}>
                      {!isAssistant ? (
                        <>
                          {msg.content.includes('[MULTIMODAL IMAGE ATTACHMENT:') && (
                            <div className="user-image-attachment-pill">
                              <ImageIcon size={13} />
                              <span>
                                {msg.content.match(/\[MULTIMODAL IMAGE ATTACHMENT: ([^\]]+)\]/)?.[1] || 'Attached Image'}
                              </span>
                            </div>
                          )}
                          <div className="user-message-text">
                            {msg.content.replace(/\[MULTIMODAL IMAGE ATTACHMENT: [^\]]+\]\n?/, '')}
                          </div>
                        </>
                      ) : (
                        <RichMessageRenderer
                          content={msg.content}
                          onPreviewImage={(url) => setPreviewImageUrl(url)}
                          onDownloadImage={handleDownloadImage}
                        />
                      )}
                    </div>

                    {/* Compact sleek action toolbar under bubble */}
                    <div className="message-actions-toolbar">
                      <button
                        type="button"
                        className="message-action-pill"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check size={12} color="#10B981" />
                            <span style={{ color: '#10B981' }}>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {!isAssistant && (
                        <button
                          type="button"
                          className="message-action-pill"
                          onClick={() => handleEditMessage(msg.content.replace(/\[MULTIMODAL IMAGE ATTACHMENT: [^\]]+\]\n?/, ''))}
                          title="Edit in composer"
                        >
                          <RotateCcw size={12} />
                          <span>Edit</span>
                        </button>
                      )}

                      {isAssistant && (
                        <>
                          <button
                            type="button"
                            className={`message-action-pill ${speakingMsgId === msg.id ? 'active-speaking' : ''}`}
                            onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            title={speakingMsgId === msg.id ? 'Stop listening' : 'Listen to response'}
                          >
                            {speakingMsgId === msg.id ? (
                              <>
                                <VolumeX size={12} color="#EF4444" />
                                <span style={{ color: '#EF4444' }}>Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={12} />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="message-action-pill"
                            onClick={() => regenerateMessage()}
                            disabled={isAiResponding}
                            title="Regenerate response"
                          >
                            <RotateCcw size={12} />
                            <span>Regenerate</span>
                          </button>

                          <button
                            type="button"
                            className={`message-action-pill icon-only ${msgFeedback[msg.id] === 'like' ? 'active-like' : ''}`}
                            onClick={() => handleFeedback(msg.id, 'like')}
                            title="Good response"
                          >
                            <ThumbsUp size={12} fill={msgFeedback[msg.id] === 'like' ? 'currentColor' : 'none'} />
                          </button>

                          <button
                            type="button"
                            className={`message-action-pill icon-only ${msgFeedback[msg.id] === 'dislike' ? 'active-dislike' : ''}`}
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            title="Bad response"
                          >
                            <ThumbsDown size={12} fill={msgFeedback[msg.id] === 'dislike' ? 'currentColor' : 'none'} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isAiResponding && (
            <div className="message-row assistant">
              <div className="message-avatar assistant">
                <div className="avatar-ai-orb">
                  <Bot size={17} />
                </div>
              </div>
              <div className="message-body-wrapper">
                <div className="message-meta">
                  <span className="message-author-name">Zunme AI</span>
                  <span className="message-badge">
                    {selectedModel?.name?.split(' ')[0] || 'Grok'}
                  </span>
                </div>
                <div className="message-bubble assistant typing-bubble">
                  <div className="typing-indicator-row">
                    <span style={{ fontSize: '13px', color: '#64748B', marginRight: '6px' }}>
                      {selectedModel?.name?.split(' ')[0] || 'Zunme AI'} is generating
                    </span>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="">
        
        <div className="chat-input-box">
          {attachedImage && (
            <div className="image-attachment-preview-bar">
              <div className="image-preview-meta">
                <img src={attachedImage.url} alt="Attached asset" className="image-preview-thumb" />
                <div className="image-preview-info">
                  <span className="image-preview-name">{attachedImage.name}</span>
                  <span className="image-preview-sub">
                    🖼️ Multimodal Vision Inspection Active ({attachedImage.sizeKb} KB)
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="image-remove-btn"
                onClick={() => setAttachedImage(null)}
                title="Remove image"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={
              isImageMode
                ? '🎨 Describe the image, logo, or artwork you want to create... (Press Enter to generate)'
                : 'Ask anything, describe what to create, or attach a screenshot/image... (Press Enter to send)'
            }
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={isAiResponding}
            rows={1}
          />

          <div className="chat-input-actions">
            <div className="composer-tools-left">
              {/* Web Search Button */}
              <button
                type="button"
                className={`composer-tool-btn ${webSearchActive ? 'active-search' : ''}`}
                onClick={handleToggleWebSearch}
                title={webSearchActive ? 'Live Web Search is ON (Click to turn off)' : 'Toggle Real-Time Web Search'}
              >
                <Globe size={14} />
                <span>Search</span>
                {webSearchActive && <span className="tool-dot-emerald" />}
              </button>

              {/* Attach Image Button */}
              <button
                type="button"
                className={`composer-tool-btn ${attachedImage ? 'active-purple' : ''}`}
                onClick={() => imageInputRef.current?.click()}
                title="Upload Image or Screenshot for Multimodal Inspection"
              >
                <ImageIcon size={14} />
                <span>Attach</span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />

              {/* Image Generation Mode Toggle */}
              <button
                type="button"
                className={`composer-tool-btn ${isImageMode ? 'active-purple' : ''}`}
                onClick={() => {
                  setIsImageMode(!isImageMode);
                  showToast(!isImageMode ? '🎨 Image Generation Mode ON' : 'Image Generation Mode OFF', 'info');
                }}
                title="Toggle AI Image Generation Mode"
              >
                <Sparkles size={14} />
                <span>Image</span>
              </button>

              {/* Deep Research Mode Toggle */}
              <button
                type="button"
                className={`composer-tool-btn ${deepResearchActive ? 'active-amber' : ''}`}
                onClick={() => {
                  setDeepResearchActive(!deepResearchActive);
                  showToast(
                    !deepResearchActive
                      ? '⚡ Deep Research Mode ON'
                      : 'Standard Chat Mode active',
                    'info'
                  );
                }}
                title="Toggle Deep Multi-Step Research Mode"
              >
                <Zap size={14} />
                <span>Research</span>
              </button>

              {/* Natural Voice Mode */}
              <button
                type="button"
                className="composer-tool-btn"
                onClick={() => {
                  setVoiceModeOpen(true);
                  setIsListening(true);
                  showToast('Voice Mode activated. Listening for speech...', 'info');
                }}
                title="Natural Voice Conversation Mode"
              >
                <Mic size={14} />
                <span>Voice</span>
              </button>
            </div>

            <div className="composer-tools-right">
              {isAiResponding ? (
                <button
                  type="button"
                  className="chatgpt-stop-btn"
                  onClick={stopGeneration}
                  title="Stop generating"
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  className={`chatgpt-send-btn ${inputMessage.trim() || attachedImage ? 'active' : 'disabled'}`}
                  onClick={handleSend}
                  disabled={!inputMessage.trim() && !attachedImage}
                  title={inputMessage.trim() || attachedImage ? 'Send message (Enter)' : 'Type a message to send'}
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="chat-input-disclaimer">
          <span>Zunme AI may produce inaccurate information. Verify important facts.</span>
          <span className="disclaimer-dot">•</span>
          <span>Shift + Enter for new line</span>
        </div>
      </div>

      {/* VOICE MODE OVERLAY MODAL */}
      {voiceModeOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setVoiceModeOpen(false);
            setIsListening(false);
          }}
          style={{ zIndex: 1100 }}
        >
          <div className="voice-mode-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ color: '#E2E8F0', padding: '6px', cursor: 'pointer' }}
                onClick={() => {
                  setVoiceModeOpen(false);
                  setIsListening(false);
                }}
                aria-label="Close voice mode"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 24px' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-10px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99, 91, 255, 0.7) 0%, rgba(99, 91, 255, 0) 70%)',
                  animation: 'pulse 2s infinite'
                }}
              />
              <div
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #635BFF 0%, #4338CA 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(99, 91, 255, 0.6)',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                <Mic size={42} color="#FFFFFF" />
              </div>
            </div>

            <h3 className="voice-mode-title">Zunme Natural Voice Mode</h3>
            <p className="voice-mode-subtitle">
              {isListening ? 'Listening to your voice... Speak naturally' : 'Voice session paused'}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '42px',
                marginBottom: '24px'
              }}
            >
              {[18, 32, 40, 24, 38, 16, 30, 42, 22, 36, 20].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    height: isListening ? `${h}px` : '6px',
                    backgroundColor: '#818CF8',
                    borderRadius: '3px',
                    transition: 'height 0.2s ease',
                    boxShadow: isListening ? '0 0 8px rgba(129, 140, 248, 0.6)' : 'none'
                  }}
                />
              ))}
            </div>

            <div className="voice-mode-transcript">
              <div className="voice-mode-transcript-label">Live Speech Transcript:</div>
              <p className="voice-mode-transcript-text">"{voiceTranscript}"</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendVoiceTranscript}
                style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '700', borderRadius: '10px' }}
              >
                <Send size={15} />
                <span>Send to Zunme Chat</span>
              </button>
              <button
                type="button"
                className="voice-mode-btn-secondary"
                onClick={() => setIsListening(!isListening)}
              >
                {isListening ? 'Pause Mic' : 'Resume Mic'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR CHAT MODAL */}
      {clearConfirmOpen && (
        <div className="modal-overlay" onClick={() => setClearConfirmOpen(false)} style={{ zIndex: 1200 }}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              width: '90%',
              padding: '24px',
              background: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', color: '#111625' }}>
              Clear Messages?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to clear all messages in this conversation? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setClearConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  clearActiveChat();
                  setClearConfirmOpen(false);
                }}
                style={{ background: '#EF4444', color: '#fff', border: 'none' }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX MODAL */}
      {previewImageUrl && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewImageUrl(null)}
          style={{ zIndex: 1300, background: 'rgba(0, 0, 0, 0.85)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <img
              src={previewImageUrl}
              alt="High-resolution generated asset"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleDownloadImage(previewImageUrl)}
              >
                <Download size={14} />
                <span>Download Image</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPreviewImageUrl(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

// Lightweight Zero-Dependency Syntax Highlighting for Code Blocks
function renderHighlightedCode(code: string): React.ReactNode {
  if (!code) return '';
  const lines = code.split('\n');

  const tokenRegex = /(\/\/.*$|#.*$|--.*$|'[^']*'|"[^"]*"|`[^`]*`|\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|default|import|export|from|class|extends|new|this|async|await|try|catch|finally|throw|typeof|instanceof|def|elif|in|is|not|lambda|pass|with|as|yield|select|from|where|insert|update|delete|create|table|public|private|protected|static|void|int|float|double|string|bool|boolean)\b|\b(?:true|false|null|undefined|None|True|False|NaN)\b|\b\d+(?:\.\d+)?\b)/g;

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) {
      return (
        <div key={lineIdx} className="code-line">
          <span className="syn-comment">{line}</span>
        </div>
      );
    }

    const tokens: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    tokenRegex.lastIndex = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        tokens.push(line.substring(lastIdx, match.index));
      }

      const val = match[0];
      const key = `${lineIdx}-${match.index}`;

      if (val.startsWith('//') || val.startsWith('#') || val.startsWith('--')) {
        tokens.push(<span key={key} className="syn-comment">{val}</span>);
      } else if (val.startsWith('"') || val.startsWith("'") || val.startsWith('`')) {
        tokens.push(<span key={key} className="syn-string">{val}</span>);
      } else if (/^(?:true|false|null|undefined|None|True|False|NaN|\d+(?:\.\d+)?)$/.test(val)) {
        tokens.push(<span key={key} className="syn-constant">{val}</span>);
      } else {
        tokens.push(<span key={key} className="syn-keyword">{val}</span>);
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < line.length) {
      tokens.push(line.substring(lastIdx));
    }

    return (
      <div key={lineIdx} className="code-line">
        <span className="code-line-text">{tokens.length > 0 ? tokens : ' '}</span>
      </div>
    );
  });
}

// Inline Markdown Parser
function parseInline(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text;

  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const key = `inline-${match.index}-${token.slice(0, 8)}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={key} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      parts.push(
        <strong key={key}>
          <em>{parseInline(token.slice(3, -3))}</em>
        </strong>
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      parts.push(
        <strong key={key}>
          {parseInline(token.slice(2, -2))}
        </strong>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      parts.push(
        <del key={key}>
          {parseInline(token.slice(2, -2))}
        </del>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-markdown-link"
          >
            {parseInline(linkMatch[1])}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key}>
          {parseInline(token.slice(1, -1))}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

// Full ChatGPT-Grade Code Block Component
const CodeBlock: React.FC<{
  language: string;
  code: string;
}> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayLang = (language || 'code').trim().toLowerCase();

  return (
    <div className="ai-code-block-wrapper">
      <div className="ai-code-block-header">
        <span className="code-lang-tag">{displayLang}</span>
        <button
          type="button"
          className="btn-copy-code"
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} color="#10B981" />
              <span style={{ color: '#10B981', fontWeight: 600 }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="ai-code-block-body">
        <pre className="ai-code-pre">
          <code>{renderHighlightedCode(code)}</code>
        </pre>
      </div>
    </div>
  );
};

// Rich Markdown & Generated Image Renderer
const RichMessageRenderer: React.FC<{
  content: string;
  onPreviewImage: (url: string) => void;
  onDownloadImage: (url: string, filename?: string) => void;
}> = ({ content, onPreviewImage, onDownloadImage }) => {
  if (!content) return null;

  // 1. Block Parsing: Extract Code Blocks without breaking internal newlines!
  const blockRegex = /```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)(?:```|$)/g;
  const blocks: Array<{ type: 'code'; language: string; code: string } | { type: 'text'; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      });
    }

    blocks.push({
      type: 'code',
      language: match[1] || 'code',
      code: (match[2] || '').trimEnd()
    });

    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }

  return (
    <div className="rich-message-container">
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={`code-${bIdx}`}
              language={block.language}
              code={block.code}
            />
          );
        }

        // Parse regular text block for headings, lists, tables, images, paragraphs
        const lines = block.content.split(/\r?\n/);
        const elements: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
          const line = lines[i];
          const trimmed = line.trim();

          if (!trimmed) {
            i++;
            continue;
          }

          // Markdown Image: ![caption](url)
          const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
          if (imgMatch) {
            const caption = imgMatch[1];
            const url = imgMatch[2];
            elements.push(
              <div key={`img-${bIdx}-${i}`} className="ai-generated-image-card">
                <div className="generated-image-wrap" onClick={() => onPreviewImage(url)}>
                  <img src={url} alt={caption || 'AI Generated Asset'} className="generated-image-thumb" />
                  <div className="generated-image-overlay">
                    <span>Click to view full image</span>
                  </div>
                </div>
                <div className="generated-image-meta">
                  <span className="generated-image-caption">🎨 {caption || 'AI Generated Image'}</span>
                  <button
                    type="button"
                    className="btn-download-image"
                    onClick={() => onDownloadImage(url, 'generated-asset.png')}
                    title="Download image"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
            i++;
            continue;
          }

          // Horizontal rule
          if (/^(\*\*\*|---|___)$/.test(trimmed)) {
            elements.push(<hr key={`hr-${bIdx}-${i}`} className="chat-markdown-hr" />);
            i++;
            continue;
          }

          // Headings
          if (trimmed.startsWith('### ')) {
            elements.push(<h3 key={`h3-${bIdx}-${i}`}>{parseInline(trimmed.slice(4))}</h3>);
            i++;
            continue;
          }
          if (trimmed.startsWith('## ')) {
            elements.push(
              <h2 key={`h2-${bIdx}-${i}`} style={{ fontSize: '16px', fontWeight: 700, margin: '14px 0 6px' }}>
                {parseInline(trimmed.slice(3))}
              </h2>
            );
            i++;
            continue;
          }
          if (trimmed.startsWith('# ')) {
            elements.push(
              <h1 key={`h1-${bIdx}-${i}`} style={{ fontSize: '18px', fontWeight: 700, margin: '16px 0 8px' }}>
                {parseInline(trimmed.slice(2))}
              </h1>
            );
            i++;
            continue;
          }

          // Blockquote
          if (trimmed.startsWith('> ')) {
            const quoteLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('> ')) {
              quoteLines.push(lines[i].trim().slice(2));
              i++;
            }
            elements.push(
              <blockquote key={`quote-${bIdx}-${i}`} className="chat-blockquote">
                {parseInline(quoteLines.join(' '))}
              </blockquote>
            );
            continue;
          }

          // Table detection
          if (
            trimmed.startsWith('|') &&
            trimmed.endsWith('|') &&
            lines[i + 1] &&
            lines[i + 1].trim().startsWith('|') &&
            lines[i + 1].includes('---')
          ) {
            const tableHeaders = trimmed.split('|').slice(1, -1).map((h) => h.trim());
            i += 2; // skip header and separator row

            const rows: string[][] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
              const cells = lines[i].trim().split('|').slice(1, -1).map((c) => c.trim());
              rows.push(cells);
              i++;
            }

            elements.push(
              <div key={`table-${bIdx}-${i}`} className="table-responsive-container">
                <table className="message-table">
                  <thead>
                    <tr>
                      {tableHeaders.map((head, hIdx) => (
                        <th key={hIdx}>{parseInline(head)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((rowCells, rIdx) => (
                      <tr key={rIdx}>
                        {rowCells.map((cell, cIdx) => (
                          <td key={cIdx}>{parseInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }

          // Unordered list
          if (/^[*+-]\s/.test(trimmed)) {
            const listItems: string[] = [];
            while (i < lines.length && /^[*+-]\s/.test(lines[i].trim())) {
              listItems.push(lines[i].trim().replace(/^[*+-]\s/, ''));
              i++;
            }
            elements.push(
              <ul key={`ul-${bIdx}-${i}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>
                {listItems.map((item, lIdx) => (
                  <li key={lIdx} style={{ margin: '4px 0' }}>{parseInline(item)}</li>
                ))}
              </ul>
            );
            continue;
          }

          // Ordered list
          if (/^\d+\.\s/.test(trimmed)) {
            const listItems: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
              listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
              i++;
            }
            elements.push(
              <ol key={`ol-${bIdx}-${i}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>
                {listItems.map((item, lIdx) => (
                  <li key={lIdx} style={{ margin: '4px 0' }}>{parseInline(item)}</li>
                ))}
              </ol>
            );
            continue;
          }

          // Standard paragraph
          elements.push(
            <p key={`p-${bIdx}-${i}`} style={{ marginBottom: '8px', lineHeight: '1.6' }}>
              {parseInline(trimmed)}
            </p>
          );
          i++;
        }

        return <React.Fragment key={`block-${bIdx}`}>{elements}</React.Fragment>;
      })}
    </div>
  );
};
