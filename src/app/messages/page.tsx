"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  MessageCircle, 
  Send, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  MoreVertical,
  Reply,
  CheckCheck,
  Loader2,
  Inbox,
  Star,
  Archive,
  Trash2,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'


interface Conversation {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  orderId: string
  orderNumber: string
  medicineName: string
  status: string
  messages: Message[]
}

interface Message {
  id: string
  text: string
  isFromCustomer: boolean
  isFromPharmacy: boolean
  createdAt: Date
  read: boolean
}

export default function PharmacyMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      
      if (response.ok) {
        setConversations(data.conversations || [])
      } else {
        console.error('Failed to fetch conversations:', data.error)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch messages for a specific conversation
  const fetchMessages = async (orderId: string) => {
    try {
      const response = await fetch(`/api/conversations/${orderId}`)
      const data = await response.json()
      
      if (response.ok) {
        return data.messages || []
      }
      return []
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return
    
    setSendingMessage(true)
    try {
      const response = await fetch('/api/send-order-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedConversation.orderId,
          message: newMessage
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      
      // Add message to local state
      const updatedMessages = [...selectedConversation.messages, {
        id: data.message.id || Date.now().toString(),
        text: newMessage,
        isFromCustomer: false,
        isFromPharmacy: true,
        createdAt: new Date(),
        read: true
      }]
      
      setSelectedConversation({
        ...selectedConversation,
        messages: updatedMessages,
        lastMessage: newMessage,
        lastMessageTime: new Date()
      })
      
      // Update conversation in list
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, lastMessage: newMessage, lastMessageTime: new Date(), unreadCount: 0 }
          : conv
      ))
      
      setNewMessage('')
      toast({ title: 'Sent', description: 'Message sent successfully' })
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSendingMessage(false)
    }
  }

  // Mark messages as read
  const markAsRead = async (orderId: string) => {
    try {
      await fetch('/api/mark-messages-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Select a conversation
  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    const messages = await fetchMessages(conversation.orderId)
    
    setSelectedConversation({
      ...conversation,
      messages: messages,
      unreadCount: 0
    })
    
    // Mark as read
    await markAsRead(conversation.orderId)
    
    // Update unread count in list
    setConversations(prev => prev.map(conv => 
      conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
    ))
  }

  useEffect(() => {
    fetchConversations()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.customerPhone.includes(searchTerm) ||
                         conv.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterStatus === 'unread') return matchesSearch && conv.unreadCount > 0
    if (filterStatus === 'read') return matchesSearch && conv.unreadCount === 0
    return matchesSearch
  })

  const unreadCount = conversations.filter(c => c.unreadCount > 0).length

  if (loading) {
    return (
         <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">

      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
        </main>
        </div>
        </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">

    
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread message(s)` : 'All caught up!'}
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
            <MessageCircle className="h-4 w-4 mr-1" />
            {conversations.length} Conversations
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-96 bg-white border-r flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterStatus === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-emerald-600' : ''}
              >
                All
              </Button>
              <Button 
                variant={filterStatus === 'unread' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('unread')}
                className={filterStatus === 'unread' ? 'bg-emerald-600' : ''}
              >
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-red-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant={filterStatus === 'read' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('read')}
                className={filterStatus === 'read' ? 'bg-emerald-600' : ''}
              >
                Read
              </Button>
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No conversations found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {conv.customerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {conv.customerName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {conv.orderNumber}
                          </Badge>
                          {conv.unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">
                              {conv.unreadCount} new
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {selectedConversation.customerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedConversation.customerName}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <span>{selectedConversation.customerPhone}</span>
                      <span>•</span>
                      <span>Order: {selectedConversation.orderNumber}</span>
                      <span>•</span>
                      <span>{selectedConversation.medicineName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`tel:${selectedConversation.customerPhone}`)}>
                    <Phone className="h-4 w-4 mr-1" /> Call
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${selectedConversation.customerPhone.replace(/[^0-9]/g, '')}`)}>
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromPharmacy ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.isFromPharmacy
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white border text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        message.isFromPharmacy ? 'text-emerald-100' : 'text-gray-400'
                      }`}>
                        <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                        {message.isFromPharmacy && message.read && (
                          <CheckCheck className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {selectedConversation.messages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No messages yet</p>
                    <p className="text-sm text-gray-400">Send a message to start the conversation</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !sendingMessage && newMessage.trim()) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  className="min-h-[80px] resize-none"
                />
                <Button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 self-end"
                >
                  {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No conversation selected</h3>
              <p className="text-gray-500">Select a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </main>
        </div>
        </div>
  )
}