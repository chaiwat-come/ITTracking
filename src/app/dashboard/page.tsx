"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    IssuesCloseOutlined,
    PlusOutlined,
    DashboardOutlined,
    UserOutlined,
    SettingOutlined,
    TeamOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ReloadOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import {
    Button,
    Layout,
    Menu,
    theme,
    Badge,
    Avatar,
    Dropdown,
    Space,
    Typography,
    Card,
    Statistic,
    Row,
    Col,
    message,
    Spin,
    Alert,
    Table,
    Tag,
    Modal,
    Form,
    Input,
    Select,
    Switch,
    Divider,
    Progress,
    Tooltip,
} from "antd";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import { IssueForm } from "@/components/IssueForm";
import { IssueList } from "@/components/IssueList";
import { NotificationBell } from "@/components/NotificationBell";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface User {
    id: number;
    username: string;
    role: string;
    email?: string;
}

interface DashboardStats {
    totalIssues: number;
    newIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    myIssues?: number;
    totalUsers?: number;
}

interface UserData extends User {
    createdAt?: string;
    status?: 'active' | 'inactive';
}

interface Settings {
    notifications: boolean;
    emailAlerts: boolean;
    theme: 'light' | 'dark';
    language: string;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [currentPage, setCurrentPage] = useState("issues"); // Default to issues for all users
    const [issueFormVisible, setIssueFormVisible] = useState(false);
    const [stats, setStats] = useState<DashboardStats>({
        totalIssues: 0,
        newIssues: 0,
        inProgressIssues: 0,
        resolvedIssues: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // User Management States
    const [users, setUsers] = useState<UserData[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [userForm] = Form.useForm();
    
    // Settings States
    const [settings, setSettings] = useState<Settings>({
        notifications: true,
        emailAlerts: false,
        theme: 'light',
        language: 'en',
    });
    const [settingsLoading, setSettingsLoading] = useState(false);

    const router = useRouter();

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    // Decode JWT from token string
    const decodeJwt = (token: string) => {
        try {
            const [, payload] = token.split(".");
            const json = JSON.parse(atob(payload));
            return json as { userId?: number; username?: string; role?: string };
        } catch {
            return {} as { userId?: number; username?: string; role?: string };
        }
    };

    // Check authentication and load user data
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const payload = decodeJwt(token);
        if (payload.userId && payload.username && payload.role) {
            setUser({
                id: payload.userId,
                username: payload.username,
                role: payload.role,
            });
            localStorage.setItem('userId', payload.userId.toString());
            localStorage.setItem('username', payload.username);
        } else {
            router.push('/');
        }
    }, [router]);

    // Load dashboard statistics
    const loadStats = useCallback(async () => {
        if (!user) return;

        try {
            setError(null);
            const token = localStorage.getItem('token');
            
            // Load issues
            const issuesResponse = await fetch('/api/issues/iss', {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!issuesResponse.ok) throw new Error('Failed to load statistics');

            const issuesData = await issuesResponse.json();
            const issues = issuesData.issues || [];

            const newStats: DashboardStats = {
                totalIssues: issues.length,
                newIssues: issues.filter((issue: { status: string }) => issue.status === 'New').length,
                inProgressIssues: issues.filter((issue: { status: string }) => issue.status === 'In Progress').length,
                resolvedIssues: issues.filter((issue: { status: string }) => issue.status === 'Resolved').length,
            };

            // For support users, add their own issues count
            if (user.role === 'support') {
                newStats.myIssues = issues.filter((issue: { assignedTo?: string }) => issue.assignedTo === user.username).length;
            }

            // Load users count for admin
            if (user.role === 'admin') {
                try {
                    const usersResponse = await fetch('/api/users', {
                        headers: {
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                    });
                    
                    if (usersResponse.ok) {
                        const usersData = await usersResponse.json();
                        newStats.totalUsers = usersData.users?.length || 0;
                    }
                } catch {
                    console.warn('Failed to load users count');
                }
            }

            setStats(newStats);
        } catch {
            setError('Failed to load dashboard data');
            message.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load users for management
    const loadUsers = useCallback(async () => {
        if (user?.role !== 'admin') return;

        setUsersLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users', {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!response.ok) throw new Error('Failed to load users');

            const data = await response.json();
            setUsers(data.users || []);
        } catch {
            message.error('Failed to load users');
        } finally {
            setUsersLoading(false);
        }
    }, [user]);

    // Save user (create or update)
    const saveUser = async (userData: { username: string; password?: string; role: string }) => {
        try {
            const token = localStorage.getItem('token');
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) throw new Error('Failed to save user');

            message.success(`User ${editingUser ? 'updated' : 'created'} successfully`);
            setUserModalVisible(false);
            setEditingUser(null);
            userForm.resetFields();
            loadUsers();
            loadStats();
        } catch  {
            message.error(`Failed to ${editingUser ? 'update' : 'create'} user`);
        }
    };

    // Delete user
    const deleteUser = async (userId: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!response.ok) throw new Error('Failed to delete user');

            message.success('User deleted successfully');
            loadUsers();
            loadStats();
        } catch  {
            message.error('Failed to delete user');
        }
    };

    // Save settings
    const saveSettings = async (newSettings: Settings) => {
        setSettingsLoading(true);
        try {
            // Simulate API call - replace with actual API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setSettings(newSettings);
            localStorage.setItem('userSettings', JSON.stringify(newSettings));
            message.success('Settings saved successfully');
        } catch {
            message.error('Failed to save settings');
        } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            // Set default page based on user role
            if (user.role === 'admin') {
                setCurrentPage('dashboard');
                loadStats();
                loadUsers();
            } else {
                setCurrentPage('issues');
            }
            
            // Load saved settings
            const savedSettings = localStorage.getItem('userSettings');
            if (savedSettings) {
                try {
                    setSettings(JSON.parse(savedSettings));
                } catch {
                    console.warn('Failed to parse saved settings');
                }
            }
        }
    }, [user, loadStats, loadUsers]);

