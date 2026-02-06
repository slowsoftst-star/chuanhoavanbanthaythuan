
export enum DocType {
  NGHI_QUYET = 'Nghị quyết',
  QUYET_DINH = 'Quyết định',
  CONG_VAN = 'Công văn',
  BAO_CAO = 'Báo cáo',
  TO_TRINH = 'Tờ trình',
  BIEN_BAN = 'Biên bản',
  KE_HOACH = 'Kế hoạch',
  KHAC = 'Khác'
}

export enum DocCategory {
  HANH_CHINH = 'Văn bản hành chính',
  CONG_TAC_DANG = 'Văn bản công tác Đảng'
}

export interface DocStandard {
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
  fontSize: number;
  fontFamily: string;
  lineSpacing: string;
}

export interface AnalysisResult {
  isStandard: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  standardizedContent?: string;
  metadata?: {
    docNumber?: string;
    place?: string;
    date?: string;
    subject?: string;
  };
}

export interface HistoryItem {
  id: string;
  fileName: string;
  timestamp: number;
  docType: string;
  category: string;
  score: number;
  status: string;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
