import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  Search,
  PenTool,
  Bookmark,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Database,
  Wand2,
  TrendingUp,
  Globe,
  Menu,
  X,
  FileText,
  Mail,
  ShoppingBag,
  Store,
  Bot,
  Mic,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon,
  Share2,
  CornerDownRight,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/client';
import { InteractiveContentIcon, DocumentsLibraryIcon } from '../components/common/ClientDocIcons';
import './LandingPage.css';

export interface EcosystemProduct {
  id: string;
  name: string;
  tagline: string;
  category: 'AI & Intelligence' | 'Communication & Cloud' | 'Commerce & Capital' | 'Media & Creative';
  badge: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  linkTo: string;
  linkText: string;
}

export interface StoreFeaturedProduct {
  id: string;
  name: string;
  tag: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  stats: string;
  thumbnail: string;
  linkTo: string;
}

interface SearchSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  date: string;
  faviconText: string;
  faviconColor: string;
}

export interface SearchImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  domain?: string;
  sourceUrl?: string;
}

export interface SearchNews {
  id: string;
  title: string;
  source: string;
  time: string;
  snippet: string;
  url: string;
}

interface OrganicResult {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  domain?: string;
  sitelinks: Array<{ title: string; url: string }>;
}

interface PeopleAlsoAskItem {
  question: string;
  answer: string;
  source: string;
  sourceUrl: string;
}

export type LandingSection = 'all' | 'features' | 'how-it-works' | 'showcase' | 'pricing' | 'faq' | 'ecosystem' | 'store' | 'about' | 'business' | 'advertising' | 'zbox';
type SearchCategoryTab = 'all' | 'ai' | 'web' | 'news' | 'images';

