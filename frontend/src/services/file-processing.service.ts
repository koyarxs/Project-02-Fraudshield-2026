import api from './api';
import type { FileProcessingResponse } from '../types/processing';

export type { FileProcessingResponse } from '../types/processing';

class FileProcessingService {
  async uploadCsv(
    file: File,
    userId: number,
  ): Promise<FileProcessingResponse> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('userId', String(userId));

    const response = await api.post<FileProcessingResponse>(
      '/file-processing/upload',
      formData,
    );

    return response.data;
  }
}

export default new FileProcessingService();
