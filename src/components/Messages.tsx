import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Search, X, User, ArrowLeft, Check, CheckCheck, Paperclip, File, Image as ImageIcon, FileText, Download, Menu, Megaphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface Attachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  cloudinary_id?: string;
  uploadedAt?: string;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  receiver?: {
    _id: string;
    name: string;
    username: string;
    email: string;
  };
  isBroadcast?: boolean;
  content: string;
  attachments?: Attachment[];
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearch[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Panel lateral abierto por defecto

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      // Si es la conversación broadcast, usar endpoint especial
      const endpoint = userId === 'broadcast'
        ? '/messages/broadcast/all'
        : `/messages/${userId}`;

      const data = await api.get<Message[]>(endpoint);

      // Debug: verificar estado de mensajes recibidos
      console.log(`📬 Mensajes recibidos (${data.length} total):`);
      data.forEach((msg, idx) => {
        const isMine = msg.sender._id === currentUser?.id;
        console.log(`  ${idx + 1}. ${isMine ? '➡️ Enviado' : '⬅️ Recibido'}: delivered=${msg.delivered}, read=${msg.read}`);
      });

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

    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversation) return;

    try {
      const formData = new FormData();
      const isBroadcast = selectedConversation.user._id === 'broadcast';

      // Si no es broadcast, agregar receiverId
      if (!isBroadcast) {
        formData.append('receiverId', selectedConversation.user._id);
      }

      if (newMessage.trim()) {
        formData.append('content', newMessage.trim());
      }

      // Agregar archivos
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Determinar endpoint según si es broadcast o no
      const endpoint = isBroadcast ? '/api/messages/broadcast' : '/api/messages';

      // Usar fetch directamente en lugar de api.post para enviar FormData
      const token = sessionStorage.getItem('authToken') || sessionStorage.getItem('tribus-auth');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-App-Token': 'bfd883d6ac23922f664295e1d67a5da42791969042804a37af15189b353065b1'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      const result = await response.json();

      console.log(`📤 Mensaje ${isBroadcast ? 'BROADCAST' : ''} enviado. Estado recibido del backend:`, {
        delivered: result.data.delivered,
        read: result.data.read,
        content: result.data.content ? result.data.content.substring(0, 20) : '(adjuntos)',
        attachments: result.data.attachments?.length || 0
      });

      setMessages([...messages, result.data]);
      setNewMessage('');
      setSelectedFiles([]);
      loadConversations(); // Actualizar lista de conversaciones
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Validar tamaño (máximo 10MB por archivo)
      const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        alert('Algunos archivos son demasiado grandes. Máximo 10MB por archivo.');
        return;
      }

      // Limitar a 5 archivos
      if (files.length + selectedFiles.length > 5) {
        alert('Máximo 5 archivos por mensaje');
        return;
      }

      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
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
    <div className="h-[calc(100vh-140px)] flex relative">
      {/* Botón hamburger flotante (solo visible cuando sidebar está oculto en desktop) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed left-4 top-24 z-50 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all items-center justify-center"
          title="Abrir panel de conversaciones"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Lista de conversaciones - Panel lateral retráctil */}
      <div className={`
        ${selectedConversation && window.innerWidth < 768 ? 'hidden' : 'flex'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'}
        w-full md:w-80
        border-r border-gray-200 bg-white
        flex-col
        transition-transform duration-300 ease-in-out
        md:absolute md:left-0 md:top-0 md:h-full md:z-40
        lg:relative lg:translate-x-0
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">Mensajes</h2>
            <div className="flex items-center gap-2">
              {/* Botón para cerrar sidebar en desktop */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="hidden md:block lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Ocultar panel"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {showUserSearch ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5 text-primary-600" />}
              </button>
            </div>
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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  conversation.user._id === 'broadcast'
                    ? 'bg-orange-100'
                    : 'bg-primary-100'
                }`}>
                  {conversation.user._id === 'broadcast' ? (
                    <Megaphone className="w-6 h-6 text-orange-600" />
                  ) : (
                    <User className="w-6 h-6 text-primary-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate flex items-center gap-1">
                      {conversation.user.name}
                      {conversation.user._id === 'broadcast' && (
                        <Megaphone className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      )}
                    </h3>
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

      {/* Overlay/Backdrop cuando sidebar está abierto en tablets */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="hidden md:block lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}

      {/* Área de chat */}
      {selectedConversation ? (
        <div className={`
          flex-1 flex flex-col bg-gray-50
          transition-all duration-300
          ${!sidebarOpen ? 'md:ml-0 lg:ml-0' : 'md:ml-0 lg:ml-0'}
        `}>
          {/* Header del chat */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3">
            {/* Botón hamburger para abrir sidebar (solo visible cuando está cerrado en desktop) */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden md:block lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                title="Abrir panel de conversaciones"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}

            <button
              onClick={() => setSelectedConversation(null)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              selectedConversation.user._id === 'broadcast'
                ? 'bg-orange-100'
                : 'bg-primary-100'
            }`}>
              {selectedConversation.user._id === 'broadcast' ? (
                <Megaphone className="w-5 h-5 text-orange-600" />
              ) : (
                <User className="w-5 h-5 text-primary-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {selectedConversation.user.name}
                {selectedConversation.user._id === 'broadcast' && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    Mensaje a todos
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedConversation.user._id === 'broadcast'
                  ? 'Todos los usuarios recibirán este mensaje'
                  : `@${selectedConversation.user.username}`
                }
              </p>
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
              messages.map((message, index) => {
                const isSentByMe = message.sender._id === currentUser?.id;

                // Debug: Log del estado del mensaje
                if (index === 0) {
                  console.log(`🎨 Renderizando mensaje #${index + 1}:`, {
                    isSentByMe,
                    delivered: message.delivered,
                    read: message.read,
                    content: message.content.substring(0, 20)
                  });
                }

                return (
                  <div key={message._id} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isSentByMe ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-lg p-3 ${isSentByMe
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                      >
                        {/* Contenido del mensaje */}
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}

                        {/* Archivos adjuntos */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                            {message.attachments.map((attachment, idx) => {
                              const isImage = attachment.mimetype.startsWith('image/');
                              const isPDF = attachment.mimetype === 'application/pdf';
                              const isDoc = attachment.mimetype.includes('word') || attachment.mimetype.includes('document');
                              const isExcel = attachment.mimetype.includes('excel') || attachment.mimetype.includes('sheet');

                              return (
                                <div key={idx}>
                                  {isImage ? (
                                    // Mostrar imagen
                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={attachment.url}
                                        alt={attachment.originalName}
                                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                        style={{ maxHeight: '300px' }}
                                      />
                                    </a>
                                  ) : (
                                    // Mostrar archivo como enlace de descarga
                                    <a
                                      href={attachment.url}
                                      download={attachment.originalName}
                                      className={`flex items-center gap-2 p-2 rounded ${
                                        isSentByMe
                                          ? 'bg-primary-700 hover:bg-primary-800'
                                          : 'bg-gray-100 hover:bg-gray-200'
                                      } transition-colors`}
                                    >
                                      {isPDF ? (
                                        <FileText className="w-5 h-5" />
                                      ) : isDoc ? (
                                        <FileText className="w-5 h-5" />
                                      ) : isExcel ? (
                                        <File className="w-5 h-5" />
                                      ) : (
                                        <File className="w-5 h-5" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${isSentByMe ? 'text-white' : 'text-gray-900'}`}>
                                          {attachment.originalName}
                                        </p>
                                        <p className={`text-xs ${isSentByMe ? 'text-primary-100' : 'text-gray-500'}`}>
                                          {(attachment.size / 1024).toFixed(1)} KB
                                        </p>
                                      </div>
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className={`flex items-center justify-end space-x-1 mt-1 ${isSentByMe ? 'text-primary-100' : 'text-gray-500'}`}>
                          <p className="text-xs">
                            {formatTime(message.createdAt)}
                          </p>
                          {/* Checks de WhatsApp - solo para mensajes enviados */}
                          {isSentByMe && (
                            <div className="flex items-center ml-1" title={`Delivered: ${message.delivered}, Read: ${message.read}`}>
                              {message.read === true ? (
                                // ✓✓ Doble check AZUL - mensaje leído
                                <CheckCheck className="w-4 h-4 text-blue-400" />
                              ) : message.delivered === true ? (
                                // ✓✓ Doble check GRIS - mensaje entregado pero NO leído
                                <CheckCheck className="w-4 h-4 text-gray-300" />
                              ) : (
                                // ✓ Un solo check gris - mensaje enviado
                                <Check className="w-4 h-4 text-gray-300" />
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
            {/* Preview de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <File className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700 max-w-[150px] truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-1 text-gray-500 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              {/* Botón adjuntar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Adjuntar archivo"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
              />

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() && selectedFiles.length === 0}
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