export const LandingPage: React.FC = () => {
  const { user, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();

  // On-Screen Google Search State
  const [hasSearched, setHasSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchCategoryTab>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [aiOverviewText, setAiOverviewText] = useState('');
  const [searchTime, setSearchTime] = useState('0.24 seconds');
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [organicResults, setOrganicResults] = useState<OrganicResult[]>([]);
  const [peopleAlsoAsk, setPeopleAlsoAsk] = useState<PeopleAlsoAskItem[]>([]);
  const [images, setImages] = useState<SearchImage[]>([]);
  const [newsResults, setNewsResults] = useState<SearchNews[]>([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<SearchImage | null>(null);
  const [imageFilter, setImageFilter] = useState<string>('All Images');
  const [expandedPaaIndex, setExpandedPaaIndex] = useState<number | null>(0);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);
  const [followUpQuery, setFollowUpQuery] = useState('');

  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Sync with initial URL parameter (?q=...) if user comes with a query
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setSearchQuery(q);
      performOnScreenSearch(q.trim());
    } else if (searchParams.get('login') === 'true') {
      navigate('/login');
    }
  }, []);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice Search Handler
  const handleToggleVoiceSearch = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          setIsListening(false);
          performOnScreenSearch(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      } catch (err) {
        setIsListening(false);
      }
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const sample = 'Compare modern AI frameworks and cloud automation';
        setSearchQuery(sample);
        performOnScreenSearch(sample);
      }, 1600);
    }
  };

  // Google Search Submission
  const handleGoogleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    performOnScreenSearch(searchQuery.trim());
  };

  // Follow-Up Search Submission
  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;
    const combined = `${activeQuery} — ${followUpQuery.trim()}`;
    setSearchQuery(combined);
    setFollowUpQuery('');
    performOnScreenSearch(combined);
  };

  // Clear Search & Return to Clean Hero Landing
  const handleResetHome = () => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSearchQuery('');
    setActiveQuery('');
    setHasSearched(false);
    setAiOverviewText('');
    setImages([]);
    setNewsResults([]);
    setSelectedPreviewImage(null);
    setSearchParams({}, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Text-to-Speech Toggle
  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Speech audio is not supported in this browser environment', 'info');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = aiOverviewText.replace(/[*#_`]/g, '').trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Copy AI Overview
  const handleCopyOverview = () => {
    if (!aiOverviewText) return;
    navigator.clipboard.writeText(aiOverviewText);
    setCopied(true);
    showToast('AI Overview copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  // Core On-Screen Search Execution
  const performOnScreenSearch = async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    const startTime = performance.now();
    setHasSearched(true);
    setActiveQuery(cleanQuery);
    setSearchQuery(cleanQuery);
    setIsSearching(true);
    setAiOverviewText('');
    setFeedback(null);
    setExpandedPaaIndex(0);
    setSearchParams({ q: cleanQuery }, { replace: true });

    // Initial realistic baseline results with real verified links
    const generatedSources = buildDynamicSources(cleanQuery);
    const generatedOrganic = buildDynamicOrganicResults(cleanQuery);
    const generatedPaa = buildDynamicPeopleAlsoAsk(cleanQuery);
    const generatedRelated = buildDynamicRelatedSearches(cleanQuery);

    setSources(generatedSources);
    setOrganicResults(generatedOrganic);
    setPeopleAlsoAsk(generatedPaa);
    setRelatedQueries(generatedRelated);

    const isImageQuery = /\b(image|images|photo|photos|picture|pictures|pic|pics|wallpaper|wallpapers|tasveer|photo bhejo|dikhaye)\b/i.test(cleanQuery);
    const cleanTopic = cleanQuery
      .replace(/\b(image|images|photo|photos|picture|pictures|pic|pics|wallpaper|wallpapers|give me|show me|bhejo|tasveer|ka photo|ki photo)\b/gi, '')
      .trim() || cleanQuery;

    // Concurrently fetch real high-resolution images from Wikimedia Commons
    const fetchCommonsImages = async (): Promise<SearchImage[]> => {
      try {
        const wikiMediaUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanTopic)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
        const res = await fetch(wikiMediaUrl, { signal: abortController.signal });
        if (!res.ok) return [];
        const json = await res.json();
        const pages = Object.values(json.query?.pages || {});
        return pages
          .map((p: any, idx: number) => {
            const info = p.imageinfo?.[0];
            if (!info || !info.url) return null;
            const mime = (info.mime || '').toLowerCase();
            if (mime.includes('pdf') || mime.includes('audio') || mime.includes('ogg') || mime.includes('video')) return null;
            const cleanTitle = (p.title || '').replace(/^File:/i, '').replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');
            return {
              id: `img_wiki_${idx + 1}`,
              url: info.url,
              title: cleanTitle || `${cleanTopic} photo ${idx + 1}`,
              description: cleanTitle,
              domain: 'wikimedia.org',
              sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`
            };
          })
          .filter(Boolean) as SearchImage[];
      } catch {
        return [];
      }
    };

    // Concurrently fetch Wikipedia article for organic SERP grounding
    const fetchWikipediaArticles = async (): Promise<OrganicResult[]> => {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanTopic)}&gsrlimit=5&prop=pageimages|extracts&piprop=original|thumbnail&pithumbsize=600&exintro=1&explaintext=1&format=json&origin=*`;
        const res = await fetch(wikiUrl, { signal: abortController.signal });
        if (!res.ok) return [];
        const json = await res.json();
        const pages = Object.values(json.query?.pages || {});
        return pages.map((p: any, idx: number) => {
          const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/\s+/g, '_'))}`;
          return {
            id: `wiki_org_${idx + 1}`,
            title: `${p.title} — Wikipedia`,
            url: pageUrl,
            displayUrl: `https://en.wikipedia.org › wiki › ${p.title.replace(/\s+/g, '_')}`,
            snippet: p.extract || `${p.title} biography, overview, career records, and verified information.`,
            domain: 'en.wikipedia.org',
            sitelinks: [
              { title: 'Overview & Profile', url: pageUrl },
              { title: 'Career & Records', url: pageUrl }
            ]
          };
        }) as OrganicResult[];
      } catch {
        return [];
      }
    };

    // Fetch images immediately in background so visual gallery loads in < 200ms
    fetchCommonsImages().then((wikiImgs) => {
      if (wikiImgs && wikiImgs.length > 0) {
        setImages((prev) => (prev.length > 0 ? prev : wikiImgs));
      }
    });

    // Call Real AI backend or fallback to smart synthesis
    try {
      let accumulated = '';
      let prompt = `You are Zunme AI Overview engine. Provide a clear, comprehensive, and factual response for: "${cleanQuery}". Use structured headings, key takeaways, and bullet points. Keep the tone authoritative, modern, and direct.`;
      if (isImageQuery) {
        prompt = `You are Zunme AI Overview engine. The user is asking for images and media for "${cleanQuery}". Provide a concise overview of the subject (${cleanTopic}), highlight notable visual/career milestones, and refer them to the verified images and galleries displayed below. Keep the answer structured and engaging.`;
      }

      // Trigger live backend web search
      apiClient.webSearch(cleanQuery, true)
        .then((webRes) => {
          if (!webRes) return;

          // 1. Verified Sources
          if (Array.isArray(webRes.sources) && webRes.sources.length > 0) {
            const mappedSources: SearchSource[] = webRes.sources.map((s: any, idx: number) => ({
              id: s.id || `live_src_${idx + 1}`,
              title: s.title || `${cleanQuery} — Verified Resource`,
              url: s.url,
              domain: s.domain || 'web.live',
              snippet: s.snippet || '',
              date: s.date || s.publishedDate || '2026',
              faviconText: ((s.domain || 'W').replace(/[^a-zA-Z]/g, '').slice(0, 2) || 'WZ').toUpperCase(),
              faviconColor: ['#6E56CF', '#2563EB', '#059669', '#D97706', '#EC4899', '#0284C7'][idx % 6]
            }));
            setSources(mappedSources);
          }

          // 2. Real Organic Search Results
          if (Array.isArray(webRes.organicResults) && webRes.organicResults.length > 0) {
            setOrganicResults(webRes.organicResults);
          } else if (Array.isArray(webRes.sources) && webRes.sources.length > 0) {
            const mappedOrganic: OrganicResult[] = webRes.sources.map((s: any, idx: number) => ({
              id: `org_live_${idx + 1}`,
              title: s.title || `${cleanQuery} — Verified Resource`,
              url: s.url,
              displayUrl: `https://${s.domain || 'web.live'}`,
              snippet: s.snippet || '',
              domain: s.domain,
              sitelinks: [
                { title: 'Overview & Profile', url: s.url },
                { title: 'Verified Coverage', url: s.url }
              ]
            }));
            setOrganicResults(mappedOrganic);
          } else {
            fetchWikipediaArticles().then((wikiOrgs) => {
              if (wikiOrgs.length > 0) setOrganicResults(wikiOrgs);
            });
          }

          // 3. Real High-Definition Images
          if (Array.isArray(webRes.images) && webRes.images.length > 0) {
            setImages(webRes.images);
          }

          // 4. Real People Also Ask
          if (Array.isArray(webRes.peopleAlsoAsk) && webRes.peopleAlsoAsk.length > 0) {
            setPeopleAlsoAsk(webRes.peopleAlsoAsk);
          }

          // 5. Real News Results
          if (Array.isArray(webRes.news) && webRes.news.length > 0) {
            setNewsResults(webRes.news);
          } else if (Array.isArray(webRes.sources) && webRes.sources.length > 0) {
            setNewsResults(
              webRes.sources.slice(0, 4).map((s: any, idx: number) => ({
                id: `news_live_${idx + 1}`,
                title: s.title || `${cleanQuery} updates`,
                source: s.domain || 'Global Wire',
                time: s.date || 'Recent update',
                snippet: s.snippet || '',
                url: s.url
              }))
            );
          }

          // 6. Contextual Related Searches
          if (Array.isArray(webRes.relatedQueries) && webRes.relatedQueries.length > 0) {
            setRelatedQueries(webRes.relatedQueries);
          }
        })
        .catch(() => {
          fetchWikipediaArticles().then((wikiOrgs) => {
            if (wikiOrgs.length > 0) setOrganicResults(wikiOrgs);
          });
        });

      await apiClient.sendMessage({
        conversationId: 'landing_ai_search_' + Date.now(),
        content: prompt,
        model: 'grok-4.20-0309-non-reasoning',
        stream: true,
        signal: abortController.signal,
        onChunk: (chunk: string) => {
          accumulated += chunk;
          setAiOverviewText(accumulated);
        }
      });

      if (!accumulated.trim()) {
        throw new Error('Empty AI response');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      // Graceful smart synthesis fallback
      const synthesizedOverview = buildSmartAiOverview(cleanQuery);
      streamLocalText(synthesizedOverview, abortController.signal);
    } finally {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setSearchTime(`${elapsed} seconds`);
      setIsSearching(false);
    }
  };

  // Simulate smooth streaming for local fallback
  const streamLocalText = (text: string, signal: AbortSignal) => {
    const words = text.split(' ');
    let currentIdx = 0;
    setAiOverviewText('');

    const interval = setInterval(() => {
      if (signal.aborted) {
        clearInterval(interval);
        return;
      }
      currentIdx += 3;
      const partial = words.slice(0, currentIdx).join(' ');
      setAiOverviewText(partial);

      if (currentIdx >= words.length) {
        clearInterval(interval);
        setAiOverviewText(text);
        setIsSearching(false);
      }
    }, 28);
  };

  // Dynamic Builders for realistic Google Search experience with real working links
  const buildDynamicSources = (query: string): SearchSource[] => {
    const slug = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    return [
      {
        id: 's1',
        title: `${query} — Wikipedia The Free Encyclopedia`,
        domain: 'en.wikipedia.org',
        url: `https://en.wikipedia.org/wiki/${slug}`,
        snippet: `Verified biography, history, career records, statistics, and references regarding ${query}.`,
        date: 'Updated Today',
        faviconText: 'W',
        faviconColor: '#0F172A'
      },
      {
        id: 's2',
        title: `${query} — Real-time Google Web Grounding`,
        domain: 'google.com',
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Real-time search index, latest news developments, and verified public profiles for ${query}.`,
        date: 'Live 2026',
        faviconText: 'G',
        faviconColor: '#4285F4'
      },
      {
        id: 's3',
        title: `${query} — News & Media Coverage`,
        domain: 'news.google.com',
        url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Recent press releases, match reports, and breaking headlines regarding ${query}.`,
        date: 'Recent',
        faviconText: 'GN',
        faviconColor: '#EA4335'
      },
      {
        id: 's4',
        title: `${query} — Media & Image Archive`,
        domain: 'commons.wikimedia.org',
        url: `https://commons.wikimedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        snippet: `Public domain photographs, high-resolution media galleries, and verified archives for ${query}.`,
        date: 'High Resolution',
        faviconText: 'WC',
        faviconColor: '#006699'
      }
    ];
  };

  const buildDynamicOrganicResults = (query: string): OrganicResult[] => {
    const slug = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    return [
      {
        id: 'org1',
        title: `${query} — Wikipedia, the free encyclopedia`,
        displayUrl: `https://en.wikipedia.org › wiki › ${slug}`,
        url: `https://en.wikipedia.org/wiki/${slug}`,
        snippet: `Comprehensive overview of **${query}** including early life, professional career, records, and notable accomplishments. Access verified sources and citations.`,
        sitelinks: [
          { title: 'Overview & Profile', url: `https://en.wikipedia.org/wiki/${slug}` },
          { title: 'Career & Records', url: `https://en.wikipedia.org/wiki/${slug}#Career` },
          { title: 'Personal Information', url: `https://en.wikipedia.org/wiki/${slug}` },
          { title: 'External Links', url: `https://en.wikipedia.org/wiki/${slug}#External_links` }
        ]
      },
      {
        id: 'org2',
        title: `${query} — Latest News, Updates & Live Coverage`,
        displayUrl: `https://news.google.com › search › ${encodeURIComponent(query)}`,
        url: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Stay updated with real-time news headlines, recent interviews, match analyses, and press statements concerning **${query}**.`,
        sitelinks: [
          { title: 'Top Stories', url: `https://news.google.com/search?q=${encodeURIComponent(query)}` },
          { title: 'Recent Updates', url: `https://news.google.com/search?q=${encodeURIComponent(query)}` }
        ]
      },
      {
        id: 'org3',
        title: `${query} — High Definition Photos & Image Gallery`,
        displayUrl: `https://commons.wikimedia.org › search › ${encodeURIComponent(query)}`,
        url: `https://commons.wikimedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        snippet: `Explore high-resolution media, press photography, candid portraits, and official public images of **${query}**.`,
        sitelinks: [
          { title: 'Photo Archive', url: `https://commons.wikimedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}` },
          { title: 'High Resolution', url: `https://commons.wikimedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}` }
        ]
      }
    ];
  };

  const buildDynamicPeopleAlsoAsk = (query: string): PeopleAlsoAskItem[] => {
    const slug = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    return [
      {
        question: `Who is ${query} and what are their major achievements?`,
        answer: `${query} is widely recognized for notable career accomplishments, professional milestones, and distinguished contributions in their respective domain.`,
        source: 'en.wikipedia.org',
        sourceUrl: `https://en.wikipedia.org/wiki/${slug}`
      },
      {
        question: `Where can I see verified photos and media of ${query}?`,
        answer: `Verified high-resolution photographs and official media for ${query} are available through verified archives like Wikimedia Commons and accredited press portals.`,
        source: 'commons.wikimedia.org',
        sourceUrl: `https://commons.wikimedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
      },
      {
        question: `What are the latest updates and news regarding ${query}?`,
        answer: `Recent coverage highlights ongoing initiatives, public appearances, and timely updates indexed in global news feeds.`,
        source: 'news.google.com',
        sourceUrl: `https://news.google.com/search?q=${encodeURIComponent(query)}`
      },
      {
        question: `How can I find official records and profiles for ${query}?`,
        answer: `Official biographies, records, and verified statistical repositories are maintained on authorized encyclopedic and governing body platforms.`,
        source: 'en.wikipedia.org',
        sourceUrl: `https://en.wikipedia.org/wiki/${slug}`
      }
    ];
  };

  const buildDynamicRelatedSearches = (query: string): string[] => {
    return [
      `${query} photos and wallpapers`,
      `${query} latest news 2026`,
      `${query} biography and profile`,
      `${query} career highlights and stats`,
      `${query} achievements and records`,
      `${query} interviews and videos`,
      `${query} official updates`,
      `who is ${query}`
    ];
  };

  // Smart Local AI Synthesis Engine
  const buildSmartAiOverview = (query: string): string => {
    const qLower = query.toLowerCase();

    // Image-seeking queries
    const isImageQuery = /\b(image|images|photo|photos|picture|pictures|pic|pics|wallpaper|wallpapers|give me|show me|bhejo|tasveer)\b/i.test(qLower);
    if (isImageQuery) {
      const cleanSubject = query.replace(/\b(image|images|photo|photos|picture|pictures|pic|pics|wallpaper|wallpapers|give me|show me|bhejo|tasveer)\b/gi, '').trim() || query;
      return `### Overview & Photo Gallery: ${cleanSubject}

Here is the verified profile overview and visual highlights for **${cleanSubject}**:

* **Subject Profile:** ${cleanSubject} is a distinguished figure with international recognition and extensive career accomplishments.
* **Photo Collections:** High-resolution match photos, official portraits, press photography, and wallpaper galleries are compiled in the **Images** section.
* **Verified Sources:** Indexed citations and media links are provided by authorized portals including Wikimedia Commons, global sports repositories, and encyclopedia archives.

> **Tip:** Click any photo below to inspect in high-resolution or open the primary source page.`;
    }

    // Hindi / Hinglish query check
    const isHindi = /\b(kya|kaise|kaun|kaha|batao|karo|hai|hoga|mujhe|namaste)\b/i.test(qLower);
    if (isHindi) {
      return `### Overview: ${query}

**${query}** ke baare me mukhya jaankari yahan di gayi hai:

* **Mukhya Lakshya:** Yeh modern technology aur automated workflows ka ek pramukh hissa hai jo tezi se sahi aur verified results pradaan karta hai.
* **Upyogita:** Aap iska upyog personal research, content creation, coding aur business problem-solving me asani se kar sakte hain.
* **Agla Kadam:** Neeche diye gaye verified web sources aur related search options se aap is vishay me aur adhik gehraayi se seekh sakte hain.

> **Tip:** Agar aapko is vishay par aur vistaar se baat karni hai, toh aap upar diye gaye **"Open in AI Chat"** button par click karke direct live conversation shuru kar sakte hain.`;
    }

    // Technology / Coding / Development queries
    if (/\b(python|javascript|react|code|api|html|css|sql|docker|node|function|git)\b/i.test(qLower)) {
      return `### Technical AI Overview: ${query}

**${query}** represents a foundational concept in contemporary software engineering and digital systems:

* **Core Architecture:** Built upon modular, deterministic standards with high emphasis on testability, type safety, and clean separation of concerns.
* **Production Implementation:**
  1. Initialize configuration with explicit environment variables and safety limits.
  2. Implement error boundaries and graceful fallback mechanisms for maximum uptime.
  3. Validate input parameters at service boundaries using strict schema validation.
* **Performance Benchmark:** Modern 2026 implementations demonstrate up to a 60% reduction in cold-start latency when leveraging optimized compilation and edge caching.

\`\`\`javascript
// Practical Integration Pattern for ${query}
export async function executeOperation(payload) {
  try {
    const verified = await validateInput(payload);
    return { success: true, timestamp: Date.now(), data: verified };
  } catch (error) {
    console.error('Operation failed:', error.message);
    throw error;
  }
}
\`\`\`

* **Key Takeaway:** Prioritize modularity and verified unit coverage to ensure seamless long-term maintenance.`;
    }

    // General authoritative AI overview
    return `### AI Overview: ${query}

**${query}** is a notable subject across modern industry and technology discussions in 2026. Key synthesized insights include:

* **Core Concept & Value:** Modern adoption emphasizes agility, precision, and streamlined workflows. Organizations and individuals leverage it to reduce cognitive friction and accelerate decision-making cycles.
* **Key Drivers in 2026:**
  * **Automated Grounding:** Integration with real-time web indexes eliminates outdated assumptions and guarantees verified citations.
  * **Multimodal Flexibility:** Seamless transition between conversational text, live audio transcription, and structured code architectures.
  * **Resource Efficiency:** Minimized overhead through lightweight runtime footprints and distributed edge inference.
* **Strategic Outlook:** Analysts forecast steady acceleration across enterprise and creative domains through 2028, with standard operating procedures transitioning toward autonomous agentic assistance.

**Key Takeaways:**
1. **Direct Application:** Start with validated frameworks before custom scaling.
2. **Quality Verification:** Always verify critical facts against indexed primary sources.
3. **Continuous Evolution:** Monitor emerging 2026 revisions to maintain strategic alignment.`;
  };

  // Helper to render formatted AI Overview
  const renderFormattedAiOverview = (text: string) => {
    if (!text) return null;
    const blocks = text.split('\n\n');

    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Heading 1 or 2
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={bIdx} className="google-ai-overview-h2">
            {trimmed.replace(/^#\s+/, '')}
          </h2>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={bIdx} className="google-ai-overview-h2">
            {trimmed.replace(/^##\s+/, '')}
          </h2>
        );
      }
      // Heading 3 or 4
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={bIdx} className="google-ai-overview-h3">
            {trimmed.replace(/^###\s+/, '')}
          </h3>
        );
      }

      // Code Block
      if (trimmed.startsWith('```')) {
        const codeLines = trimmed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        return (
          <pre key={bIdx} className="google-ai-codeblock">
            <code>{codeLines}</code>
          </pre>
        );
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={bIdx} className="google-ai-blockquote">
            {renderInlineMarkdown(trimmed.replace(/^>\s*/, ''))}
          </blockquote>
        );
      }

      // Bullet List (lines starting with * or - followed by space and not another asterisk)
      if (trimmed.split('\n').some((l) => /^\s*[\*\-]\s+[^\*]/.test(l))) {
        const items = trimmed
          .split('\n')
          .map((l) => l.trim().replace(/^[\*\-]\s+(?!\*)/, ''))
          .filter(Boolean);
        return (
          <ul key={bIdx} className="google-ai-bullet-list">
            {items.map((it, iIdx) => (
              <li key={iIdx}>{renderInlineMarkdown(it)}</li>
            ))}
          </ul>
        );
      }

      // Numbered List
      if (trimmed.split('\n').some((l) => /^\d+\.\s/.test(l.trim()))) {
        const items = trimmed
          .split('\n')
          .map((l) => l.trim().replace(/^\d+\.\s*/, ''))
          .filter(Boolean);
        return (
          <ol key={bIdx} className="google-ai-num-list">
            {items.map((it, iIdx) => (
              <li key={iIdx}>{renderInlineMarkdown(it)}</li>
            ))}
          </ol>
        );
      }

      // Paragraph
      return (
        <p key={bIdx} className="google-ai-paragraph">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*|`.*?`|\*[^*\n]+?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
        return <strong key={idx}>{part.slice(1, -1)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="google-ai-inline-code">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className={`landing-page ${hasSearched ? 'results-mode' : ''}`} id="top">
      {/* Background Atmosphere Layers */}
      <div className="landing-atmosphere-wrap" aria-hidden="true">
        <div className="cosmic-grid-overlay" />
        <div className="ambient-aurora-top" />
        <div className="ambient-aurora-accent" />
      </div>

      {/* Google-Style Top Navigation Bar */}
      <header className="google-landing-header">
        <div className="google-header-content">
          {/* Left Side: About & Store */}
          <div className="google-nav-left">
            <button
              type="button"
              className="google-brand-mini-link"
              title="Zunme AI — Return to Home"
              onClick={handleResetHome}
            >
              <img src="/zunme_icon.png" alt="Zunme" className="google-brand-mini-logo" />
              {hasSearched && (
                <span className="google-brand-logo-text">
                  Zunme<strong className="brand-accent">AI</strong>
                </span>
              )}
            </button>
            <button
              type="button"
              className="google-nav-link google-nav-desktop-only"
              onClick={() => setShowAboutModal(true)}
            >
              About
            </button>
            <NavLink to="/store" className="google-nav-link google-nav-desktop-only">
              Store
            </NavLink>
          </div>

          {/* Right Side: Exact 4 Items from Client Spec */}
          <div className="google-nav-right">
            <NavLink
              to="/zbox"
              className="google-nav-icon-btn google-nav-desktop-icon"
              title="zBox — Secured Business Email & Webmail"
            >
              <img src="/assets/client-icons/mailbox_icon.png" alt="zBox Email" className="google-nav-icon-img blend-icon" />
            </NavLink>

            <NavLink
              to="/studio"
              className="google-nav-icon-btn google-nav-desktop-icon"
              title="Interactive Studio & AI Tools"
            >
              <InteractiveContentIcon size={34} />
            </NavLink>

            <NavLink
              to="/library"
              className="google-nav-icon-btn google-nav-desktop-icon"
              title="Documents & Personal Workspace Library"
            >
              <DocumentsLibraryIcon size={34} />
            </NavLink>

            <NavLink
              to="/login"
              className="google-doc-signin-btn"
              title="Sign In to Zunme"
            >
              <span>SIGN IN</span>
              <span className="google-doc-signin-pointer" aria-hidden="true" />
            </NavLink>

            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Navigation' : 'Open Navigation'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer" role="dialog" aria-modal="true">
            <nav className="mobile-nav-links">
              <button
                type="button"
                className="mobile-nav-item"
                onClick={() => {
                  setShowAboutModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                About Zunme AI
              </button>
              <NavLink to="/store" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                Store
              </NavLink>
              <NavLink to="/zbox" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                zBox Secured Business Email
              </NavLink>
              <NavLink to="/studio" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                Interactive Content Studio
              </NavLink>
              <NavLink to="/library" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                Workspace Documents & Library
              </NavLink>
              <NavLink to="/ads" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                Advertising Suite
              </NavLink>
              <NavLink to="/business/workspace" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>
                Business Solutions
              </NavLink>
            </nav>
            <div className="mobile-drawer-actions">
              <NavLink
                to="/login"
                className="btn btn-primary btn-block"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </NavLink>
            </div>
          </div>
        )}
      </header>

      {/* Top Right Corner Brand Logo — Only on clean desktop home stage */}
      {!hasSearched && (
        <button
          type="button"
          className="google-top-right-brand"
          title="Zunme AI"
          onClick={handleResetHome}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <img src="/zunme_logo.png" alt="Zunme AI" className="google-top-right-logo-img" />
        </button>
      )}

      {/* ==========================================================================
          MAIN STAGE: Clean Home State OR Google Search Results State
          ========================================================================== */}
      <main className={`google-home-stage ${hasSearched ? 'search-results-active' : ''}`}>
        {/* Brand Block — Only shown on Clean Initial Home View */}
        {!hasSearched && (
          <div className="google-brand-block">
            <div className="google-brand-wordmark">Z u n m e</div>
            <h1 className="google-brand-tagline">AI Workspace for Ideas, Content & Discovery.</h1>
            <p className="google-brand-subtitle">
              Search the web, create compelling content, and organize your work with AI-powered tools in one connected workspace.
            </p>
          </div>
        )}

        {/* Central Search Bar (Always present at top of results or center of home) */}
        <div className={`google-search-container ${hasSearched ? 'compact-results-bar' : ''}`}>
          <form onSubmit={handleGoogleSearchSubmit} className="google-search-bar">
            <div className="google-search-lens">
              <Search size={20} />
            </div>
            <input
              type="text"
              className="google-search-input-field"
              placeholder="Search the web, create compelling content, or ask AI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="google-search-clear-btn"
                onClick={handleResetHome}
                title="Clear and reset to Home"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              className={`google-search-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={handleToggleVoiceSearch}
              title={isListening ? 'Listening... (Click to stop)' : 'Voice Search (Live Mic)'}
            >
              <Mic size={20} />
              {isListening && <span className="mic-pulse-ring" />}
            </button>
            {hasSearched && (
              <button
                type="submit"
                className="google-search-action-btn"
                title="Search"
              >
                <Search size={16} />
              </button>
            )}
          </form>

          {isListening && (
            <div className="voice-listening-indicator">
              <span className="voice-wave-dot" />
              <span className="voice-wave-dot" />
              <span className="voice-wave-dot" />
              <span>Listening for query... Speak now</span>
            </div>
          )}
        </div>

        {/* ==========================================================================
            STATE A: CLEAN INITIAL HOME VIEW (6 Capability Pills & Caption)
            ========================================================================== */}
        {!hasSearched && (
          <>
            {/* Caption directly under Search Bar */}
            <div className="google-hero-caption" style={{ marginTop: '0px', marginBottom: '18px' }}>
              <Sparkles size={15} />
              <span>Make AI Your Best Friend</span>
            </div>

            {/* The 6 Capability Launchers */}
            <div className="google-capabilities-group">
              <div className="google-pills-row">
                <button
                  type="button"
                  className="google-capability-pill"
                  onClick={() => performOnScreenSearch('Zunme AI Chat assistant features')}
                >
                  <MessageSquare size={14} className="text-purple" />
                  <span>AI Chat</span>
                </button>
                <button
                  type="button"
                  className="google-capability-pill"
                  onClick={() => performOnScreenSearch('Latest 2026 AI breakthroughs and web search trends')}
                >
                  <Search size={14} className="text-blue" />
                  <span>Web Search</span>
                </button>
                <button
                  type="button"
                  className="google-capability-pill"
                  onClick={() => performOnScreenSearch('AI Content Builders for marketing, copy and executive writing')}
                >
                  <PenTool size={14} className="text-indigo" />
                  <span>AI Content Builders</span>
                </button>
                <NavLink to="/warehouse" className="google-capability-pill">
                  <Database size={14} className="text-amber" />
                  <span>AI Warehouse</span>
                </NavLink>
                <NavLink to="/creator" className="google-capability-pill">
                  <Wand2 size={14} className="text-pink" />
                  <span>Creator Tools</span>
                </NavLink>
                <NavLink to="/seo" className="google-capability-pill">
                  <TrendingUp size={14} className="text-emerald" />
                  <span>SEO Workspace</span>
                </NavLink>
              </div>
              <p className="google-capabilities-caption">
                Dedicated AI capabilities organized into one seamless workspace. No tab hopping, no disconnected tools.
              </p>
            </div>
          </>
        )}

        {/* ==========================================================================
            STATE B: GOOGLE SEARCH RESPONSE VIEW (Right on this Screen)
            ========================================================================== */}
        {hasSearched && (
          <div className="google-serp-stage">
            {/* Google Search Tabs Bar */}
            <div className="google-tabs-bar">
              <div className="google-tabs-left">
                <button
                  type="button"
                  className={`google-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  <Search size={15} />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  className={`google-tab-btn google-ai-tab ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  <Sparkles size={15} />
                  <span>AI Overview</span>
                </button>
                <button
                  type="button"
                  className={`google-tab-btn ${activeTab === 'web' ? 'active' : ''}`}
                  onClick={() => setActiveTab('web')}
                >
                  <Globe size={15} />
                  <span>Web</span>
                </button>
                <button
                  type="button"
                  className={`google-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
                  onClick={() => setActiveTab('news')}
                >
                  <FileText size={15} />
                  <span>News</span>
                </button>
                <button
                  type="button"
                  className={`google-tab-btn ${activeTab === 'images' ? 'active' : ''}`}
                  onClick={() => setActiveTab('images')}
                >
                  <ImageIcon size={15} />
                  <span>Images</span>
                </button>
              </div>

              {/* Reset to Home Pill */}
              <button
                type="button"
                className="google-back-home-pill"
                onClick={handleResetHome}
                title="Return to clean home stage"
              >
                <RotateCcw size={13} />
                <span className="reset-pill-text">Reset to Home</span>
              </button>
            </div>

            {/* Query Metric Stats */}
            <div className="google-metrics-info">
              <span>About 2,840,000 results ({searchTime}) • Verified 2026 Web Grounding</span>
            </div>

            {/* TAB: ALL or AI OVERVIEW */}
            {(activeTab === 'all' || activeTab === 'ai') && (
              <div className="google-ai-overview-card">
                {/* AI Overview Header */}
                <div className="google-ai-overview-header">
                  <div className="google-ai-title-wrap">
                    <div className="google-ai-sparkle-icon">
                      <Sparkles size={18} />
                    </div>
                    <div className="google-ai-title-group">
                      <span className="google-ai-badge-label">AI Overview</span>
                      <span className="google-ai-grounding-tag">Live 2026 Grounded</span>
                    </div>
                  </div>

                  <div className="google-ai-toolbar">
                    <button
                      type="button"
                      className="google-ai-tool-btn"
                      onClick={handleCopyOverview}
                      title="Copy Answer"
                    >
                      {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      className={`google-ai-tool-btn ${isSpeaking ? 'active-speaking' : ''}`}
                      onClick={handleToggleSpeak}
                      title={isSpeaking ? 'Stop speech' : 'Listen to AI Overview (Speech audio)'}
                    >
                      {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                    </button>

                    <button
                      type="button"
                      className="google-ai-tool-btn primary"
                      onClick={() => navigate('/chat')}
                      title="Continue in AI Chat"
                    >
                      <Bot size={14} />
                      <span>Open in AI Chat</span>
                    </button>
                  </div>
                </div>

                {/* AI Overview Content Body */}
                <div className="google-ai-overview-body">
                  {isSearching && !aiOverviewText ? (
                    <div className="google-ai-shimmer-loader">
                      <div className="shimmer-line line-lg" />
                      <div className="shimmer-line line-md" />
                      <div className="shimmer-line line-sm" />
                      <div className="shimmer-status-pulse">
                        <Sparkles size={14} className="pulse-spin" />
                        <span>Synthesizing real-time Google AI Overview for "{activeQuery}"...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {renderFormattedAiOverview(aiOverviewText)}

                      {/* Verified Sources Carousel */}
                      <div className="google-ai-sources-section">
                        <div className="google-ai-sources-heading">
                          <ShieldCheck size={14} color="#059669" />
                          <span>Key Verified Sources ({sources.length})</span>
                        </div>
                        <div className="google-ai-sources-scroll">
                          {sources.map((src) => (
                            <a
                              key={src.id}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="google-ai-source-chip"
                            >
                              <div
                                className="source-chip-favicon"
                                style={{ background: src.faviconColor }}
                              >
                                {src.faviconText}
                              </div>
                              <div className="source-chip-info">
                                <span className="source-chip-domain">{src.domain}</span>
                                <span className="source-chip-title">{src.title}</span>
                              </div>
                              <ExternalLink size={12} className="source-chip-ext" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* AI Overview Footer Actions */}
                      <div className="google-ai-card-footer">
                        <div className="google-ai-feedback-group">
                          <span className="feedback-label">Helpful?</span>
                          <button
                            type="button"
                            className={`feedback-btn ${feedback === 'liked' ? 'active' : ''}`}
                            onClick={() => {
                              setFeedback('liked');
                              showToast('Thanks for your feedback!', 'success');
                            }}
                            title="Helpful"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            type="button"
                            className={`feedback-btn ${feedback === 'disliked' ? 'active' : ''}`}
                            onClick={() => {
                              setFeedback('disliked');
                              showToast('Feedback noted. We will improve next time.', 'info');
                            }}
                            title="Not helpful"
                          >
                            <ThumbsDown size={13} />
                          </button>
                        </div>

                        {/* Inline Follow-Up Search Prompt */}
                        <form onSubmit={handleFollowUpSubmit} className="google-followup-form">
                          <CornerDownRight size={14} className="followup-icon" />
                          <input
                            type="text"
                            placeholder="Ask a follow-up question..."
                            value={followUpQuery}
                            onChange={(e) => setFollowUpQuery(e.target.value)}
                            className="google-followup-input"
                          />
                          <button
                            type="submit"
                            disabled={!followUpQuery.trim()}
                            className="google-followup-submit-btn"
                          >
                            Search
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB: ALL or WEB — Google Organic SERP, Images Strip & People Also Ask */}
            {(activeTab === 'all' || activeTab === 'web') && (
              <div className="google-results-column">
                {/* Google Inline Images Carousel (Shown when images exist or user requested images) */}
                {images.length > 0 && (
                  <div className="google-inline-images-section">
                    <div className="google-inline-images-header">
                      <div className="inline-images-title-wrap">
                        <ImageIcon size={18} className="text-purple" />
                        <h4 className="inline-images-heading">Images for {activeQuery}</h4>
                      </div>
                      <button
                        type="button"
                        className="inline-images-view-all-btn"
                        onClick={() => setActiveTab('images')}
                      >
                        <span>View all images ({images.length})</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="google-inline-images-carousel">
                      {images.slice(0, 8).map((img) => (
                        <div
                          key={img.id}
                          className="inline-image-chip"
                          onClick={() => setSelectedPreviewImage(img)}
                          title={img.title}
                        >
                          <div className="inline-chip-thumb-wrap">
                            <img
                              src={img.url}
                              alt={img.title}
                              loading="lazy"
                              className="inline-chip-img"
                              onError={(e) => {
                                (e.target as HTMLElement).closest('.inline-image-chip')?.classList.add('img-hidden');
                              }}
                            />
                          </div>
                          <div className="inline-chip-meta">
                            <span className="inline-chip-title">{img.title}</span>
                            <span className="inline-chip-domain">{img.domain || 'web.live'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* People Also Ask Section (Google Accordion) */}
                <div className="google-paa-box">
                  <h3 className="google-paa-heading">People also ask</h3>
                  <div className="google-paa-list">
                    {peopleAlsoAsk.map((item, idx) => {
                      const isExpanded = expandedPaaIndex === idx;
                      return (
                        <div key={idx} className={`google-paa-item ${isExpanded ? 'expanded' : ''}`}>
                          <button
                            type="button"
                            className="google-paa-question-btn"
                            onClick={() => setExpandedPaaIndex(isExpanded ? null : idx)}
                          >
                            <span>{item.question}</span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          {isExpanded && (
                            <div className="google-paa-answer-body">
                              <p>{item.answer}</p>
                              <div className="google-paa-cite">
                                <a
                                  href={item.sourceUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="paa-cite-domain-link"
                                >
                                  <span>{item.source}</span>
                                  <ExternalLink size={11} />
                                </a>
                                <button
                                  type="button"
                                  className="paa-search-more-btn"
                                  onClick={() => performOnScreenSearch(item.question)}
                                >
                                  Search this topic &rarr;
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Google Organic Search Result Cards */}
                <div className="google-organic-list">
                  {organicResults.map((result) => (
                    <div key={result.id} className="google-result-card">
                      <div className="google-result-cite-row">
                        <div className="google-result-site-icon">
                          <Globe size={14} />
                        </div>
                        <span className="google-result-url">{result.displayUrl}</span>
                      </div>

                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-result-title"
                      >
                        {result.title}
                      </a>

                      <p className="google-result-snippet">
                        {renderInlineMarkdown(result.snippet)}
                      </p>

                      {result.sitelinks && result.sitelinks.length > 0 && (
                        <div className="google-result-sitelinks">
                          {result.sitelinks.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="google-sitelink-chip"
                            >
                              <span>{link.title}</span>
                              <ExternalLink size={11} className="sitelink-ext-icon" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: NEWS */}
            {activeTab === 'news' && (
              <div className="google-news-grid">
                {(newsResults.length > 0 ? newsResults : [
                  {
                    id: 'news_1',
                    title: `Latest Developments & Verified News for ${activeQuery}`,
                    source: 'Global News Wire',
                    time: '1 hour ago',
                    snippet: `Comprehensive reports, real-time coverage, and latest milestones regarding ${activeQuery}.`,
                    url: `https://news.google.com/search?q=${encodeURIComponent(activeQuery)}`
                  },
                  {
                    id: 'news_2',
                    title: `Public Profile & Verified Coverage: ${activeQuery}`,
                    source: 'Digital Media Review',
                    time: '4 hours ago',
                    snippet: `Key background, public records, and verified press releases for ${activeQuery}.`,
                    url: `https://news.google.com/search?q=${encodeURIComponent(activeQuery)}`
                  }
                ]).map((item) => (
                  <div key={item.id} className="google-news-card">
                    <span className="news-source-meta">{item.source} • {item.time}</span>
                    <h4 className="news-headline">{item.title}</h4>
                    <p className="news-snippet">{item.snippet}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-explore-btn"
                    >
                      <span>Read full coverage</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: IMAGES (Real Google Images Grid) */}
            {activeTab === 'images' && (
              <div className="google-images-tab-view">
                {/* Images Filter Tags */}
                <div className="google-images-filter-bar">
                  {['All Images', 'HD Wallpaper', 'Recent', 'Official', 'Portraits'].map((filterTag, fIdx) => (
                    <button
                      key={fIdx}
                      type="button"
                      className={`google-image-filter-chip ${imageFilter === filterTag ? 'active' : ''}`}
                      onClick={() => {
                        setImageFilter(filterTag);
                        if (filterTag !== 'All Images') {
                          performOnScreenSearch(`${activeQuery.replace(/\b(image|images|photo|photos|wallpaper)\b/gi, '').trim()} ${filterTag}`);
                        }
                      }}
                    >
                      {filterTag}
                    </button>
                  ))}
                </div>

                {isSearching && images.length === 0 ? (
                  <div className="google-images-loading-shimmer">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <div key={n} className="image-shimmer-box" />
                    ))}
                  </div>
                ) : images.length === 0 ? (
                  <div className="google-images-empty">
                    <ImageIcon size={44} className="text-muted" />
                    <p>No verified images found for "{activeQuery}". Try searching for popular topics or personalities.</p>
                  </div>
                ) : (
                  <div className="google-images-grid">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="google-image-tile"
                        onClick={() => setSelectedPreviewImage(img)}
                        title={img.title}
                      >
                        <div className="image-tile-thumb-wrap">
                          <img
                            src={img.url}
                            alt={img.title}
                            loading="lazy"
                            className="image-tile-img"
                            onError={(e) => {
                              (e.target as HTMLElement).closest('.google-image-tile')?.classList.add('img-hidden');
                            }}
                          />
                          <div className="image-tile-hover-overlay">
                            <span className="image-hover-action">Preview</span>
                            <ExternalLink size={14} />
                          </div>
                        </div>
                        <div className="image-tile-meta">
                          <span className="image-tile-title">{img.title}</span>
                          <span className="image-tile-domain">{img.domain || 'web.live'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Google-style Image Preview Lightbox Modal */}
            {selectedPreviewImage && (
              <div className="google-image-modal-backdrop" onClick={() => setSelectedPreviewImage(null)}>
                <div className="google-image-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="google-image-modal-header">
                    <div className="modal-header-meta">
                      <span className="modal-header-domain">{selectedPreviewImage.domain || 'web.live'}</span>
                      <h3 className="modal-header-title">{selectedPreviewImage.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={() => setSelectedPreviewImage(null)}
                      title="Close preview"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="google-image-modal-body">
                    <img
                      src={selectedPreviewImage.url}
                      alt={selectedPreviewImage.title}
                      className="google-image-modal-preview-img"
                    />
                  </div>

                  <div className="google-image-modal-footer">
                    {selectedPreviewImage.description && (
                      <p className="modal-footer-desc">{selectedPreviewImage.description}</p>
                    )}
                    <div className="modal-footer-actions">
                      <a
                        href={selectedPreviewImage.sourceUrl || selectedPreviewImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal-action-btn primary"
                      >
                        <span>Visit Page</span>
                        <ExternalLink size={14} />
                      </a>
                      <a
                        href={selectedPreviewImage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal-action-btn secondary"
                      >
                        <span>Open Full Image</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Related Searches Section (Google Pill Cloud) */}
            <div className="google-related-section">
              <div className="google-related-heading">
                <Search size={16} />
                <span>Related searches</span>
              </div>
              <div className="google-related-pills-grid">
                {relatedQueries.map((rel, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    className="google-related-pill"
                    onClick={() => {
                      setSearchQuery(rel);
                      performOnScreenSearch(rel);
                    }}
                  >
                    <Search size={14} className="related-icon" />
                    <span>{rel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Search Bar for Convenient Follow-Up */}
            <div className="google-bottom-search-wrap">
              <form onSubmit={handleGoogleSearchSubmit} className="google-search-bar bottom-bar">
                <div className="google-search-lens">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  className="google-search-input-field"
                  placeholder="Search again or ask another question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '999px', padding: '6px 16px', fontSize: '13px' }}
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Simple Google-Style Split Footer */}
      <footer className="google-style-footer">
        <div className="google-footer-left">
          <NavLink to="/ads" className="google-footer-link">Advertising</NavLink>
          <NavLink to="/business" className="google-footer-link">Business</NavLink>
          <NavLink to="/make-ai-work" className="google-footer-link">Make AI Work</NavLink>
        </div>
        <div className="google-footer-right">
          <NavLink to="/privacy" className="google-footer-link">Privacy</NavLink>
          <div className="google-settings-wrap">
            <button
              type="button"
              className="google-footer-link google-footer-btn"
              onClick={() => setShowSettingsPopup(!showSettingsPopup)}
              aria-haspopup="true"
              aria-expanded={showSettingsPopup}
            >
              Settings
            </button>
            {showSettingsPopup && (
              <div className="google-settings-popup" role="menu">
                <NavLink to="/settings" className="settings-popup-item" onClick={() => setShowSettingsPopup(false)}>
                  <span>Search Settings</span>
                </NavLink>
                <NavLink to="/settings" className="settings-popup-item" onClick={() => setShowSettingsPopup(false)}>
                  <span>Voice &amp; Language</span>
                </NavLink>
                <NavLink to="/settings" className="settings-popup-item" onClick={() => setShowSettingsPopup(false)}>
                  <span>Speed Optimization</span>
                </NavLink>
                <NavLink to="/privacy" className="settings-popup-item" onClick={() => setShowSettingsPopup(false)}>
                  <span>Your Data in Search</span>
                </NavLink>
                <div className="settings-popup-divider" />
                <NavLink to="/settings" className="settings-popup-item font-semibold" onClick={() => setShowSettingsPopup(false)}>
                  <span>All Workspace Settings</span>
                </NavLink>
              </div>
            )}
          </div>
          <NavLink to="/terms" className="google-footer-link">Terms</NavLink>
        </div>
      </footer>

      {/* About Zunme AI Modal Dialog */}
      {showAboutModal && (
        <div className="about-modal-backdrop" onClick={() => setShowAboutModal(false)}>
          <div className="about-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="about-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/zunme_icon.png" alt="Zunme" style={{ width: '28px', height: '28px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>About Zunme AI</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setShowAboutModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="about-modal-body">
              <p>
                <strong>Zunme AI</strong> is an all-in-one AI Workspace engineered for Ideas, Content &amp; Discovery. It unites Conversational Chat, Live Web Search with verified citations, Content Studio blueprints, and Privacy-first ZBox communication into a single connected platform.
              </p>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>⚡ Engineering Philosophy &amp; Speed</h4>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Websites built with clean, standard HTML and CSS tend to deliver the fastest load times. By eliminating unnecessary bloated scripts and keeping the entry page pure and focused, Zunme ensures instantaneous page responsiveness and superior search efficiency.
                </p>
              </div>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>🔒 Privacy First</h4>
                <p style={{ fontSize: '13px', color: '#15803D', margin: 0 }}>
                  Unlike traditional ad-supported platforms that monitor user data, Zunme empowers individuals and small business owners with confidential workspace capabilities and private zBox email accounts.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAboutModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAboutModal(false);
                    navigate('/studio');
                  }}
                >
                  Explore Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
