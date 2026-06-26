import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MenuItem {
  label: string;
  icon: string;
  message: string;
  subMenu?: MenuItem[];
}

const INITIAL_MENU: MenuItem[] = [
  {
    label: 'Track Order',
    icon: 'bi-geo-alt',
    message: 'I want to track my order',
  },
  {
    label: 'Order Issue',
    icon: 'bi-exclamation-triangle',
    message: '',
    subMenu: [
      { label: 'Items Missing', icon: 'bi-box-seam', message: 'Some items are missing from my delivered order' },
      { label: 'Wrong Items', icon: 'bi-arrow-left-right', message: 'I received wrong items in my order' },
      { label: 'Damaged Items', icon: 'bi-crack', message: 'Some items in my order arrived damaged' },
      { label: 'Not Delivered', icon: 'bi-x-circle', message: 'My order shows delivered but I did not receive it' },
      { label: 'Other Issue', icon: 'bi-info-circle', message: 'I have an issue with my order' },
    ],
  },
  {
    label: 'Delivery',
    icon: 'bi-truck',
    message: 'Where is my delivery?',
  },
  {
    label: 'Help',
    icon: 'bi-question-circle',
    message: 'What services does FreshCart offer?',
  },
];

const ORDER_MENU: MenuItem[] = [
  {
    label: 'Track Order',
    icon: 'bi-geo-alt',
    message: 'I want to track my order',
  },
  {
    label: 'Refund',
    icon: 'bi-arrow-return-left',
    message: 'I want to request a refund',
  },
  {
    label: 'Order Issue',
    icon: 'bi-exclamation-triangle',
    message: '',
    subMenu: [
      { label: 'Items Missing', icon: 'bi-box-seam', message: 'Some items are missing from my delivered order' },
      { label: 'Wrong Items', icon: 'bi-arrow-left-right', message: 'I received wrong items in my order' },
      { label: 'Damaged Items', icon: 'bi-crack', message: 'Some items in my order arrived damaged' },
      { label: 'Not Delivered', icon: 'bi-x-circle', message: 'My order shows delivered but I did not receive it' },
      { label: 'Other Issue', icon: 'bi-info-circle', message: 'I have an issue with my order' },
    ],
  },
  {
    label: 'Delivery',
    icon: 'bi-truck',
    message: 'Where is my delivery?',
  },
  {
    label: 'Help',
    icon: 'bi-question-circle',
    message: 'What services does FreshCart offer?',
  },
];

const GREETING: Message = {
  role: 'assistant',
  content: 'Hi! I\'m FreshCart Assistant. How can I help you today? You can ask me about orders, refunds, delivery, or any other queries.',
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [activeMenu, setActiveMenu] = useState<'main' | 'orderIssue'>('main');
  const [showMenu, setShowMenu] = useState(true);
  const [orderQueryMade, setOrderQueryMade] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleBackToMenu = () => {
    setMessages([GREETING]);
    setActiveMenu('main');
    setShowMenu(true);
    setInput('');
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.subMenu) {
      setActiveMenu('orderIssue');
    } else {
      setShowMenu(false);
      if (item.label === 'Track Order' || item.label === 'Order Issue' || item.label === 'Refund') {
        setOrderQueryMade(true);
      }
      sendMessage(item.message);
    }
  };

  const handleSubMenuClick = (item: MenuItem) => {
    setShowMenu(false);
    setOrderQueryMade(true);
    sendMessage(item.message);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again later.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to connect. Please check your internet and try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const renderMenuButtons = () => {
    if (!showMenu) return null;

    const items = activeMenu === 'orderIssue'
      ? (orderQueryMade ? ORDER_MENU : INITIAL_MENU).find((m) => m.subMenu)?.subMenu || []
      : orderQueryMade ? ORDER_MENU : INITIAL_MENU;

    return (
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '200px',
          overflowY: 'auto',
          background: 'white',
          borderTop: '1px solid #f3f4f6',
          flexShrink: 0,
        }}
        className="hide-scrollbar"
      >
        {activeMenu === 'orderIssue' && (
          <button
            onClick={() => setActiveMenu('main')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1.5px solid #e5e7eb',
              background: '#f3f4f6',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
            }}
          >
            <i className="bi bi-arrow-left" style={{ fontSize: '13px' }}></i>
            Back to Main Menu
          </button>
        )}
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => activeMenu === 'orderIssue' ? handleSubMenuClick(item) : handleMenuClick(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1.5px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.color = '#059669';
              e.currentTarget.style.background = '#ecfdf5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.background = 'white';
            }}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '15px', width: '20px', textAlign: 'center' }}></i>
            {item.label}
            {item.subMenu && <i className="bi bi-chevron-right ms-auto" style={{ fontSize: '12px', color: '#9ca3af' }}></i>}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: isOpen ? 'auto' : '20px',
          right: isOpen ? '16px' : '20px',
          top: isOpen ? '16px' : 'auto',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #059669, #10b981)',
          border: 'none',
          color: 'white',
          fontSize: '22px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(5, 150, 105, 0.4)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        aria-label="Open chat"
      >
        <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '0',
            right: '0',
            width: '100%',
            height: '100vh',
            maxHeight: '100vh',
            background: 'white',
            borderRadius: '0',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10000,
            animation: 'slideUp 0.3s ease',
          }}
          className="chatbot-window-desktop"
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-robot" style={{ fontSize: '18px' }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>FreshCart Assistant</div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>Online • Usually replies instantly</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: '14px' }}></i>
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#f9fafb',
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #059669, #10b981)' : 'white',
                    color: msg.role === 'user' ? 'white' : '#1a1a1a',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    display: 'flex',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9ca3af', animation: 'pulse 1s infinite' }}></span>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9ca3af', animation: 'pulse 1s infinite 0.2s' }}></span>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9ca3af', animation: 'pulse 1s infinite 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Menu Buttons */}
          {renderMenuButtons()}

          {/* Input + Back to Menu */}
          <div
            style={{
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'white',
              borderTop: '1px solid #f3f4f6',
              flexShrink: 0,
            }}
          >
            {!showMenu && (
              <button
                onClick={handleBackToMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #e5e7eb',
                  background: '#f9fafb',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.color = '#059669';
                  e.currentTarget.style.background = '#ecfdf5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = '#f9fafb';
                }}
              >
                <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: '13px' }}></i>
                Back to Menu
              </button>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e5e7eb',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f9fafb',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: input.trim() && !isLoading ? 'linear-gradient(135deg, #059669, #10b981)' : '#e5e7eb',
                  color: input.trim() && !isLoading ? 'white' : '#9ca3af',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-send-fill" style={{ fontSize: '14px' }}></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
