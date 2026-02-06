
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Cấu hình Model theo AI_INSTRUCTIONS.md
const MODEL_CONFIG = {
  // Model mặc định (bắt buộc)
  DEFAULT: 'gemini-3-pro-preview',
  // Danh sách fallback theo thứ tự ưu tiên
  FALLBACK_ORDER: [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-flash'
  ]
};

export class GeminiService {
  private currentModelIndex = 0;

  /**
   * Lấy API key từ localStorage (ưu tiên) hoặc từ process.env
   */
  private getApiKey(): string {
    // Ưu tiên key từ localStorage theo AI_INSTRUCTIONS.md
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) return storedKey;
    }
    return process.env.API_KEY || '';
  }

  /**
   * Thực hiện API call với cơ chế fallback tự động
   */
  private async callWithFallback<T>(
    apiCallFn: (model: string, ai: GoogleGenAI) => Promise<T>,
    startModelIndex = 0
  ): Promise<T> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Chưa có API Key. Vui lòng nhập API Key trong phần Cài đặt.");
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError: any = null;

    // Thử từ model hiện tại, sau đó fallback
    for (let i = startModelIndex; i < MODEL_CONFIG.FALLBACK_ORDER.length; i++) {
      const model = MODEL_CONFIG.FALLBACK_ORDER[i];
      try {
        console.log(`[GeminiService] Đang sử dụng model: ${model}`);
        const result = await apiCallFn(model, ai);
        this.currentModelIndex = i; // Lưu lại model thành công
        return result;
      } catch (error: any) {
        console.warn(`[GeminiService] Model ${model} thất bại:`, error.message);
        lastError = error;

        // Nếu lỗi 429 (quota exceeded) hoặc model unavailable, thử model tiếp theo
        if (error.message?.includes('429') ||
          error.message?.includes('RESOURCE_EXHAUSTED') ||
          error.message?.includes('overloaded') ||
          error.message?.includes('not found')) {
          continue;
        }
        // Các lỗi khác (như auth) thì throw ngay
        throw error;
      }
    }

    // Tất cả model đều thất bại
    throw new Error(`Tất cả model đều thất bại. Lỗi cuối: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Phân tích văn bản dựa trên các tiêu chuẩn hành chính Việt Nam.
   * Sử dụng gemini-3-pro-preview (mặc định) với fallback tự động.
   */
  async analyzeDocument(content: string, docType: string, docCategory: string): Promise<AnalysisResult> {
    const prompt = `Bạn là chuyên gia về thể thức văn bản hành chính Việt Nam. Hãy phân tích văn bản sau đây dựa trên các quy định hiện hành.

Danh mục văn bản: ${docCategory}
Loại văn bản mục tiêu: ${docType}

Quy tắc áp dụng:
- Nếu là Văn bản hành chính: Áp dụng Nghị định 30/2020/NĐ-CP.
- Nếu là Văn bản công tác Đảng: Áp dụng Quy định 399-QĐ/TW.

Yêu cầu cực kỳ quan trọng cho trường 'standardizedContent':
- CHỈ chứa nội dung văn bản thuần túy (Plain Text) đã được chuẩn hóa.
- TUYỆT ĐỐI KHÔNG bao gồm các ký tự Markdown như \`\`\`html hoặc \`\`\`.
- KHÔNG bao gồm lời dẫn giải ("Dưới đây là...", "Sau đây là...").
- Giữ nguyên cấu trúc xuống dòng để tạo các đoạn văn bản.

Nội dung cần phân tích: 
---
${content}
---`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        isStandard: { type: Type.BOOLEAN },
        score: { type: Type.NUMBER },
        issues: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        standardizedContent: {
          type: Type.STRING,
          description: 'Nội dung văn bản thuần túy, không có định dạng markdown hay lời dẫn.'
        },
        metadata: {
          type: Type.OBJECT,
          properties: {
            docNumber: { type: Type.STRING },
            place: { type: Type.STRING },
            date: { type: Type.STRING },
            subject: { type: Type.STRING }
          }
        }
      },
      required: ['isStandard', 'score', 'issues', 'suggestions', 'standardizedContent']
    };

    try {
      const result = await this.callWithFallback(async (model, ai) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema
          }
        });
        return JSON.parse(response.text || "{}");
      });
      return result;
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("Lỗi xác thực API. Vui lòng chọn lại API Key trong phần Cài đặt.");
      }
      throw error;
    }
  }

  /**
   * Tạo bản xem trước HTML mô phỏng văn bản thực tế.
   * Sử dụng model hiện tại hoặc fallback.
   */
  async generatePreviewHtml(content: string): Promise<string> {
    const prompt = `Hãy chuyển đổi nội dung văn bản hành chính sau thành mã HTML mô phỏng trang giấy A4 (chỉ trả về một thẻ <div> duy nhất bao ngoài, KHÔNG có \`\`\`html hay các ký tự markdown khác). Sử dụng CSS inline để định dạng đúng vị trí: Quốc hiệu tiêu ngữ bên phải, Cơ quan ban hành bên trái, Tên loại văn bản ở giữa... theo Nghị định 30/2020/NĐ-CP hoặc Quy định 399 tùy ngữ cảnh:
${content}`;

    try {
      const result = await this.callWithFallback(async (model, ai) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        let html = response.text || "";
        html = html.replace(/```html/g, "").replace(/```/g, "").trim();
        return html || "<div>Nội dung không khả dụng</div>";
      });
      return result;
    } catch (error: any) {
      console.error("Preview HTML Error:", error);
      return "<div>Lỗi tạo bản xem trước</div>";
    }
  }
}
