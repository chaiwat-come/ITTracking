"use client";

import React from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { useState } from 'react';

const { TextArea } = Input;
const { Option } = Select;

interface IssueFormProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface IssueFormValues {
  title: string;
  description: string;
  category: string;
  priority: string;
}

export const IssueForm: React.FC<IssueFormProps> = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: IssueFormValues) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/issues/iss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create issue');
      }
      await response.json();

      message.success('Issue created successfully');
      form.resetFields();
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create issue';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Report IT Issue"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ priority: 'Medium' }}
        onFinishFailed={() => {}}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter issue title' }]}
        >
          <Input placeholder="Brief description of the issue" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please describe the issue' }]}
        >
          <TextArea 
            rows={4} 
            placeholder="Detailed description of the issue, steps to reproduce, etc." 
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please select a category' }]}
        >
          <Select placeholder="Select issue category">
            <Option value="Network">Network</Option>
            <Option value="Hardware">Hardware</Option>
            <Option value="Software">Software</Option>
            <Option value="Account">Account & Access</Option>
            <Option value="Email">Email</Option>
            <Option value="Printer">Printer</Option>
            <Option value="Other">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="priority"
          label="Priority"
          rules={[{ required: true, message: 'Please select priority' }]}
        >
          <Select placeholder="Select priority level">
            <Option value="Low">🟢 Low - Can wait</Option>
            <Option value="Medium">🟡 Medium - Normal</Option>
            <Option value="High">🟠 High - Urgent</Option>
            <Option value="Critical">🔴 Critical - Emergency</Option>
          </Select>
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end gap-2">
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit Issue
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
