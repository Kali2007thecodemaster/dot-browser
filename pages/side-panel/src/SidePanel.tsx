/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { FiMenu } from 'react-icons/fi';
import { type Message, Actors, chatHistoryStore, agentModelStore, generalSettingsStore } from '@extension/storage';
import { t } from '@extension/i18n';
import MessageList from './components/MessageList';
import LiveStatusBar from './components/LiveStatusBar';
import ChatInput from './components/ChatInput';
import ChatHistoryList from './components/ChatHistoryList';
import TopBar from './components/TopBar';
import SideNav from './components/SideNav';
import WorkflowPicker from './components/WorkflowPicker';
import ResultsList from './components/ResultsList';
import WatchList from './components/WatchList';
import ScheduledTaskList from './components/ScheduledTaskList';
import { EventType, type AgentEvent, ExecutionState } from './types/event';
import './SidePanel.css';

// Declare chrome API types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

const truncateStatus = (text: string, max = 60): string => {
  const line = text.split('\n')[0].trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
};

function parseBatchInput(text: string): { urls: string[]; instruction: string } | null {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const urlPattern = /^https?:\/\/\S+$/;
  const urls = lines.filter(l => urlPattern.test(l));
  const instructionLines = lines.filter(l => !urlPattern.test(l));
  if (urls.length >= 2 && instructionLines.length >= 1) {
    return { urls, instruction: instructionLines.join(' ') };
  }
  return null;
}

