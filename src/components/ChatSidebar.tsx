'use client';

/**
 * Chat Sidebar Component
 * AI Math Tutor v2
 *
 * Displays chat session list with new chat button.
 * Collapsible on desktop with toggle button.
 */

import React from 'react';
import { ChatSession } from '@/types';
import { formatTimestamp, truncateText } from '@/lib/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen = true,
  collapsed = false,
  onClose,
  onToggleCollapse,
}: ChatSidebarProps) {
  // Don't render content if collapsed on desktop (but keep mobile overlay)
  const shouldHideContent = collapsed && isOpen;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-0
          bg-slate-50 dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-700
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-0 lg:overflow-hidden lg:p-0' : 'lg:w-72'}
          ${isOpen && !collapsed ? 'w-72' : 'w-0'}
        `}
      >
        {/* Desktop collapsed toggle button (visible when collapsed) */}
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute top-4 right-0 z-10 translate-x-full bg-slate-50 dark:bg-slate-900 border-l border-t border-b border-slate-200 dark:border-slate-700 rounded-r-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            aria-label="Open sidebar"
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
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        {/* Sidebar content (hidden when collapsed) */}
        <div className={`${shouldHideContent ? 'lg:hidden' : ''} flex flex-col h-full`}>
          {/* Header with New Chat button and collapse toggle */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <button
              onClick={() => {
                onNewChat();
                onClose?.();
              }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Chat
            </button>
            {/* Desktop collapse button */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                aria-label="Collapse sidebar"
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
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="17 17 12 12 17 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                <p>No previous chats</p>
                <p className="mt-1">Start a new one!</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {sessions.map(session => (
                  <li key={session.id} className="group">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose?.();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectSession(session.id);
                          onClose?.();
                        }
                      }}
                      className={`
                        w-full p-3 rounded-lg text-left transition-colors cursor-pointer
                        ${
                          session.id === currentSessionId
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {truncateText(session.title, 30)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {formatTimestamp(session.updatedAt)}
                          </p>
                        </div>
                        {onDeleteSession && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete session"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-slate-400"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              aria-label="Close sidebar"
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
                className="text-slate-600 dark:text-slate-400"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
