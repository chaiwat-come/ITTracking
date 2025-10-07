"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Tag, 
  Button, 
  Space, 
  Select, 
  Input, 
  Modal, 
  Form, 
  message,
  Tooltip,
  Badge
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { Search } = Input;

interface User {
  id: number;
  username: string;
  role: string;
}

interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueListProps {
  userRole: string;
}

export const IssueList: React.FC<IssueListProps> = ({ userRole }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
    search: ''
  });

  const [form] = Form.useForm();

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/issues/iss?${queryParams}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) throw new Error('Failed to load issues');

      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load issues';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadUsers = useCallback(async () => {
    if (userRole !== 'admin' && userRole !== 'support') return;

    try {
      const token = localStorage.getItem('token');
      // Admin can see all support users, support users only need themselves (handled in UI)
      const roleFilter = userRole === 'admin' ? '?role=support' : '';
      const response = await fetch(`/api/users${roleFilter}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        // For admin, show all support users. For support, we'll handle in the UI directly
        if (userRole === 'admin') {
          setUsers(data.users?.filter((u: User) => u.role === 'support') || []);
        } else {
          // Support users don't need the users list since they only assign to themselves
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [userRole]);

  useEffect(() => {
    loadIssues();
    loadUsers();
  }, []); // ไม่มี dependencies - ป้องกัน infinite loop

  const handleUpdateIssue = async (values: { status?: string; assignedTo?: string; title?: string; description?: string; category?: string; priority?: string }) => {
    if (!selectedIssue) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update issue');
      }

      message.success('Issue updated successfully');
      setUpdateModalVisible(false);
      setSelectedIssue(null);
      form.resetFields();
      loadIssues();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update issue';
      message.error(errorMessage);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'red';
      case 'High': return 'orange';
      case 'Medium': return 'gold';
      case 'Low': return 'green';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'blue';
      case 'In Progress': return 'orange';
      case 'Resolved': return 'green';
      default: return 'default';
    }
  };

  const columns: ColumnsType<Issue> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: [
        { text: 'Network', value: 'Network' },
        { text: 'Hardware', value: 'Hardware' },
        { text: 'Software', value: 'Software' },
        { text: 'Account', value: 'Account' },
        { text: 'Email', value: 'Email' },
        { text: 'Printer', value: 'Printer' },
        { text: 'Other', value: 'Other' },
      ],
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
      ),
      sorter: (a, b) => {
        const priorities = ['Low', 'Medium', 'High', 'Critical'];
        return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Badge 
          status={status === 'Resolved' ? 'success' : status === 'In Progress' ? 'processing' : 'default'}
          text={<Tag color={getStatusColor(status)}>{status}</Tag>}
        />
      ),
      filters: [
        { text: 'New', value: 'New' },
        { text: 'In Progress', value: 'In Progress' },
        { text: 'Resolved', value: 'Resolved' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Created By',
      key: 'createdBy',
      width: 120,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <UserOutlined />
          <span>{record.createdBy || 'Unknown'}</span>
        </div>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignedTo',
      width: 120,
      render: (_, record) => (
        record.assignedTo ? (
          <div className="flex items-center gap-1">
            <UserOutlined />
            <span>{record.assignedTo}</span>
          </div>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => (
        <div className="flex items-center gap-1">
          <ClockCircleOutlined />
          <span>{new Date(date).toLocaleDateString()}</span>
        </div>
      ),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedIssue(record);
              setViewModalVisible(true);
            }}
          />
          {(userRole === 'admin' || userRole === 'support' || 
            (userRole === 'user' && record.createdBy === localStorage.getItem('username'))) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedIssue(record);
                const currentUsername = localStorage.getItem('username');
                form.setFieldsValue({
                  status: record.status,
                  assignedTo: record.assignedTo || (userRole === 'support' ? currentUsername : undefined),
                  title: record.title,
                  description: record.description,
                  category: record.category,
                  priority: record.priority,
                });
                setUpdateModalVisible(true);
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <Search
          placeholder="Search issues..."
          allowClear
          style={{ width: 250 }}
          onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
        />
        
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 120 }}
          onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
        >
          <Option value="New">New</Option>
          <Option value="In Progress">In Progress</Option>
          <Option value="Resolved">Resolved</Option>
        </Select>

        <Select
          placeholder="Priority"
          allowClear
          style={{ width: 120 }}
          onChange={(value) => setFilters(prev => ({ ...prev, priority: value || '' }))}
        >
          <Option value="Low">Low</Option>
          <Option value="Medium">Medium</Option>
          <Option value="High">High</Option>
          <Option value="Critical">Critical</Option>
        </Select>

        <Select
          placeholder="Category"
          allowClear
          style={{ width: 120 }}
          onChange={(value) => setFilters(prev => ({ ...prev, category: value || '' }))}
        >
          <Option value="Network">Network</Option>
          <Option value="Hardware">Hardware</Option>
          <Option value="Software">Software</Option>
          <Option value="Account">Account</Option>
          <Option value="Email">Email</Option>
          <Option value="Printer">Printer</Option>
          <Option value="Other">Other</Option>
        </Select>

        {(userRole === 'admin' || userRole === 'support') && (
          <Select
            placeholder="Assigned To"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setFilters(prev => ({ ...prev, assignedTo: value || '' }))}
          >
            {users.map(user => (
              <Option key={user.id} value={user.username}>{user.username}</Option>
            ))}
          </Select>
        )}

        <Button icon={<ReloadOutlined />} onClick={loadIssues}>
          Refresh
        </Button>
      </div>

      {/* Issues Table */}
      <Table
        columns={columns}
        dataSource={issues}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} issues`,
        }}
        scroll={{ x: 1200 }}
      />

      {/* View Issue Modal */}
      <Modal
        title={`Issue #${selectedIssue?.id} - ${selectedIssue?.title}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedIssue(null);
        }}
        footer={null}
        width={800}
      >
        {selectedIssue && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Status:</strong>
                <Tag color={getStatusColor(selectedIssue.status)} className="ml-2">
                  {selectedIssue.status}
                </Tag>
              </div>
              <div>
                <strong>Priority:</strong>
                <Tag color={getPriorityColor(selectedIssue.priority)} className="ml-2">
                  {selectedIssue.priority}
                </Tag>
              </div>
              <div>
                <strong>Category:</strong> {selectedIssue.category}
              </div>
              <div>
                <strong>Created By:</strong> {selectedIssue.createdBy || 'Unknown'}
              </div>
              <div>
                <strong>Assigned To:</strong> {selectedIssue.assignedTo || 'Unassigned'}
              </div>
              <div>
                <strong>Created:</strong> {new Date(selectedIssue.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <strong>Description:</strong>
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                {selectedIssue.description}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Issue Modal */}
      <Modal
        title={`Update Issue #${selectedIssue?.id}`}
        open={updateModalVisible}
        onCancel={() => {
          setUpdateModalVisible(false);
          setSelectedIssue(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateIssue}
        >
          {(userRole === 'admin' || userRole === 'support') && (
            <>
              <Form.Item name="status" label="Status">
                <Select>
                  <Option value="New">New</Option>
                  <Option value="In Progress">In Progress</Option>
                  <Option value="Resolved">Resolved</Option>
                </Select>
              </Form.Item>

              <Form.Item name="assignedTo" label="Assign To">
                <Select allowClear placeholder="Select assignee">
                  {userRole === 'support' && (
                    <Option value={localStorage.getItem('username')}>
                      {localStorage.getItem('username')} (Me)
                    </Option>
                  )}
                  {userRole === 'admin' && users.map(user => (
                    <Option key={user.id} value={user.username}>{user.username}</Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          {(userRole === 'user' && selectedIssue?.createdBy === localStorage.getItem('username')) && (
            <>
              <Form.Item name="title" label="Title">
                <Input />
              </Form.Item>
              
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.Item name="category" label="Category">
                <Select>
                  <Option value="Network">Network</Option>
                  <Option value="Hardware">Hardware</Option>
                  <Option value="Software">Software</Option>
                  <Option value="Account">Account</Option>
                  <Option value="Email">Email</Option>
                  <Option value="Printer">Printer</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>

              <Form.Item name="priority" label="Priority">
                <Select>
                  <Option value="Low">Low</Option>
                  <Option value="Medium">Medium</Option>
                  <Option value="High">High</Option>
                  <Option value="Critical">Critical</Option>
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => {
                setUpdateModalVisible(false);
                setSelectedIssue(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Issue
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
