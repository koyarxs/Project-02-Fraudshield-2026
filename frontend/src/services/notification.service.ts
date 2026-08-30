import api from './api';

export interface ApiNotification {
  id: number;
  type: 'CASE_ASSIGNED' | 'REVIEW_STARTED' | 'REVIEW_UPDATED' | 'CASE_RESOLVED';
  message: string;
  readAt: string | null;
  createdAt: string;
  riskCaseId: number;
  actor?: { id: number; name: string } | null;
  riskCase: { id: number; transactionId: number };
}

export interface NotificationFeed {
  items: ApiNotification[];
  unreadCount: number;
}

class NotificationService {
  async findAll(): Promise<NotificationFeed> {
    const response = await api.get<NotificationFeed>('/notification');
    return response.data;
  }

  async markAsRead(id: number): Promise<void> {
    await api.patch(`/notification/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await api.patch('/notification/read-all');
  }
}

export default new NotificationService();