const SidePanel = () => {
  const progressMessage = 'Showing progress...';
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveStatus, setLiveStatus] = useState<{ actor: string; text: string } | null>(null);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [showStopButton, setShowStopButton] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; title: string; createdAt: number }>>([]);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [isHistoricalSession, setIsHistoricalSession] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Boot screen removed — the side panel opens straight into chat. setup_executor
  // fires once on mount (see effect below) so the background service worker spins up
  // the agent runtime (was previously triggered by the manual INITIALIZE button).
  const [showResults, setShowResults] = useState(false);
  const [showWatches, setShowWatches] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [hasConfiguredModels, setHasConfiguredModels] = useState<boolean | null>(null); // null = loading, false = no models, true = has models
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const isReplayingRef = useRef<boolean>(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const setInputTextRef = useRef<((text: string) => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const batchQueueRef = useRef<{ urls: string[]; instruction: string; index: number } | null>(null);
  const activeTabIdRef = useRef<number | null>(null);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check if models are configured
  const checkModelConfiguration = useCallback(async () => {
    try {
      const configuredAgents = await agentModelStore.getConfiguredAgents();

      // Check if at least one agent (preferably Navigator) is configured
      const hasAtLeastOneModel = configuredAgents.length > 0;
      setHasConfiguredModels(hasAtLeastOneModel);
    } catch (error) {
      console.error('Error checking model configuration:', error);
      setHasConfiguredModels(false);
    }
  }, []);

  // Load general settings to check if replay is enabled
  const loadGeneralSettings = useCallback(async () => {
    try {
      const settings = await generalSettingsStore.getSettings();
      setReplayEnabled(settings.replayHistoricalTasks);
    } catch (error) {
      console.error('Error loading general settings:', error);
      setReplayEnabled(false);
    }
  }, []);

  // Check model configuration on mount
  useEffect(() => {
    checkModelConfiguration();
    loadGeneralSettings();
  }, [checkModelConfiguration, loadGeneralSettings]);

  // Context menu pre-fill: check for a payload passed from a context-menu action.
  // Two shapes are supported:
  //   { text, pageUrl } — selection-based "Ask Dot about [selection]" entry; we quote
  //     it so the user can frame their question.
  //   { task, pageUrl } — fully-formed task from the "download this link" /
  //     "summarize this page" / "fill this form" entries; we drop it straight into
  //     the input box. The user still has to hit send, so they keep control.
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const result = await chrome.storage.session.get('dotContextMenuPending');
        const pending = result.dotContextMenuPending as { text?: string; task?: string; pageUrl?: string } | undefined;
        if (!pending || !setInputTextRef.current) return;
        let prefill = '';
        if (pending.task) {
          prefill = pending.task;
        } else if (pending.text) {
          prefill = `"${pending.text.slice(0, 300)}"${pending.pageUrl ? `\n(from ${pending.pageUrl})` : ''}`;
        }
        if (prefill) {
          setInputTextRef.current(prefill);
          await chrome.storage.session.remove('dotContextMenuPending');
        }
      } catch {
        // storage.session not available (non-Chrome env)
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Re-check model configuration when the side panel becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Panel became visible, re-check configuration and settings
        checkModelConfiguration();
        loadGeneralSettings();
      }
    };

    const handleFocus = () => {
      // Panel gained focus, re-check configuration and settings
      checkModelConfiguration();
      loadGeneralSettings();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkModelConfiguration, loadGeneralSettings]);

  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    isReplayingRef.current = isReplaying;
  }, [isReplaying]);

  const appendMessage = useCallback((newMessage: Message, sessionId?: string | null) => {
    // Don't save progress messages
    const isProgressMessage = newMessage.content === progressMessage;

    setMessages(prev => {
      const filteredMessages = prev.filter((msg, idx) => !(msg.content === progressMessage && idx === prev.length - 1));
      return [...filteredMessages, newMessage];
    });

    // Use provided sessionId if available, otherwise fall back to sessionIdRef.current
    const effectiveSessionId = sessionId !== undefined ? sessionId : sessionIdRef.current;

    console.log('sessionId', effectiveSessionId);

    // Save message to storage if we have a session and it's not a progress message
    if (effectiveSessionId && !isProgressMessage) {
      chatHistoryStore
        .addMessage(effectiveSessionId, newMessage)
        .catch(err => console.error('Failed to save message to history:', err));
    }
  }, []);

  const handleTaskState = useCallback(
    (event: AgentEvent) => {
      const { actor, state, timestamp, data } = event;
      const content = data?.details;
      let skip = true;
      let displayProgress = false;

      switch (actor) {
        case Actors.SYSTEM:
          switch (state) {
            case ExecutionState.TASK_START:
              setIsHistoricalSession(false);
              break;
            case ExecutionState.TASK_OK: {
              const bq = batchQueueRef.current;
              if (bq && bq.index + 1 < bq.urls.length) {
                const nextIdx = bq.index + 1;
                batchQueueRef.current = { ...bq, index: nextIdx };
                const nextUrl = bq.urls[nextIdx];
                setLiveStatus({
                  actor: 'BATCH',
                  text: `${nextIdx + 1}/${bq.urls.length} · ${truncateStatus(nextUrl, 45)}`,
                });
                appendMessage({ actor: Actors.USER, content: `→ ${nextUrl}`, timestamp: Date.now() });
                portRef.current?.postMessage({
                  type: 'follow_up_task',
                  task: `${nextUrl}\n${bq.instruction}`,
                  taskId: sessionIdRef.current,
                  tabId: activeTabIdRef.current,
                });
              } else {
                batchQueueRef.current = null;
                setLiveStatus(null);
                setIsFollowUpMode(true);
                setInputEnabled(true);
                setShowStopButton(false);
                setIsReplaying(false);
                // Show the agent's completion message (finalAnswer), but not the UUID fallback.
                // Render it as a regular agent message (via AgentMessage → MarkdownText) — not as
                // a SYSTEM status pill — so it appears as proper chat text with paragraphs / bullets.
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(content ?? '');
                if (content && !isUUID) {
                  appendMessage({
                    actor: Actors.PLANNER,
                    content,
                    timestamp,
                  });
                  // Skip the default SYSTEM append below so we don't double-render.
                  skip = true;
                }
              }
              break;
            }
            case ExecutionState.TASK_FAIL: {
              const bq = batchQueueRef.current;
              if (bq && bq.index + 1 < bq.urls.length) {
                const nextIdx = bq.index + 1;
                batchQueueRef.current = { ...bq, index: nextIdx };
                const nextUrl = bq.urls[nextIdx];
                setLiveStatus({
                  actor: 'BATCH',
                  text: `${nextIdx + 1}/${bq.urls.length} · ${truncateStatus(nextUrl, 45)}`,
                });
                appendMessage({ actor: Actors.USER, content: `→ ${nextUrl}`, timestamp: Date.now() });
                portRef.current?.postMessage({
                  type: 'follow_up_task',
                  task: `${nextUrl}\n${bq.instruction}`,
                  taskId: sessionIdRef.current,
                  tabId: activeTabIdRef.current,
                });
              } else {
                batchQueueRef.current = null;
                setLiveStatus(null);
                setIsFollowUpMode(true);
                setInputEnabled(true);
                setShowStopButton(false);
                setIsReplaying(false);
              }
              skip = false;
              break;
            }
            case ExecutionState.TASK_CANCEL:
              batchQueueRef.current = null;
              setLiveStatus(null);
              setIsFollowUpMode(false);
              setInputEnabled(true);
              setShowStopButton(false);
              setIsReplaying(false);
              skip = false;
              break;
            case ExecutionState.TASK_PAUSE:
              break;
            case ExecutionState.TASK_RESUME:
              break;
            default:
              console.error('Invalid task state', state);
              return;
          }
          break;
        case Actors.USER:
          break;
        case Actors.PLANNER:
          switch (state) {
            case ExecutionState.STEP_START:
              setLiveStatus({ actor: 'PLANNER', text: 'Planning your task…' });
              break;
            case ExecutionState.STEP_OK:
              setLiveStatus({ actor: 'PLANNER', text: truncateStatus(content || 'Plan ready') });
              break;
            case ExecutionState.STEP_FAIL:
              skip = false;
              break;
            case ExecutionState.STEP_CANCEL:
              break;
            default:
              console.error('Invalid step state', state);
              return;
          }
          break;
        case Actors.NAVIGATOR:
          switch (state) {
            case ExecutionState.STEP_START:
              setLiveStatus({ actor: 'NAVIGATOR', text: 'Executing step…' });
              break;
            case ExecutionState.STEP_OK:
              break;
            case ExecutionState.STEP_FAIL:
              skip = false;
              break;
            case ExecutionState.STEP_CANCEL:
              break;
            case ExecutionState.ACT_START:
              if (content !== 'cache_content') {
                setLiveStatus({ actor: 'NAVIGATOR', text: truncateStatus(content || 'Acting…') });
              }
              break;
            case ExecutionState.ACT_OK:
              if (content?.startsWith('DOT_RESULTS_SAVED::')) {
                skip = false;
              } else {
                skip = !isReplayingRef.current;
              }
              break;
            case ExecutionState.ACT_FAIL:
              skip = false;
              break;
            default:
              console.error('Invalid action', state);
              return;
          }
          break;
        case Actors.VALIDATOR:
          switch (state) {
            case ExecutionState.STEP_START:
              setLiveStatus({ actor: 'VALIDATOR', text: 'Validating result…' });
              break;
            case ExecutionState.STEP_OK:
              setLiveStatus({ actor: 'VALIDATOR', text: 'Result validated' });
              break;
            case ExecutionState.STEP_FAIL:
              skip = false;
              break;
            default:
              console.error('Invalid validation', state);
              return;
          }
          break;
        default:
          console.error('Unknown actor', actor);
          return;
      }

      if (!skip) {
        appendMessage({
          actor,
          content: content || '',
          timestamp: timestamp,
        });
      }

      if (displayProgress) {
        appendMessage({
          actor,
          content: progressMessage,
          timestamp: timestamp,
        });
      }
    },
    [appendMessage],
  );

  // Auto-run the previous handleBoot logic on mount.
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'setup_executor' }).catch(() => {});
  }, []);

  // Stop heartbeat and close connection
  const stopConnection = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (portRef.current) {
      portRef.current.disconnect();
      portRef.current = null;
    }
  }, []);

  // Setup connection management
  const setupConnection = useCallback(() => {
    // Only setup if no existing connection
    if (portRef.current) {
      return;
    }

    try {
      portRef.current = chrome.runtime.connect({ name: 'side-panel-connection' });

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      portRef.current.onMessage.addListener((message: any) => {
        // Add type checking for message
        if (message && message.type === EventType.EXECUTION) {
          handleTaskState(message);
        } else if (message && message.type === 'error') {
          // Handle error messages from service worker
          appendMessage({
            actor: Actors.SYSTEM,
            content: message.error || t('errors_unknown'),
            timestamp: Date.now(),
          });
          setInputEnabled(true);
          setShowStopButton(false);
        } else if (message && message.type === 'speech_to_text_result') {
          // Handle speech-to-text result
          if (message.text && setInputTextRef.current) {
            setInputTextRef.current(message.text);
          }
          setIsProcessingSpeech(false);
        } else if (message && message.type === 'speech_to_text_error') {
          // Handle speech-to-text error
          appendMessage({
            actor: Actors.SYSTEM,
            content: message.error || t('chat_stt_recognitionFailed'),
            timestamp: Date.now(),
          });
          setIsProcessingSpeech(false);
        } else if (message && message.type === 'heartbeat_ack') {
          console.log('Heartbeat acknowledged');
        }
      });

      portRef.current.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        console.log('Connection disconnected', error ? `Error: ${error.message}` : '');
        portRef.current = null;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        setInputEnabled(true);
        setShowStopButton(false);
      });

      // Setup heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = window.setInterval(() => {
        if (portRef.current?.name === 'side-panel-connection') {
          try {
            portRef.current.postMessage({ type: 'heartbeat' });
          } catch (error) {
            console.error('Heartbeat failed:', error);
            stopConnection(); // Stop connection if heartbeat fails
          }
        } else {
          stopConnection(); // Stop if port is invalid
        }
      }, 25000);
    } catch (error) {
      console.error('Failed to establish connection:', error);
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('errors_conn_serviceWorker'),
        timestamp: Date.now(),
      });
      // Clear any references since connection failed
      portRef.current = null;
    }
  }, [handleTaskState, appendMessage, stopConnection]);

  // Add safety check for message sending
  const sendMessage = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (message: any) => {
      if (portRef.current?.name !== 'side-panel-connection') {
        throw new Error('No valid connection available');
      }
      try {
        portRef.current.postMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error);
        stopConnection(); // Stop connection when message sending fails
        throw error;
      }
    },
    [stopConnection],
  );

  // Handle replay command
  const handleReplay = async (historySessionId: string): Promise<void> => {
    try {
      // Check if replay is enabled in settings
      if (!replayEnabled) {
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_replay_disabled'),
          timestamp: Date.now(),
        });
        return;
      }

      // Check if history exists using loadAgentStepHistory
      const historyData = await chatHistoryStore.loadAgentStepHistory(historySessionId);
      if (!historyData) {
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_replay_noHistory', historySessionId.substring(0, 20)),
          timestamp: Date.now(),
        });
        return;
      }

      // Get current tab ID
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (!tabId) {
        throw new Error('No active tab found');
      }

      // Clear messages if we're in a historical session
      if (isHistoricalSession) {
        setMessages([]);
      }

      // Create a new chat session for this replay task
      const newSession = await chatHistoryStore.createSession(`Replay of ${historySessionId.substring(0, 20)}...`);
      console.log('newSession for replay', newSession);

      // Store the new session ID in both state and ref
      const newTaskId = newSession.id;
      setCurrentSessionId(newTaskId);
      sessionIdRef.current = newTaskId;

      // Send replay command to background
      setInputEnabled(false);
      setShowStopButton(true);

      // Reset follow-up mode and historical session flags
      setIsFollowUpMode(false);
      setIsHistoricalSession(false);

      const userMessage = {
        actor: Actors.USER,
        content: `/replay ${historySessionId}`,
        timestamp: Date.now(),
      };

      // Add the user message to the new session
      appendMessage(userMessage, sessionIdRef.current);

      // Setup connection if not exists
      if (!portRef.current) {
        setupConnection();
      }

      // Send replay command to background with the task from history
      portRef.current?.postMessage({
        type: 'replay',
        taskId: newTaskId,
        tabId: tabId,
        historySessionId: historySessionId,
        task: historyData.task, // Add the task from history
      });

      appendMessage({
        actor: Actors.SYSTEM,
        content: t('chat_replay_starting', historyData.task),
        timestamp: Date.now(),
      });
      setIsReplaying(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('chat_replay_failed', errorMessage),
        timestamp: Date.now(),
      });
    }
  };

  // Handle chat commands that start with /
  const handleCommand = async (command: string): Promise<boolean> => {
    try {
      // Setup connection if not exists
      if (!portRef.current) {
        setupConnection();
      }

      // Handle different commands
      if (command === '/state') {
        portRef.current?.postMessage({
          type: 'state',
        });
        return true;
      }

      if (command === '/nohighlight') {
        portRef.current?.postMessage({
          type: 'nohighlight',
        });
        return true;
      }

      if (command.startsWith('/replay ')) {
        // Parse replay command: /replay <historySessionId>
        // Handle multiple spaces by filtering out empty strings
        const parts = command.split(' ').filter(part => part.trim() !== '');
        if (parts.length !== 2) {
          appendMessage({
            actor: Actors.SYSTEM,
            content: t('chat_replay_invalidArgs'),
            timestamp: Date.now(),
          });
          return true;
        }

        const historySessionId = parts[1];
        await handleReplay(historySessionId);
        return true;
      }

      // Unsupported command
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('errors_cmd_unknown', command),
        timestamp: Date.now(),
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Command error', errorMessage);
      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
      return true;
    }
  };

  const handleMarkdownSnapshot = async () => {
    if (!inputEnabled || isHistoricalSession) return;
    await handleSendMessage(
      'Extract the main content of the current page as clean markdown. Include the page title as an h1, preserve headings, key links (as [text](url)), and important text. Omit navigation menus, cookie banners, ads, footers, and boilerplate. Return only the markdown, no extra commentary.',
      'Snapshot → markdown',
    );
  };

  const handleSendMessage = async (text: string, displayText?: string) => {
    console.log('handleSendMessage', text);

    // Trim the input text first
    const trimmedText = text.trim();

    if (!trimmedText) return;

    // Check if the input is a command (starts with /)
    if (trimmedText.startsWith('/')) {
      // Process command and return if it was handled
      const wasHandled = await handleCommand(trimmedText);
      if (wasHandled) return;
    }

    // Block sending messages in historical sessions
    if (isHistoricalSession) {
      console.log('Cannot send messages in historical sessions');
      return;
    }

    // Detect batch mode: 2+ URL lines + at least 1 instruction line
    const batch = parseBatchInput(trimmedText);
    const effectiveTask = batch ? `${batch.urls[0]}\n${batch.instruction}` : trimmedText;
    const effectiveDisplay = batch
      ? `Batch · ${batch.urls.length} URLs: ${batch.instruction.slice(0, 40)}${batch.instruction.length > 40 ? '…' : ''}`
      : (displayText ?? trimmedText);
    if (batch) {
      batchQueueRef.current = { ...batch, index: 0 };
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      const tabId = activeTab?.id;
      if (!tabId) {
        throw new Error('No active tab found');
      }
      activeTabIdRef.current = tabId;

      // Prepend current page context so the planner knows where the user is without a navigation step
      const pageCtx =
        activeTab?.url && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')
          ? `[Current page: "${activeTab.title ?? ''}" | ${activeTab.url} | tab_id: ${tabId}]\n`
          : '';
      const taskWithContext = pageCtx + effectiveTask;

      setInputEnabled(false);
      setShowStopButton(true);

      // Create a new chat session for this task if not in follow-up mode,
      // unless we're continuing an existing historical session (sessionIdRef already set).
      if (!isFollowUpMode && !sessionIdRef.current) {
        // Use effective display text for session title
        const titleText = effectiveDisplay;
        const newSession = await chatHistoryStore.createSession(
          titleText.substring(0, 50) + (titleText.length > 50 ? '...' : ''),
        );
        console.log('newSession', newSession);

        // Store the session ID in both state and ref
        const sessionId = newSession.id;
        setCurrentSessionId(sessionId);
        sessionIdRef.current = sessionId;
      }

      const userMessage = {
        actor: Actors.USER,
        content: effectiveDisplay,
        timestamp: Date.now(),
      };

      // Pass the sessionId directly to appendMessage
      appendMessage(userMessage, sessionIdRef.current);

      // Setup connection if not exists
      if (!portRef.current) {
        setupConnection();
      }

      // Send message using the utility function
      if (isFollowUpMode) {
        // Send as follow-up task
        await sendMessage({
          type: 'follow_up_task',
          task: taskWithContext,
          taskId: sessionIdRef.current,
          tabId,
        });
        console.log('follow_up_task sent', taskWithContext, tabId, sessionIdRef.current);
      } else {
        // Send as new task
        await sendMessage({
          type: 'new_task',
          task: taskWithContext,
          taskId: sessionIdRef.current,
          tabId,
        });
        console.log('new_task sent', taskWithContext, tabId, sessionIdRef.current);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Task error', errorMessage);
      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
      setInputEnabled(true);
      setShowStopButton(false);
      stopConnection();
    }
  };

  const handleStopTask = async () => {
    try {
      portRef.current?.postMessage({
        type: 'cancel_task',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('cancel_task error', errorMessage);
      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
    }
    setInputEnabled(true);
    setShowStopButton(false);
  };

  const handleNewChat = () => {
    // Clear messages and start a new chat
    setMessages([]);
    setCurrentSessionId(null);
    sessionIdRef.current = null;
    setInputEnabled(true);
    setShowStopButton(false);
    setIsFollowUpMode(false);
    setIsHistoricalSession(false);

    // Disconnect any existing connection
    stopConnection();
  };

  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await chatHistoryStore.getSessionsMetadata();
      setChatSessions(sessions.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, []);

  const handleLoadHistory = async () => {
    await loadChatSessions();
    setShowResults(false);
    setShowWatches(false);
    setShowSchedules(false);
    setShowHistory(true);
  };

  const handleOpenResults = () => {
    setShowHistory(false);
    setShowWatches(false);
    setShowSchedules(false);
    setShowResults(true);
  };

  const handleOpenWatches = () => {
    setShowHistory(false);
    setShowResults(false);
    setShowSchedules(false);
    setShowWatches(true);
  };

  const handleOpenSchedules = () => {
    setShowHistory(false);
    setShowResults(false);
    setShowWatches(false);
    setShowSchedules(true);
  };

  const handleBackToChat = (reset = false) => {
    setShowHistory(false);
    setShowResults(false);
    setShowWatches(false);
    setShowSchedules(false);
    if (reset) {
      setCurrentSessionId(null);
      setMessages([]);
      setIsFollowUpMode(false);
      setIsHistoricalSession(false);
    }
  };

  const handleContinueSession = useCallback(() => {
    setIsHistoricalSession(false);
    // currentSessionId / sessionIdRef already point to the loaded session —
    // handleSendMessage will reuse them instead of creating a new session.
  }, []);

  const handleSessionSelect = async (sessionId: string) => {
    try {
      const fullSession = await chatHistoryStore.getSession(sessionId);
      if (fullSession && fullSession.messages.length > 0) {
        setCurrentSessionId(fullSession.id);
        setMessages(fullSession.messages);
        setIsFollowUpMode(false);
        setIsHistoricalSession(true); // Mark this as a historical session
        console.log('history session selected', sessionId);
      }
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      await chatHistoryStore.deleteSession(sessionId);
      await loadChatSessions();
      if (sessionId === currentSessionId) {
        setMessages([]);
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      stopConnection();
    };
  }, [stopConnection]);

  // Scroll to bottom when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Clear the timer
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    try {
      // First check if permission is already granted
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (permissionStatus.state === 'denied') {
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_stt_microphone_permissionDenied'),
          timestamp: Date.now(),
        });
        return;
      }

      // If permission is not granted, open permission page
      if (permissionStatus.state !== 'granted') {
        const permissionUrl = chrome.runtime.getURL('permission/index.html');

        // Open permission page in a new window
        chrome.windows.create(
          {
            url: permissionUrl,
            type: 'popup',
            width: 500,
            height: 600,
          },
          createdWindow => {
            if (createdWindow?.id) {
              // Listen for window close to check permission status
              chrome.windows.onRemoved.addListener(function onWindowClose(windowId) {
                if (windowId === createdWindow.id) {
                  chrome.windows.onRemoved.removeListener(onWindowClose);
                  // Check permission status after window closes
                  setTimeout(async () => {
                    try {
                      const newPermissionStatus = await navigator.permissions.query({
                        name: 'microphone' as PermissionName,
                      });
                      // Only retry if permission was granted
                      if (newPermissionStatus.state === 'granted') {
                        handleMicClick();
                      }
                      // If denied or prompt, do nothing - let user manually try again
                    } catch (error) {
                      console.error('Failed to check permission status:', error);
                    }
                  }, 500);
                }
              });
            }
          },
        );
        return;
      }

      // Permission granted - proceed with recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Clear previous audio chunks
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle stop event
      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0) {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;

            // Setup connection if not exists
            if (!portRef.current) {
              setupConnection();
            }

            // Send audio to backend for speech-to-text conversion
            try {
              setIsProcessingSpeech(true);
              portRef.current?.postMessage({
                type: 'speech_to_text',
                audio: base64Audio,
              });
            } catch (error) {
              console.error('Failed to send audio for speech-to-text:', error);
              appendMessage({
                actor: Actors.SYSTEM,
                content: t('chat_stt_processingFailed'),
                timestamp: Date.now(),
              });
              setIsRecording(false);
              setIsProcessingSpeech(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      // Set up 2-minute duration limit
      const maxDuration = 2 * 60 * 1000;
      recordingTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsProcessingSpeech(true);
        recordingTimerRef.current = null;
      }, maxDuration);

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);

      let errorMessage = t('chat_stt_microphone_accessFailed');
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += t('chat_stt_microphone_grantPermission');
        } else if (error.name === 'NotFoundError') {
          errorMessage += t('chat_stt_microphone_notFound');
        } else {
          errorMessage += error.message;
        }
      }

      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
      setIsRecording(false);
    }
  };

  return (
    <div
      data-theme={isDarkMode ? 'dark' : undefined}
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
        fontFamily: 'Manrope, sans-serif',
        position: 'relative',
      }}>
      {/* Chat shell — straight into chat, no boot screen */}
      <div className="flex h-full flex-col">
        <TopBar
          isDarkMode={isDarkMode}
          onToggleDark={() => setIsDarkMode(prev => !prev)}
          isAgentActive={showStopButton}
          onLogoClick={handleNewChat}
        />
        <header className="header relative">
          <div className="header-logo">
            {showHistory || showResults || showWatches || showSchedules ? (
              <button
                type="button"
                onClick={() => handleBackToChat(false)}
                className="header-icon cursor-pointer"
                aria-label={t('nav_back_a11y')}>
                {t('nav_back')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsNavOpen(true)}
                className="header-icon cursor-pointer"
                aria-label="Open menu"
                title="Open menu"
                tabIndex={0}>
                <FiMenu size={20} />
              </button>
            )}
          </div>
          <div className="header-icons">
            <div className="dot-logo" style={{ width: 8, height: 8 }} />
          </div>
        </header>
        <SideNav
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          onNewChat={handleNewChat}
          onLoadHistory={handleLoadHistory}
          onOpenResults={handleOpenResults}
          onOpenWatches={handleOpenWatches}
          onOpenSchedules={handleOpenSchedules}
          onMarkdownSnapshot={handleMarkdownSnapshot}
          onOpenSettings={() => chrome.runtime.openOptionsPage()}
          snapshotEnabled={inputEnabled && !isHistoricalSession}
        />
        {showWatches ? (
          <div className="flex-1 overflow-hidden">
            <WatchList onClose={() => setShowWatches(false)} />
          </div>
        ) : showSchedules ? (
          <div className="flex-1 overflow-hidden">
            <ScheduledTaskList
              onClose={() => setShowSchedules(false)}
              onRunTask={taskDescription => {
                setShowSchedules(false);
                handleSendMessage(taskDescription);
              }}
            />
          </div>
        ) : showResults ? (
          <div className="flex-1 overflow-hidden">
            <ResultsList onClose={() => setShowResults(false)} />
          </div>
        ) : showHistory ? (
          <div className="flex-1 overflow-hidden">
            <ChatHistoryList
              sessions={chatSessions}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              onSessionBookmark={() => {}}
              visible={true}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <>
            {/* Show loading state while checking model configuration */}
            {hasConfiguredModels === null && (
              <div className="flex flex-1 items-center justify-center p-8 text-muted">
                <div className="text-center">
                  <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-amber border-t-transparent"></div>
                  <p>{t('status_checkingConfig')}</p>
                </div>
              </div>
            )}

            {/* Show setup message when no models are configured */}
            {hasConfiguredModels === false && (
              <div className="flex flex-1 items-center justify-center p-8 text-muted">
                <div className="max-w-md text-center">
                  <div className="dot-logo mx-auto mb-6" style={{ width: 36, height: 36 }} />
                  <h3 className="mb-2 text-lg font-semibold text-ink">{t('welcome_title')}</h3>
                  <p className="mb-4">{t('welcome_instruction')}</p>
                  <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className="my-4 rounded px-4 py-2 font-medium transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                    {t('welcome_openSettings')}
                  </button>
                </div>
              </div>
            )}

            {/* Show normal chat interface when models are configured */}
            {hasConfiguredModels === true && (
              <>
                {messages.length === 0 && (
                  <>
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      <div className="flex flex-col items-center px-6 pt-10 pb-4">
                        <div className="dot-logo mb-3" style={{ width: 14, height: 14 }} />
                        <div
                          className="font-display mb-1"
                          style={{ fontSize: 22, letterSpacing: '0.06em', color: 'var(--text)', lineHeight: 1 }}>
                          DOT
                        </div>
                        <div className="label-mono mt-1" style={{ color: 'var(--muted)' }}>
                          YOUR PERSONAL AGENT
                        </div>
                      </div>
                      <WorkflowPicker
                        onSendMessage={handleSendMessage}
                        disabled={!inputEnabled || isHistoricalSession}
                      />
                    </div>
                    <div className="border-t border-line p-3 backdrop-blur-sm shrink-0">
                      <ChatInput
                        onSendMessage={handleSendMessage}
                        onStopTask={handleStopTask}
                        onMicClick={handleMicClick}
                        isRecording={isRecording}
                        isProcessingSpeech={isProcessingSpeech}
                        disabled={!inputEnabled || isHistoricalSession}
                        showStopButton={showStopButton}
                        setContent={setter => {
                          setInputTextRef.current = setter;
                        }}
                        isDarkMode={isDarkMode}
                        historicalSessionId={isHistoricalSession && replayEnabled ? currentSessionId : null}
                        onReplay={handleReplay}
                      />
                    </div>
                  </>
                )}
                {messages.length > 0 && (
                  <div className="scrollbar-gutter-stable flex-1 overflow-x-hidden overflow-y-scroll scroll-smooth p-3">
                    <MessageList
                      messages={messages}
                      isDarkMode={isDarkMode}
                      onRetry={userContent => {
                        if (!inputEnabled || isHistoricalSession) return;
                        handleSendMessage(userContent);
                      }}
                      onEdit={userContent => {
                        if (isHistoricalSession) return;
                        setInputTextRef.current?.(userContent);
                      }}
                      actionsDisabled={!inputEnabled || isHistoricalSession}
                    />
                    {liveStatus && <LiveStatusBar actor={liveStatus.actor} text={liveStatus.text} />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                {messages.length > 0 && isHistoricalSession && (
                  <div
                    className="flex items-center justify-between px-3 shrink-0"
                    style={{
                      paddingTop: 7,
                      paddingBottom: 7,
                      borderTop: '1px solid var(--line)',
                      background: 'var(--surface)',
                    }}>
                    <span className="label-mono" style={{ color: 'var(--muted)' }}>
                      PAST SESSION
                    </span>
                    <button
                      type="button"
                      onClick={handleContinueSession}
                      className="label-mono"
                      style={{
                        color: 'var(--accent)',
                        background: 'transparent',
                        border: '1px solid var(--accent)',
                        borderRadius: 3,
                        padding: '2px 8px',
                        cursor: 'pointer',
                      }}>
                      CONTINUE
                    </button>
                  </div>
                )}
                {messages.length > 0 && (
                  <div className="border-t border-line p-3 backdrop-blur-sm shrink-0">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onStopTask={handleStopTask}
                      onMicClick={handleMicClick}
                      isRecording={isRecording}
                      isProcessingSpeech={isProcessingSpeech}
                      disabled={!inputEnabled || isHistoricalSession}
                      showStopButton={showStopButton}
                      setContent={setter => {
                        setInputTextRef.current = setter;
                      }}
                      isDarkMode={isDarkMode}
                      historicalSessionId={isHistoricalSession && replayEnabled ? currentSessionId : null}
                      onReplay={handleReplay}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
