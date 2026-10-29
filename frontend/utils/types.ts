export type ErrorGroupStatus = 'UNRESOLVED' | 'RESOLVED';

export interface Project {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    ownerId?: string;
}

export interface ApiKey {
    id: string;
    keyPrefix: string;
    createdAt: string;
    revokedAt?: string | null;
}

export interface ErrorEvent {
    id: string;
    message: string;
    name: string;
    stack: string | null;
    timestamp: string;
    projectId: string;
    groupId: string;
    createdAt: string;
}

export interface ErrorGroup {
    id: string;
    fingerprint: string;
    message: string;
    name: string;
    occurrenceCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    status: ErrorGroupStatus;
    createdAt: string;
    updatedAt: string;
    projectId: string;
}

export interface DashboardSummary {
    totalErrorGroups: number;
    totalEvents: number;
    errorsLast24Hours: number;
}

export interface TrendBucket {
    timestamp: string;
    count: number;
}

export interface DashboardTrends {
    range: '24h' | '7d';
    data: TrendBucket[];
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ErrorGroupsResponse {
    groups: ErrorGroup[];
    pagination: PaginationMeta;
}

export interface ErrorGroupDetailResponse {
    group: ErrorGroup;
    events: ErrorEvent[];
    pagination: PaginationMeta;
}

export interface CreateApiKeyResponse {
    apiKey: string;
    key: {
        id: string;
        keyPrefix: string;
        createdAt: string;
    };
}
