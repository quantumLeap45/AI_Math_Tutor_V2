'use client';

/**
 * Quiz AI Chat Component
 * AI Math Tutor v2
 *
 * Floating AI chat assistant for quiz page.
 * Provides hints and guidance without giving direct answers.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { QuizQuestion } from '@/types';
import { useDailyQuota } from '@/hooks/useDailyQuota';

export interface QuizAIChatProps {
  /** Current quiz question */
  currentQuestion: QuizQuestion | null;
  /** Question number (1-indexed) */
  questionNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function QuizAIChat({ currentQuestion, questionNumber }: QuizAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Daily quota hook
  const { quotaStatus, countdown, consumeQuota } = useDailyQuota();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Add welcome message when chat opens
  // Reset messages when question changes
  useEffect(() => {
    if (isOpen && currentQuestion) {
      // Check if we need to reset (question changed or empty messages)
      const lastMessage = messages[messages.length - 1];
      const questionChanged = lastMessage && messages.length > 0 &&
        !lastMessage.content.includes(`Question ${questionNumber || 1}`);

      if (messages.length === 0 || questionChanged) {
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Hi! I'm here to help you with Question ${questionNumber || 1}. I can give you hints and guide you through the problem, but I won't give you the answer directly. What would you like to explore?`,
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [isOpen, currentQuestion?.id, questionNumber]); // Watch question ID for changes

  const sendMessage = async () => {
    if (!input.trim() || !currentQuestion) return;

    // Check daily quota before sending
    const quotaResult = consumeQuota();
    if (!quotaResult.allowed) {
      setError(`Daily limit reached. Resets in ${countdown?.formatted || '24:00:00'}.`);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Convert QuizOptions object to string array for the API
      const optionsArray = currentQuestion.options
        ? Object.values(currentQuestion.options)
        : undefined;

      const response = await fetch('/api/quiz-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          options: optionsArray,
          message: userMessage.content,
          conversationHistory: messages.slice(-6), // Send last 6 messages for context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Create placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Stream the response with error handling
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // Update the assistant message content
          setMessages(prev =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: assistantContent }
                : m
            )
          );
        }
      } catch (streamError) {
        console.error('Quiz chat streaming error:', streamError);
        setError('Connection lost while receiving response. Please try again.');
        // Remove the incomplete assistant message
        setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('Quiz chat error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      // Remove the loading placeholder message
      setMessages(prev => prev.filter(m => m.role !== 'assistant' || m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Open AI chat assistant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Container */}
          <div className="fixed bottom-0 right-0 z-50 w-full sm:w-96 sm:bottom-6 sm:right-6 h-[70vh] sm:h-[500px] bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-right-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Quiz Helper
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Question {questionNumber || 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Close chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-2
                      ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                      }
                    `}
                  >
                    {message.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-2">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="my-1">{children}</p>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-blue-600 dark:text-blue-400">
                                {children}
                              </strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
                            ),
                            li: ({ children }) => <li className="my-1">{children}</li>,
                            code: ({ children, className }) => {
                              const isCodeBlock = className?.includes('language-');
                              if (isCodeBlock) {
                                return (
                                  <code className="block bg-slate-200 dark:bg-slate-700 p-3 rounded-lg my-2 overflow-x-auto text-sm">
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm">
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error message */}
            {error && (
              <div
                className={`px-4 py-2 border-t ${
                  error.includes('Daily limit')
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <p
                  className={`text-xs text-center ${
                    error.includes('Daily limit')
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {error.includes('Daily limit') ? (
                    <>
                      <span className="font-medium">Daily limit reached</span>
                      {countdown && (
                        <span>
                          {' '}• Resets in{' '}
                          <span className="font-mono font-bold">{countdown.formatted}</span>
                        </span>
                      )}
                    </>
                  ) : (
                    error
                  )}
                  <button
                    onClick={() => setError(null)}
                    className="ml-2 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </p>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a hint..."
                  rows={1}
                  disabled={isLoading || !currentQuestion}
                  className="flex-1 resize-none rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim() || !currentQuestion}
                  className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </div>
              {!currentQuestion && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                  Start a quiz to get help with questions
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
