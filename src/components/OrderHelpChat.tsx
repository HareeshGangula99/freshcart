import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OrderData {
  _id: string;
  orderStatus: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  products: { productId: { name: string; imageURL?: string }; priceAtPurchase: number; quantity: number }[];
  deliveryAddress?: { street: string; city: string; zip: string };
}

interface OrderHelpChatProps {
  order: OrderData;
  onClose: () => void;
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PLACED: 'Order Placed',
    CONFIRMED: 'Confirmed',
    DISPATCHED: 'Dispatched',
    OUT_FOR_DELIVERY: 'On The Way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status;
};

const getOrderGreeting = (order: OrderData): string => {
  const items = order.products?.map((p) => `${p.productId?.name || 'Item'} x${p.quantity}`).join(', ') || 'N/A';
  const address = order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'N/A';
  const status = getStatusLabel(order.orderStatus);
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return `I'm here to help with your order #${order._id.slice(-6).toUpperCase()}.\n\n📦 Items: ${items}\n📍 Address: ${address}\n💳 Payment: ${order.paymentStatus} • ₹${order.totalAmount}\n📋 Status: ${status}\n📅 Ordered: ${date}\n\nWhat do you need help with?`;
};

const MENU_ITEMS = [
  { label: 'Order Status', icon: 'bi-info-circle', message: 'What is my order status?' },
  { label: 'Delivery Time', icon: 'bi-clock', message: 'When will my order arrive?' },
  { label: 'Items Missing', icon: 'bi-box-seam', message: 'Some items are missing from my delivered order' },
  { label: 'Wrong Items', icon: 'bi-arrow-left-right', message: 'I received wrong items in my order' },
  { label: 'Damaged Items', icon: 'bi-crack', message: 'Some items in my order arrived damaged' },
  { label: 'Refund', icon: 'bi-arrow-return-left', message: 'I want to request a refund' },
];

const OrderHelpChat: React.FC<OrderHelpChatProps> = ({ order, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: getOrderGreeting(order) }]);
  const [showMenu, setShowMenu] = useState(true);
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
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleBackToMenu = () => {
    setMessages([{ role: 'assistant', content: getOrderGreeting(order) }]);
    setShowMenu(true);
    setInput('');
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setShowMenu(false);
    const userMessage: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const orderInfo = {
        orderId: order._id,
        orderStatus: order.orderStatus,
        items: order.products?.map((p) => ({ name: p.productId?.name, qty: p.quantity, price: p.priceAtPurchase })),
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        deliveryAddress: order.deliveryAddress,
      };

      const res = await fetch(`${API_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history, orderContext: orderInfo }),
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

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-end align-items-md-center justify-content-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1060, padding: '0' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="d-flex flex-column animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100dvh',
          maxHeight: '100dvh',
          background: 'white',
          borderRadius: '0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #065f46, #059669)',
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
              flexShrink: 0,
            }}
          >
            <i className="bi bi-headset" style={{ fontSize: '18px' }}></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Order Help</div>
            <div style={{ fontSize: '12px', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              #{order._id.slice(-6).toUpperCase()} • {getStatusLabel(order.orderStatus)}
            </div>
          </div>
          <button
            onClick={onClose}
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
              flexShrink: 0,
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
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
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
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #059669, #10b981)' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1a1a1a',
                  fontSize: '13.5px',
                  lineHeight: '1.55',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
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
        {showMenu && (
          <div
            style={{
              padding: '8px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              maxHeight: '160px',
              overflowY: 'auto',
              background: 'white',
              borderTop: '1px solid #f3f4f6',
              flexShrink: 0,
            }}
            className="hide-scrollbar"
          >
            {MENU_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => sendMessage(item.message)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
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
              </button>
            ))}
          </div>
        )}

        {/* Input + Back to Menu */}
        <div
          style={{
            padding: '10px 14px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
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
            >
              <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: '13px' }}></i>
              Order Options
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
              placeholder={`Ask about order #${order._id.slice(-6).toUpperCase()}...`}
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
                minWidth: 0,
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
    </div>
  );
};

export default OrderHelpChat;
