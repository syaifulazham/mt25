import { apiRequest } from "@/lib/api-client";

export interface Video {
  id: number;
  group_name: string;
  title: string;
  video_description: string | null;
  video_link: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface VideoResponse {
  data: Video[];
  meta: PaginationMeta;
}

export const videoApi = {
  getVideos: (params?: { 
    search?: string;
    group_name?: string;
    activeOnly?: boolean;
  }) => apiRequest<Video[]>('/api/videos', { 
    params: params as Record<string, string | boolean | undefined>
  }),
  
  getVideosPaginated: (params?: { 
    search?: string;
    group_name?: string;
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) => apiRequest<VideoResponse>('/api/videos', { 
    params: { 
      ...params,
      paginated: true
    } as Record<string, string | number | boolean | undefined>
  }),
  
  getVideo: (id: number | string) =>
    apiRequest<{ data: Video }>(`/api/videos/${id}`),
  
  createVideo: (data: {
    title: string;
    group_name: string;
    video_description?: string;
    video_link: string;
    isActive?: boolean;
  }) => apiRequest<{ data: Video }>('/api/videos', {
    method: 'POST',
    body: data,
  }),
  
  updateVideo: (id: number | string, data: {
    title?: string;
    group_name?: string;
    video_description?: string | null;
    video_link?: string;
    isActive?: boolean;
  }) => apiRequest<{ data: Video }>(`/api/videos/${id}`, {
    method: 'PUT',
    body: data,
  }),
  
  deleteVideo: (id: number | string) =>
    apiRequest<{ message: string }>(`/api/videos/${id}`, {
      method: 'DELETE',
    }),
};
