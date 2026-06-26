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

const renderFormattedText = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*(.+?)\*/);

      let firstMatch = null;
      let matchType = '';

      if (boldMatch && (!italicMatch || (boldMatch.index || 0) <= (italicMatch.index || 0))) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (italicMatch) {
        firstMatch = italicMatch;
        matchType = 'italic';
      }

      if (!firstMatch) {
        parts.push(remaining);
        break;
      }

      const idx = firstMatch.index || 0;
      if (idx > 0) parts.push(remaining.substring(0, idx));

      if (matchType === 'bold') {
        parts.push(<strong key={key++}>{firstMatch[1]}</strong>);
      } else {
        parts.push(<em key={key++}>{firstMatch[1]}</em>);
      }
      remaining = remaining.substring(idx + firstMatch[0].length);
    }

    return (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {parts}
      </React.Fragment>
    );
  });
};

const USER_MENU: MenuItem[] = [
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

const USER_ORDER_MENU: MenuItem[] = [
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

const ADMIN_MENU: MenuItem[] = [
  {
    label: 'Products',
    icon: 'bi-box-seam',
    message: '',
    subMenu: [
      { label: 'Add Product', icon: 'bi-plus-circle', message: 'How do I add a new product?' },
      { label: 'Edit Product', icon: 'bi-pencil', message: 'How do I edit a product?' },
      { label: 'Delete Product', icon: 'bi-trash', message: 'How do I delete a product?' },
      { label: 'View All Products', icon: 'bi-list', message: 'Show me all products' },
    ],
  },
  {
    label: 'Categories',
    icon: 'bi-grid',
    message: '',
    subMenu: [
      { label: 'Add Category', icon: 'bi-plus-circle', message: 'How do I add a new category?' },
      { label: 'Delete Category', icon: 'bi-trash', message: 'How do I delete a category?' },
      { label: 'View Categories', icon: 'bi-list', message: 'Show me all categories' },
    ],
  },
  {
    label: 'Approvals',
    icon: 'bi-person-check',
    message: 'Show me pending user approvals',
  },
  {
    label: 'Delivery Partners',
    icon: 'bi-person-video2',
    message: '',
    subMenu: [
      { label: 'Create Partner', icon: 'bi-plus-circle', message: 'How do I create a delivery partner?' },
      { label: 'View Partners', icon: 'bi-list', message: 'Show me all delivery partners' },
    ],
  },
  {
    label: 'Live Tracking',
    icon: 'bi-geo-alt',
    message: 'Show me all active deliveries for live tracking',
  },
  {
    label: 'Dashboard Help',
    icon: 'bi-question-circle',
    message: 'What can I do in the admin dashboard?',
  },
];

const MANAGER_MENU: MenuItem[] = [
  {
    label: 'Pending Orders',
    icon: 'bi-clock-history',
    message: 'Show me all pending orders',
  },
  {
    label: 'Dispatch Order',
    icon: 'bi-truck',
    message: 'How do I dispatch an order?',
  },
  {
    label: 'Categories',
    icon: 'bi-grid',
    message: 'Show me all categories',
  },
  {
    label: 'Inventory',
    icon: 'bi-box-seam',
    message: '',
    subMenu: [
      { label: 'View Inventory', icon: 'bi-list', message: 'Show me current inventory levels' },
      { label: 'Low Stock', icon: 'bi-exclamation-triangle', message: 'Show me low stock products' },
      { label: 'Update Stock', icon: 'bi-pencil', message: 'milk 50' },
    ],
  },
  {
    label: 'Dashboard Help',
    icon: 'bi-question-circle',
    message: 'What can I do in the manager dashboard?',
  },
];

const PARTNER_MENU: MenuItem[] = [
  {
    label: 'My Deliveries',
    icon: 'bi-list-task',
    message: 'Show me my active deliveries',
  },
  {
    label: 'Start Delivery',
    icon: 'bi-play-circle',
    message: 'How do I start a delivery?',
  },
  {
    label: 'Mark Delivered',
    icon: 'bi-check-circle',
    message: 'How do I mark an order as delivered?',
  },
  {
    label: 'Upload Proof',
    icon: 'bi-camera',
    message: 'How do I upload delivery proof photo?',
  },
  {
    label: 'Live Tracking',
    icon: 'bi-geo-alt',
    message: 'How does live location tracking work?',
  },
  {
    label: 'Chat with Customer',
    icon: 'bi-chat-dots',
    message: 'How do I chat with the customer?',
  },
  {
    label: 'Help',
    icon: 'bi-question-circle',
    message: 'What can I do in the partner dashboard?',
  },
];

const GREETINGS: Record<string, string> = {
  ADMIN: "Hi! I'm FreshCart Admin Assistant. I can help you with product management, category management, user approvals, delivery partners, and live tracking. What do you need?",
  STORE_MANAGER: "Hi! I'm FreshCart Manager Assistant. I can help you with order dispatch, inventory management, and stock updates. What do you need?",
  DELIVERY_PARTNER: "Hi! I'm FreshCart Delivery Assistant. I can help you with deliveries, marking orders delivered, uploading proof, and live tracking. What do you need?",
  USER: "Hi! I'm FreshCart Assistant. How can I help you today? You can ask me about orders, refunds, delivery, or any other queries.",
};

const getMenusForRole = (role: string) => {
  switch (role) {
    case 'ADMIN': return { initial: ADMIN_MENU, afterQuery: ADMIN_MENU };
    case 'STORE_MANAGER': return { initial: MANAGER_MENU, afterQuery: MANAGER_MENU };
    case 'DELIVERY_PARTNER': return { initial: PARTNER_MENU, afterQuery: PARTNER_MENU };
    default: return { initial: USER_MENU, afterQuery: USER_ORDER_MENU };
  }
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMenu, setActiveMenu] = useState<'main' | 'orderIssue'>('main');
  const [showMenu, setShowMenu] = useState(true);
  const [orderQueryMade, setOrderQueryMade] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole: string = user.role || 'USER';

  const greeting: Message = {
    role: 'assistant',
    content: GREETINGS[userRole] || GREETINGS.USER,
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([greeting]);
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    setMessages([greeting]);
    setActiveMenu('main');
    setShowMenu(true);
    setOrderQueryMade(false);
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
      const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${API_URL}/chatbot`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text.trim(), history, role: userRole }),
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

  const menus = getMenusForRole(userRole);

  const renderMenuButtons = () => {
    if (!showMenu) return null;

    let items: MenuItem[];
    if (activeMenu === 'orderIssue') {
      const currentMenu = orderQueryMade ? menus.afterQuery : menus.initial;
      items = currentMenu.find((m) => m.subMenu)?.subMenu || [];
    } else {
      items = orderQueryMade ? menus.afterQuery : menus.initial;
    }

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
          bottom: isOpen ? 'auto' : '16px',
          right: isOpen ? '12px' : '16px',
          top: isOpen ? '12px' : 'auto',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #059669, #10b981)',
          border: 'none',
          color: 'white',
          fontSize: '20px',
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
                  {msg.role === 'user' ? msg.content : renderFormattedText(msg.content)}
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
