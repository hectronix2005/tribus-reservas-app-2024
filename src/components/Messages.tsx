import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Search, X, User, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  receiver: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  content: string;
  delivered: boolean;
  deliveredAt?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

interface Conversation {
  user: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    sender: string;
  };
  unreadCount: number;
}

interface UserSearch {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  department?: string;
}

export function Messages() {
  const { state } = useApp();
  const currentUser = state.auth.currentUser;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearch[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Cargar conversaciones al montar
  useEffect(() => {
    loadConversations();

    // Polling cada 10 segundos
    pollingInterval.current = setInterval(() => {
      loadConversations();
      if (selectedConversation) {
        loadMessages(selectedConversation.user._id);
      }
    }, 10000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await api.get<Conversation[]>('/messages/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      setIsLoading(true);
      const data = await api.get<Message[]>(`/messages/${userId}`);
      setMessages(data);

      // Recargar conversaciones para actualizar contadores de no leídos
      // (el backend automáticamente marca los mensajes como leídos al cargarlos)
      setTimeout(() => {
        loadConversations();
      }, 500);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await api.post<{ message: string; data: Message }>('/messages', {
        receiverId: selectedConversation.user._id,
        content: newMessage.trim()
      });

      setMessages([...messages, response.data]);
      setNewMessage('');
      loadConversations(); // Actualizar lista de conversaciones
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const searchUsers = async (query: string) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setUserSearchResults([]);
      return;
    }

    try {
      const data = await api.get<UserSearch[]>(`/messages/users/search?query=${encodeURIComponent(query)}`);
      setUserSearchResults(data);
    } catch (error) {
      console.error('Error buscando usuarios:', error);
    }
  };

  const startConversation = (user: UserSearch) => {
    setSelectedConversation({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email
      },
      lastMessage: {
        content: '',
        createdAt: new Date().toISOString(),
        sender: ''
      },
      unreadCount: 0
    });
    setShowUserSearch(false);
    setSearchQuery('');
    setUserSearchResults([]);
    loadMessages(user._id);
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.user._id);
    setShowUserSearch(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex">
      {/* Lista de conversaciones */}
      <div className={`${selectedConversation && window.innerWidth < 768 ? 'hidden' : 'block'} w-full md:w-80 border-r border-gray-200 bg-white flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">Mensajes</h2>
            <button
              onClick={() => setShowUserSearch(!showUserSearch)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {showUserSearch ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5 text-primary-600" />}
            </button>
          </div>

          {/* Búsqueda de usuarios */}
          {showUserSearch && (
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuario para chatear..."
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Resultados de búsqueda */}
              {userSearchResults.length > 0 && (
                <div className="mt-2 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg">
                  {userSearchResults.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => startConversation(user)}
                      className="w-full p-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No tienes conversaciones aún</p>
              <p className="text-sm mt-1">Haz clic en el botón + para iniciar un chat</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.user._id}
                onClick={() => selectConversation(conversation)}
                className={`w-full p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 flex items-start space-x-3 ${selectedConversation?.user._id === conversation.user._id ? 'bg-primary-50' : ''
                  }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{conversation.user.name}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(conversation.lastMessage.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage.sender === currentUser?.id ? 'Tú: ' : ''}
                      {conversation.lastMessage.content}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="ml-2 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Header del chat */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{selectedConversation.user.name}</h3>
              <p className="text-sm text-gray-500">@{selectedConversation.user.username}</p>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Cargando mensajes...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay mensajes aún</p>
                  <p className="text-sm mt-1">Envía un mensaje para iniciar la conversación</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isSentByMe = message.sender._id === currentUser?.id;
                return (
                  <div key={message._id} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isSentByMe ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-lg p-3 ${isSentByMe
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center justify-end space-x-1 mt-1 ${isSentByMe ? 'text-primary-100' : 'text-gray-500'}`}>
                          <p className="text-xs">
                            {formatTime(message.createdAt)}
                          </p>
                          {/* Checks de WhatsApp - solo para mensajes enviados */}
                          {isSentByMe && (
                            <div className="flex items-center ml-1">
                              {message.read ? (
                                // Doble check azul - mensaje leído
                                <CheckCheck className={`w-4 h-4 ${isSentByMe ? 'text-blue-300' : 'text-blue-500'}`} />
                              ) : message.delivered ? (
                                // Doble check gris - mensaje entregado
                                <CheckCheck className="w-4 h-4" />
                              ) : (
                                // Un solo check gris - mensaje enviado
                                <Check className="w-4 h-4" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensaje */}
          <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Selecciona una conversación</p>
            <p className="text-sm mt-1">o inicia una nueva para comenzar a chatear</p>
          </div>
        </div>
      )}
    </div>
  );
}