    // Load users when switching to user management page
    useEffect(() => {
        if (currentPage === 'users' && user?.role === 'admin') {
            loadUsers();
        }
    }, [currentPage, user, loadUsers]);

    // Logout
    const handleSignout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        router.push("/");
    };

    // Get menu items based on user role
    const getMenuItems = () => {
        const baseItems = [];

        // Only admin can see Dashboard
        if (user?.role === 'admin') {
            baseItems.push({
                key: "dashboard",
                icon: <DashboardOutlined />,
                label: "Dashboard",
            });
        }

        // All users can see issues, but with different labels
        baseItems.push({
            key: "issues",
            icon: <IssuesCloseOutlined />,
            label: user?.role === 'admin' ? "All Issues" : "Issues",
        });

        // Only admin can see user management
        if (user?.role === 'admin') {
            baseItems.push({
                key: "users",
                icon: <UserOutlined />,
                label: "User Management",
            });
        }

        baseItems.push({
            key: "settings",
            icon: <SettingOutlined />,
            label: "Settings",
        });

        return baseItems;
    };

    // Render dashboard content based on current page
    const renderContent = () => {
        if (loading && currentPage === "dashboard") {
            return (
                <Spin size="large" spinning={true} tip="Loading dashboard...">
                    <div className="flex justify-center items-center min-h-96">
                        <div className="w-full h-full" />
                    </div>
                </Spin>
            );
        }

        if (error && currentPage === "dashboard") {
            return (
                <Alert
                    message="Error Loading Dashboard"
                    description={error}
                    type="error"
                    action={
                        <Button size="small" icon={<ReloadOutlined />} onClick={loadStats}>
                            Retry
                        </Button>
                    }
                    showIcon
                />
            );
        }

        switch (currentPage) {
            case "dashboard":
                // Only admin can access dashboard
                if (user?.role !== 'admin') {
                    return (
                        <Alert
                            message="Access Denied"
                            description="You don't have permission to access the dashboard. Only administrators can view dashboard statistics."
                            type="error"
                            showIcon
                            action={
                                <Button 
                                    type="primary" 
                                    onClick={() => setCurrentPage("issues")}
                                >
                                    Go to My Issues
                                </Button>
                            }
                        />
                    );
                }
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <Title level={2} className="!mb-2">
                                    Welcome back, {user?.username}! 👋
                                </Title>
                                <p className="text-gray-600">
                                    Here&apos;s what&apos;s happening with your IT support system today.
                                </p>
                            </div>
                            <Space>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={loadStats}
                                    loading={loading}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => setIssueFormVisible(true)}
                                    size="large"
                                >
                                    Report Issue
                                </Button>
                            </Space>
                        </div>

                        {/* Statistics Cards */}
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} lg={6}>
                                <Card hoverable className="border-l-4 border-l-blue-500">
                                    <Statistic
                                        title="Total Issues"
                                        value={stats.totalIssues}
                                        valueStyle={{ color: '#1890ff', fontSize: '2rem', fontWeight: 'bold' }}
                                        prefix={<IssuesCloseOutlined />}
                                        suffix={
                                            <Tooltip title="All issues in the system">
                                                <Button type="text" size="small" icon={<EyeOutlined />} />
                                            </Tooltip>
                                        }
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Card hoverable className="border-l-4 border-l-orange-500">
                                    <Statistic
                                        title="New Issues"
                                        value={stats.newIssues}
                                        valueStyle={{ color: '#fa8c16', fontSize: '2rem', fontWeight: 'bold' }}
                                        prefix={<ExclamationCircleOutlined />}
                                    />
                                    <Progress 
                                        percent={stats.totalIssues ? (stats.newIssues / stats.totalIssues) * 100 : 0} 
                                        size="small" 
                                        strokeColor="#fa8c16"
                                        showInfo={false}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Card hoverable className="border-l-4 border-l-yellow-500">
                                    <Statistic
                                        title="In Progress"
                                        value={stats.inProgressIssues}
                                        valueStyle={{ color: '#faad14', fontSize: '2rem', fontWeight: 'bold' }}
                                        prefix={<ClockCircleOutlined />}
                                    />
                                    <Progress 
                                        percent={stats.totalIssues ? (stats.inProgressIssues / stats.totalIssues) * 100 : 0} 
                                        size="small" 
                                        strokeColor="#faad14"
                                        showInfo={false}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Card hoverable className="border-l-4 border-l-green-500">
                                    <Statistic
                                        title="Resolved"
                                        value={stats.resolvedIssues}
                                        valueStyle={{ color: '#52c41a', fontSize: '2rem', fontWeight: 'bold' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                    <Progress 
                                        percent={stats.totalIssues ? (stats.resolvedIssues / stats.totalIssues) * 100 : 0} 
                                        size="small" 
                                        strokeColor="#52c41a"
                                        showInfo={false}
                                    />
                                </Card>
                            </Col>
                            {(user?.role as string) === 'support' && stats.myIssues !== undefined && (
                                <Col xs={24} sm={12} lg={6}>
                                    <Card hoverable className="border-l-4 border-l-purple-500">
                                        <Statistic
                                            title="My Issues"
                                            value={stats.myIssues}
                                            valueStyle={{ color: '#722ed1', fontSize: '2rem', fontWeight: 'bold' }}
                                            prefix={<UserOutlined />}
                                        />
                                    </Card>
                                </Col>
                            )}
                            {user?.role === 'admin' && stats.totalUsers !== undefined && (
                                <Col xs={24} sm={12} lg={6}>
                                    <Card hoverable className="border-l-4 border-l-indigo-500">
                                        <Statistic
                                            title="Total Users"
                                            value={stats.totalUsers}
                                            valueStyle={{ color: '#597ef7', fontSize: '2rem', fontWeight: 'bold' }}
                                            prefix={<TeamOutlined />}
                                        />
                                    </Card>
                                </Col>
                            )}
                        </Row>

                        {/* Performance Overview */}
                        {stats.totalIssues > 0 && (
                            <Card title={<><BarChartOutlined /> Performance Overview</>} className="mt-6">
                                <Row gutter={[24, 24]}>
                                    <Col xs={24} md={12}>
                                        <div className="text-center">
                                            <Title level={4}>Resolution Rate</Title>
                                            <Progress
                                                type="circle"
                                                percent={Math.round((stats.resolvedIssues / stats.totalIssues) * 100)}
                                                strokeColor={{
                                                    '0%': '#108ee9',
                                                    '100%': '#87d068',
                                                }}
                                                size={120}
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span>New Issues</span>
                                                <Tag color="orange">{stats.newIssues}</Tag>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>In Progress</span>
                                                <Tag color="gold">{stats.inProgressIssues}</Tag>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Resolved</span>
                                                <Tag color="green">{stats.resolvedIssues}</Tag>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                        )}

                        {/* Quick Actions */}
                        <Card title="Quick Actions" className="mt-6">
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={8}>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIssueFormVisible(true)}
                                        block
                                        size="large"
                                    >
                                        Report New Issue
                                    </Button>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Button
                                        icon={<IssuesCloseOutlined />}
                                        onClick={() => setCurrentPage("issues")}
                                        block
                                        size="large"
                                    >
                                        View All Issues
                                    </Button>
                                </Col>
                                {user?.role === 'admin' && (
                                    <Col xs={24} sm={8}>
                                        <Button
                                            icon={<TeamOutlined />}
                                            onClick={() => setCurrentPage("users")}
                                            block
                                            size="large"
                                        >
                                            Manage Users
                                        </Button>
                                    </Col>
                                )}
                            </Row>
                        </Card>
                    </div>
                );

            case "issues":
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <Title level={2}>
                                {user?.role === 'admin' ? 'All Issues' : 'Issues'}
                            </Title>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setIssueFormVisible(true)}
                            >
                                Report Issue
                            </Button>
                        </div>
                        <IssueList userRole={user?.role || 'support'} />
                    </div>
                );

            case "users":
                if (user?.role !== 'admin') {
                    return (
                        <Alert
                            message="Access Denied"
                            description="You don't have permission to access user management."
                            type="error"
                            showIcon
                        />
                    );
                }

                const userColumns = [
                    {
                        title: 'ID',
                        dataIndex: 'id',
                        key: 'id',
                        width: 80,
                    },
                    {
                        title: 'Username',
                        dataIndex: 'username',
                        key: 'username',
                        render: (text: string) => <strong>{text}</strong>,
                    },
                    {
                        title: 'Role',
                        dataIndex: 'role',
                        key: 'role',
                        render: (role: string) => (
                            <Tag color={role === 'admin' ? 'red' : role === 'support' ? 'blue' : 'green'}>
                                {role.toUpperCase()}
                            </Tag>
                        ),
                    },
                    {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string = 'active') => (
                            <Tag color={status === 'active' ? 'green' : 'red'}>
                                {status.toUpperCase()}
                            </Tag>
                        ),
                    },
                    {
                        title: 'Actions',
                        key: 'actions',
                        render: (_: unknown, record: UserData) => (
                            <Space>
                                <Tooltip title="Edit User">
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            setEditingUser(record);
                                            userForm.setFieldsValue(record);
                                            setUserModalVisible(true);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip title="Delete User">
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => {
                                            Modal.confirm({
                                                title: 'Delete User',
                                                content: `Are you sure you want to delete user "${record.username}"?`,
                                                okText: 'Delete',
                                                okType: 'danger',
                                                onOk: () => deleteUser(record.id),
                                            });
                                        }}
                                        disabled={record.id === user?.id}
                                    />
                                </Tooltip>
                            </Space>
                        ),
                    },
                ];

                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <Title level={2} className="!mb-2">
                                    <TeamOutlined /> User Management
                                </Title>
                                <p className="text-gray-600">
                                    Manage system users and their permissions.
                                </p>
                            </div>
                            <Space>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={loadUsers}
                                    loading={usersLoading}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setEditingUser(null);
                                        userForm.resetFields();
                                        setUserModalVisible(true);
                                    }}
                                >
                                    Add User
                                </Button>
                            </Space>
                        </div>

                        <Card>
                            <Table
                                columns={userColumns}
                                dataSource={users}
                                loading={usersLoading}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    showTotal: (total, range) =>
                                        `${range[0]}-${range[1]} of ${total} users`,
                                }}
                            />
                        </Card>
                    </div>
                );

            case "settings":
                return (
                    <div className="space-y-6">
                        <div>
                            <Title level={2} className="!mb-2">
                                <SettingOutlined /> Settings
                            </Title>
                            <p className="text-gray-600">
                                Customize your preferences and system settings.
                            </p>
                        </div>

                        <Row gutter={[24, 24]}>
                            <Col xs={24} lg={12}>
                                <Card title="Notification Settings" className="h-full">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-medium">Push Notifications</div>
                                                <div className="text-sm text-gray-500">
                                                    Receive notifications for new issues and updates
                                                </div>
                                            </div>
                                            <Switch
                                                checked={settings.notifications}
                                                onChange={(checked) => 
                                                    saveSettings({ ...settings, notifications: checked })
                                                }
                                                loading={settingsLoading}
                                            />
                                        </div>
                                        <Divider />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-medium">Email Alerts</div>
                                                <div className="text-sm text-gray-500">
                                                    Receive email notifications for critical issues
                                                </div>
                                            </div>
                                            <Switch
                                                checked={settings.emailAlerts}
                                                onChange={(checked) => 
                                                    saveSettings({ ...settings, emailAlerts: checked })
                                                }
                                                loading={settingsLoading}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} lg={12}>
                                <Card title="Appearance" className="h-full">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="font-medium mb-2">Theme</div>
                                            <Select
                                                value={settings.theme}
                                                onChange={(value) => 
                                                    saveSettings({ ...settings, theme: value })
                                                }
                                                className="w-full"
                                                loading={settingsLoading}
                                            >
                                                <Select.Option value="light">Light</Select.Option>
                                                <Select.Option value="dark">Dark</Select.Option>
                                            </Select>
                                        </div>
                                        <Divider />
                                        <div>
                                            <div className="font-medium mb-2">Language</div>
                                            <Select
                                                value={settings.language}
                                                onChange={(value) => 
                                                    saveSettings({ ...settings, language: value })
                                                }
                                                className="w-full"
                                                loading={settingsLoading}
                                            >
                                                <Select.Option value="en">English</Select.Option>
                                                <Select.Option value="th">ไทย</Select.Option>
                                            </Select>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24}>
                                <Card title="Account Information">
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} sm={8}>
                                            <div className="text-center">
                                                <Avatar size={80} icon={<UserOutlined />} />
                                                <div className="mt-3">
                                                    <div className="font-medium text-lg">{user?.username}</div>
                                                    <Tag color={user?.role === 'admin' ? 'red' : user?.role === 'support' ? 'blue' : 'green'}>
                                                        {user?.role?.toUpperCase()}
                                                    </Tag>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col xs={24} sm={16}>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">User ID:</span>
                                                    <span className="font-medium">{user?.id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Username:</span>
                                                    <span className="font-medium">{user?.username}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Role:</span>
                                                    <span className="font-medium">{user?.role}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Status:</span>
                                                    <Tag color="green">ACTIVE</Tag>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!user) {
        return (
            <Spin size="large" spinning={true} tip="Loading user data...">
                <div className="flex justify-center items-center min-h-screen">
                    <div className="w-full h-full" />
                </div>
            </Spin>
        );
    }

    return (
        <WebSocketProvider>
            <Layout className="h-screen overflow-hidden">
                <Sider 
                    trigger={null} 
                    collapsible 
                    collapsed={collapsed} 
                    theme="dark" 
                    className="shadow-lg h-full"
                    style={{ height: '100vh' }}
                >
                    <div className="h-16 flex items-center justify-center m-4">
                        {!collapsed ? (
                            <div className="text-white font-bold text-lg">
                                🛠️ IT Tracker
                            </div>
                        ) : (
                            <div className="text-white text-xl">🛠️</div>
                        )}
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[currentPage]}
                        onClick={(e) => setCurrentPage(e.key)}
                        items={getMenuItems()}
                        className="border-r-0 h-full"
                        style={{ height: 'calc(100vh - 80px)', overflowY: 'auto' }}
                    />
                </Sider>
                <Layout className="h-full">
                    <Header 
                        className="flex justify-between items-center px-4 shadow-sm" 
                        style={{ 
                            background: colorBgContainer,
                            height: 64,
                            lineHeight: 'normal',
                            padding: '0 24px'
                        }}
                    >
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: "16px", width: 64, height: 64 }}
                        />
                        <div className="flex items-center gap-4">
                            <NotificationBell />
                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: 'profile',
                                            icon: <UserOutlined />,
                                            label: 'Profile',
                                        },
                                        {
                                            key: 'settings',
                                            icon: <SettingOutlined />,
                                            label: 'Settings',
                                            onClick: () => setCurrentPage('settings'),
                                        },
                                        {
                                            type: 'divider',
                                        },
                                        {
                                            key: 'logout',
                                            icon: <LogoutOutlined />,
                                            label: 'Logout',
                                            onClick: handleSignout,
                                        },
                                    ],
                                }}
                                trigger={['click']}
                            >
                                <Space className="cursor-pointer">
                                    <Avatar icon={<UserOutlined />} />
                                    <span className="font-medium">{user.username}</span>
                                    <Badge
                                        count={user.role.toUpperCase()}
                                        style={{ backgroundColor: user.role === 'admin' ? '#52c41a' : user.role === 'support' ? '#1890ff' : '#722ed1' }}
                                    />
                                </Space>
                            </Dropdown>
                        </div>
                    </Header>
                    <Content
                        className="overflow-auto"
                        style={{
                            margin: 0,
                            padding: '24px',
                            height: 'calc(100vh - 64px)',
                            background: colorBgContainer,
                        }}
                    >
                        <div style={{ minHeight: 'calc(100vh - 112px)' }}>
                            {renderContent()}
                        </div>
                    </Content>
                </Layout>
            </Layout>

            {/* Issue Form Modal */}
            <IssueForm
                visible={issueFormVisible}
                onCancel={() => setIssueFormVisible(false)}
                onSuccess={() => {
                    setIssueFormVisible(false);
                    loadStats();
                }}
            />

            {/* User Management Modal */}
            <Modal
                title={editingUser ? 'Edit User' : 'Add New User'}
                open={userModalVisible}
                onCancel={() => {
                    setUserModalVisible(false);
                    setEditingUser(null);
                    userForm.resetFields();
                }}
                footer={null}
                width={500}
            >
                <Form
                    form={userForm}
                    layout="vertical"
                    onFinish={saveUser}
                    initialValues={{ role: 'user' }}
                >
                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[
                            { required: true, message: 'Please enter username' },
                            { min: 3, message: 'Username must be at least 3 characters' },
                        ]}
                    >
                        <Input placeholder="Enter username" />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[
                                { required: true, message: 'Please enter password' },
                                { min: 6, message: 'Password must be at least 6 characters' },
                            ]}
                        >
                            <Input.Password placeholder="Enter password" />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select placeholder="Select role">
                            <Select.Option value="user">User</Select.Option>
                            <Select.Option value="support">Support</Select.Option>
                            <Select.Option value="admin">Admin</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item className="mb-0 flex justify-end">
                        <Space>
                            <Button onClick={() => setUserModalVisible(false)}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {editingUser ? 'Update User' : 'Create User'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </WebSocketProvider>
    );
}
