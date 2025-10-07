"use client";

import React, { useState } from 'react';
import { Badge, Button, Dropdown, List, Typography, Empty, Tag, Avatar, Space } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useWebSocket } from './WebSocketProvider';

const { Text } = Typography;

export const NotificationBell: React.FC = () => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearAllNotifications 
  } = useWebSocket();
  const [open, setOpen] = useState(false);

  // Filter out duplicate notifications based on content
  const uniqueNotifications = notifications.filter((notification, index, self) => 
    index === self.findIndex(n => {
      const nData = n.data as { issue?: { id?: string | number }; updatedBy?: string; createdBy?: string };
      const notificationData = notification.data as { issue?: { id?: string | number }; updatedBy?: string; createdBy?: string };
      
      return n.type === notification.type && 
        nData.issue?.id === notificationData.issue?.id &&
        nData.updatedBy === notificationData.updatedBy &&
        nData.createdBy === notificationData.createdBy &&
        n.message === notification.message &&
        Math.abs(n.timestamp.getTime() - notification.timestamp.getTime()) < 5000 // Within 5 seconds
    })
  );

  const unreadCount = uniqueNotifications.filter(n => !n.read).length;

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'issue_created':
        return <ExclamationCircleOutlined style={{ color: '#1890ff' }} />;
      case 'issue_updated':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      default:
        return <BellOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'issue_created':
        return '#e6f7ff';
      case 'issue_updated':
        return '#f6ffed';
      default:
        return '#fafafa';
    }
  };

  const markAsRead = (notificationId: string | number) => {
    markNotificationAsRead(notificationId);
  };

  const markAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  const clearAll = () => {
    clearAllNotifications();
  };

  const notificationItems = uniqueNotifications.slice(0, 10).map((notification) => ({
    key: notification.id,
    label: (
      <div 
        className={`p-3 transition-all duration-200 hover:shadow-md ${!notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white'}`}
        style={{ backgroundColor: !notification.read ? getNotificationColor(notification.type) : 'white' }}
      >
        <div className="flex items-start gap-3">
          <Avatar 
            icon={getNotificationIcon(notification.type)}
            size="small"
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <Text strong className="text-sm text-gray-900">
                {notification.title}
              </Text>
              <Text type="secondary" className="text-xs">
                {formatTime(notification.timestamp)}
              </Text>
            </div>
            <Text className="text-sm text-gray-600 leading-relaxed">
              {notification.message}
            </Text>
            {!notification.read && (
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CheckOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Mark as read
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
  }));

  const dropdownContent = (
    <div className="w-96 max-h-[500px] overflow-hidden bg-white rounded-lg shadow-xl border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BellOutlined className="text-blue-600" />
            <Text strong className="text-gray-900">Notifications</Text>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Tag color="blue" className="text-xs">
                {unreadCount} new
              </Tag>
            )}
            <Space size="small">
              <Button 
                type="text" 
                size="small" 
                icon={<CheckOutlined />}
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-blue-500 hover:text-blue-700"
              >
                Mark all read
              </Button>
              <Button 
                type="text" 
                size="small" 
                icon={<DeleteOutlined />}
                onClick={clearAll}
                className="text-red-500 hover:text-red-700"
              >
                Clear all
              </Button>
            </Space>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {uniqueNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary">No notifications yet</Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    You&apos;ll see notifications here when issues are created or updated
                  </Text>
                </div>
              }
            />
          </div>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={notificationItems}
            renderItem={(item) => (
              <List.Item className="p-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-200">
                {item.label}
              </List.Item>
            )}
          />
        )}
      </div>
      
      {/* Footer */}
      {uniqueNotifications.length > 10 && (
        <div className="p-3 text-center border-t border-gray-100 bg-gray-50">
          <Button type="link" size="small" className="text-blue-600 hover:text-blue-800">
            View all notifications ({uniqueNotifications.length})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      menu={{ items: [] }}
      popupRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge 
        count={unreadCount} 
        size="small"
        offset={[-5, 5]}
        className="cursor-pointer"
      >
        <Button 
          type="text" 
          icon={<BellOutlined className="text-lg" />}
          className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-blue-50 transition-colors duration-200"
        />
      </Badge>
    </Dropdown>
  );
};
