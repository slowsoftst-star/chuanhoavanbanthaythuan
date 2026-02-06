
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { DocType, DocCategory, AnalysisResult, AppNotification, HistoryItem } from './types';
import { ND30_STANDARD, APP_CONFIG } from './constants';
import { GeminiService } from './services/geminiService';
import confetti from 'canvas-confetti';

// Khai báo kiểu cho các thư viện cài qua CDN
declare const mammoth: any;
declare const docx: any;
declare const saveAs: any;

// --- Helpers for LocalStorage ---

const getStoredHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(APP_CONFIG.LS_DOCS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading history", error);
    return [];
  }
};

const addHistoryItem = (item: HistoryItem) => {
  try {
    const history = getStoredHistory();
    // Thêm vào đầu danh sách
    const newHistory = [item, ...history];
    // Giới hạn lưu trữ 50 item gần nhất để tránh đầy bộ nhớ
    if (newHistory.length > 50) newHistory.pop();
    localStorage.setItem(APP_CONFIG.LS_DOCS, JSON.stringify(newHistory));
    return newHistory;
  } catch (error) {
    console.error("Error saving history", error);
    return [];
  }
};

const removeHistoryItem = (id: string) => {
  try {
    const history = getStoredHistory();
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem(APP_CONFIG.LS_DOCS, JSON.stringify(newHistory));
    return newHistory;
  } catch (error) {
    console.error("Error removing history item", error);
    return [];
  }
};

// --- Components ---

const Toast: React.FC<{ notification: AppNotification | null, onClose: () => void }> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const bgStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white flex items-center gap-3 animate-slide-up ${bgStyles[notification.type]}`}>
      <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
      <span>{notification.message}</span>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-white h-screen border-r border-slate-200 flex flex-col sticky top-0">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg">
            <i className="fas fa-file-shield text-xl"></i>
          </div>
          <span className="font-bold text-slate-800 text-lg leading-tight">Văn Bản AI</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <Link to="/" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fas fa-chart-pie w-5 text-center"></i>
          Tổng quan
        </Link>
        <Link to="/standardize" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/standardize') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fas fa-magic w-5 text-center"></i>
          Chuẩn hóa văn bản
        </Link>
        <Link to="/history" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/history') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fas fa-history w-5 text-center"></i>
          Lịch sử xử lý
        </Link>
      </nav>
      <div className="p-4 border-t border-slate-100">
        <Link to="/settings" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/settings') ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}>
          <i className="fas fa-cog w-5 text-center"></i>
          Cài đặt
        </Link>
      </div>
      <div className="px-4 pb-4 text-center">
        <p className="signature-text text-sm">
          Được phát triển bởi thầy Trần Minh Thuận
        </p>
      </div>
    </div>
  );
};

// --- Pages ---

const Dashboard: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  // Calculate statistics
  const totalDocs = history.length;
  const avgScore = totalDocs > 0
    ? Math.round(history.reduce((acc, item) => acc + item.score, 0) / totalDocs * 10) / 10
    : 0;
  // Giả sử mỗi văn bản tiết kiệm 30 phút
  const timeSaved = Math.round((totalDocs * 30) / 60);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trình điều khiển thông minh</h1>
          <p className="text-slate-500">Tối ưu hóa quy trình soạn thảo theo NĐ 30/2020/NĐ-CP.</p>
        </div>
        <Link to="/standardize" className="px-6 py-3 rounded-full gradient-primary text-white font-semibold shadow-lg hover:scale-105 transition-transform">
          Xử lý văn bản mới <i className="fas fa-bolt ml-2"></i>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Tổng văn bản đã xử lý', value: totalDocs, icon: 'fa-file-circle-check', color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Độ chuẩn xác trung bình', value: `${avgScore}%`, icon: 'fa-gauge-high', color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Thời gian đã tiết kiệm', value: `${timeSaved} giờ`, icon: 'fa-clock-rotate-left', color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center text-2xl shadow-sm`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fas fa-list-check text-blue-500"></i> Công việc gần đây
          </h2>
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>Chưa có văn bản nào được xử lý</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                      <i className="fas fa-file-lines text-xl"></i>
                    </div>
                    <div>
                      <p className="text-slate-800 font-bold truncate max-w-[200px]">{item.fileName}</p>
                      <p className="text-xs text-slate-400 font-medium">{item.docType} • {new Date(item.timestamp).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400 uppercase font-bold">Chuẩn hóa</p>
                      <p className={`text-sm font-bold ${item.score >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>{item.score}%</p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-lg font-bold ${item.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Mẹo chuẩn hóa</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-sm font-bold text-blue-800 mb-1">Căn lề chuẩn</p>
              <p className="text-xs text-blue-600">Lề trái luôn phải là 30mm - 35mm để đóng file hồ sơ.</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-sm font-bold text-amber-800 mb-1">Chữ ký số</p>
              <p className="text-xs text-amber-600">Hình ảnh chữ ký số phải là hình tròn, màu đỏ, kích thước chuẩn.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm font-bold text-slate-800 mb-1">Tiêu ngữ</p>
              <p className="text-xs text-slate-600">Luôn ghi hoa chữ cái đầu và có gạch ngang dài dưới Tiêu ngữ.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Standardize: React.FC<{ onNotify: (n: AppNotification) => void }> = ({ onNotify }) => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [docCategory, setDocCategory] = useState<DocCategory>(DocCategory.HANH_CHINH);
  const [docType, setDocType] = useState<DocType>(DocType.CONG_VAN);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      onNotify({ id: Date.now().toString(), type: 'error', message: 'Hệ thống chỉ hỗ trợ file .docx' });
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        setContent(result.value);
        onNotify({ id: Date.now().toString(), type: 'success', message: 'Tải văn bản thành công!' });
      } catch (err) {
        onNotify({ id: Date.now().toString(), type: 'error', message: 'Không thể đọc nội dung file Word.' });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStandardize = async () => {
    if (!content.trim()) {
      onNotify({ id: Date.now().toString(), type: 'warning', message: 'Vui lòng nhập nội dung hoặc tải file lên.' });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setPreviewHtml(null);

    try {
      const gemini = new GeminiService();
      const analysis = await gemini.analyzeDocument(content, docType, docCategory);

      // Clean content
      if (analysis.standardizedContent) {
        analysis.standardizedContent = analysis.standardizedContent
          .replace(/```html/g, "")
          .replace(/```/g, "")
          .replace(/^.*Dưới đây là mã HTML.*$/gm, "")
          .trim();
      }

      const preview = await gemini.generatePreviewHtml(analysis.standardizedContent || content);

      setResult(analysis);
      setPreviewHtml(preview);

      // Save to History
      const status = analysis.score >= 90 ? 'Hoàn thành' : 'Cần kiểm tra';
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        fileName: fileName || `VanBan_${new Date().toISOString().slice(0, 10)}.docx`,
        timestamp: Date.now(),
        docType: docType,
        category: docCategory,
        score: analysis.score,
        status: status
      };
      addHistoryItem(newItem);

      if (analysis.score >= 90) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        onNotify({ id: Date.now().toString(), type: 'success', message: 'Văn bản đã được chuẩn hóa thành công!' });
      } else {
        onNotify({ id: Date.now().toString(), type: 'info', message: 'Phân tích hoàn tất. Có một số điểm cần lưu ý.' });
      }
    } catch (err: any) {
      onNotify({ id: Date.now().toString(), type: 'error', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!previewHtml) {
      onNotify({ id: Date.now().toString(), type: 'warning', message: 'Chưa có nội dung chuẩn hóa để tải về.' });
      return;
    }

    // Hàm chờ thư viện sẵn sàng với retry
    const waitForLibraries = (maxAttempts = 10): Promise<boolean> => {
      return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          const docxLib = (window as any).docx;
          const saveAsLib = (window as any).saveAs;
          if (docxLib && saveAsLib) {
            resolve(true);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, 200);
          } else {
            resolve(false);
          }
        };
        check();
      });
    };

    // Chờ thư viện load
    const librariesReady = await waitForLibraries();
    if (!librariesReady) {
      onNotify({ id: Date.now().toString(), type: 'error', message: 'Thư viện xuất file chưa sẵn sàng. Vui lòng tải lại trang và thử lại.' });
      return;
    }

    try {
      const docxLib = (window as any).docx;
      const saveAsLib = (window as any).saveAs;
      const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = docxLib;

      // Parse HTML để lấy cấu trúc
      const parser = new DOMParser();
      const doc = parser.parseFromString(previewHtml, 'text/html');
      const container = doc.body.firstElementChild || doc.body;

      // Hàm helper để lấy alignment từ style
      const getAlignment = (el: Element): any => {
        const style = el.getAttribute('style') || '';
        if (style.includes('text-align: center') || style.includes('text-align:center')) {
          return AlignmentType.CENTER;
        }
        if (style.includes('text-align: right') || style.includes('text-align:right')) {
          return AlignmentType.RIGHT;
        }
        if (style.includes('text-align: justify') || style.includes('text-align:justify')) {
          return AlignmentType.JUSTIFIED;
        }
        return AlignmentType.LEFT;
      };

      // Hàm helper để check bold/italic
      const isBold = (el: Element): boolean => {
        const style = el.getAttribute('style') || '';
        const tagName = el.tagName.toLowerCase();
        return style.includes('font-weight: bold') || style.includes('font-weight:bold') ||
          style.includes('font-weight: 700') || style.includes('font-weight:700') ||
          tagName === 'b' || tagName === 'strong';
      };

      const isItalic = (el: Element): boolean => {
        const style = el.getAttribute('style') || '';
        const tagName = el.tagName.toLowerCase();
        return style.includes('font-style: italic') || style.includes('font-style:italic') ||
          tagName === 'i' || tagName === 'em';
      };

      // Hàm helper để lấy font size từ style (convert px to half-points)
      const getFontSize = (el: Element): number => {
        const style = el.getAttribute('style') || '';
        const match = style.match(/font-size:\s*(\d+)px/);
        if (match) {
          const px = parseInt(match[1]);
          // Convert px to half-points (1pt = 2 half-points, 1px ≈ 0.75pt)
          return Math.round(px * 0.75 * 2);
        }
        return 28; // Default 14pt
      };

      // Hàm recursive để parse element và tạo TextRuns
      const parseTextContent = (el: Element): any[] => {
        const runs: any[] = [];

        el.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.trim()) {
              runs.push(new TextRun({
                text: text,
                font: "Times New Roman",
                size: getFontSize(el),
                bold: isBold(el),
                italics: isItalic(el),
              }));
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const childEl = node as Element;
            const childRuns = parseTextContent(childEl);

            // Apply parent's styling to child runs if needed
            childRuns.forEach(run => {
              if (isBold(childEl) && run.properties) {
                run.properties.bold = true;
              }
              if (isItalic(childEl) && run.properties) {
                run.properties.italics = true;
              }
            });

            runs.push(...childRuns);
          }
        });

        return runs;
      };

      // Tạo paragraphs từ HTML elements
      const paragraphs: any[] = [];

      const processElement = (el: Element) => {
        const tagName = el.tagName.toLowerCase();

        // Skip script/style tags
        if (tagName === 'script' || tagName === 'style') return;

        // Check if element has table
        if (tagName === 'table') {
          // Process table separately
          const rows: any[] = [];
          el.querySelectorAll('tr').forEach((tr) => {
            const cells: any[] = [];
            tr.querySelectorAll('td, th').forEach((cell) => {
              const cellParagraphs: any[] = [];
              const textRuns = parseTextContent(cell);
              if (textRuns.length > 0) {
                cellParagraphs.push(new Paragraph({
                  alignment: getAlignment(cell),
                  children: textRuns,
                }));
              }
              cells.push(new TableCell({
                children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [] })],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }));
            });
            if (cells.length > 0) {
              rows.push(new TableRow({ children: cells }));
            }
          });
          if (rows.length > 0) {
            paragraphs.push(new Table({
              rows: rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }));
          }
          return;
        }

        // Process div/p/span as paragraphs
        if (tagName === 'div' || tagName === 'p' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
          // Check if has child divs/p (nested structure)
          const hasBlockChildren = el.querySelector('div, p, table');

          if (hasBlockChildren) {
            // Process children recursively
            Array.from(el.children).forEach(child => processElement(child));
          } else {
            // Create paragraph from this element
            const textRuns = parseTextContent(el);
            if (textRuns.length > 0 || el.textContent?.trim()) {
              paragraphs.push(new Paragraph({
                alignment: getAlignment(el),
                children: textRuns.length > 0 ? textRuns : [
                  new TextRun({
                    text: el.textContent?.trim() || '',
                    font: "Times New Roman",
                    size: getFontSize(el),
                    bold: isBold(el),
                  })
                ],
                spacing: { line: 360, before: 60, after: 60 },
              }));
            }
          }
          return;
        }

        // For other elements, process children
        Array.from(el.children).forEach(child => processElement(child));
      };

      // Process the container
      processElement(container);

      // If no paragraphs were created, fall back to plain text
      if (paragraphs.length === 0) {
        const cleanContent = result?.standardizedContent || previewHtml.replace(/<[^>]*>/g, '\n');
        const lines = cleanContent.split('\n').filter((l: string) => l.trim());

        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) {
            const isUpperCase = trimmed === trimmed.toUpperCase() && trimmed.length < 100;
            paragraphs.push(new Paragraph({
              alignment: isUpperCase ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: trimmed,
                  font: "Times New Roman",
                  size: 28,
                  bold: isUpperCase,
                })
              ],
              spacing: { line: 360, before: 60, after: 60 },
            }));
          }
        });
      }

      // Tạo document với định dạng NĐ30
      const wordDoc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: "Times New Roman",
                size: 28, // 14pt
              },
            },
          },
        },
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1134,    // 20mm
                bottom: 1134, // 20mm
                left: 1701,   // 30mm
                right: 850,   // 15mm
              },
              size: {
                width: 11906, // A4 width in twips
                height: 16838, // A4 height in twips
              }
            }
          },
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(wordDoc);
      const outputFileName = fileName ? `ChuanHoa_${fileName}` : "VanBan_ChuanHoa.docx";
      saveAsLib(blob, outputFileName);
      onNotify({ id: Date.now().toString(), type: 'success', message: `Đã tải xuống file "${outputFileName}" thành công!` });

    } catch (error: any) {
      console.error("Download Word error:", error);
      onNotify({ id: Date.now().toString(), type: 'error', message: 'Lỗi khi tạo file Word: ' + (error.message || 'Unknown error') });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Công cụ chuẩn hóa</h1>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".docx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-semibold flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-file-word text-blue-500"></i> Upload file VB cần chuẩn hóa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Danh mục văn bản</label>
                <select
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-slate-50 transition-all"
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocCategory)}
                >
                  {Object.values(DocCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Loại văn bản mục tiêu</label>
                <select
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-slate-50 transition-all"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocType)}
                >
                  {Object.values(DocType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung văn bản gốc</label>
              <textarea
                className="w-full h-[500px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm custom-scrollbar bg-slate-50 transition-all"
                placeholder="Dán nội dung hoặc tải tệp lên để bắt đầu phân tích..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
            </div>
            <button
              onClick={handleStandardize}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl text-white font-bold shadow-xl transition-all flex items-center justify-center gap-3 ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'gradient-primary hover:brightness-110 active:scale-[0.98]'}`}
            >
              {isProcessing ? (
                <><i className="fas fa-spinner fa-spin"></i> Trí tuệ nhân tạo đang phân tích...</>
              ) : (
                <><i className="fas fa-wand-magic-sparkles"></i> Chuẩn hóa toàn diện</>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {result ? (
            <div className="space-y-6 animate-slide-up">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Kết quả đánh giá</h2>
                    <p className="text-xs text-slate-400 font-medium">So sánh với quy định: {docCategory === DocCategory.HANH_CHINH ? 'NĐ 30/2020' : 'QĐ 399'}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-4 shadow-sm ${result.score >= 80 ? 'border-emerald-500 text-emerald-600' : result.score >= 50 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'}`}>
                    {result.score}%
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fas fa-circle-exclamation"></i> Lỗi cần sửa ({result.issues.length})
                    </h3>
                    <ul className="space-y-2.5">
                      {result.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                          <i className="fas fa-circle-xmark mt-1 text-red-400"></i>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fas fa-wand-magic"></i> AI Đề xuất
                    </h3>
                    <ul className="space-y-2.5">
                      {result.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                          <i className="fas fa-sparkles mt-1 text-blue-400"></i>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Bản thảo chuẩn hóa</h2>
                  <button
                    onClick={handleDownloadWord}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    <i className="fas fa-download"></i> Tải tệp .docx
                  </button>
                </div>
                <div
                  className="bg-slate-50 p-8 rounded-xl border border-slate-200 min-h-[400px] text-slate-800 shadow-inner overflow-y-auto font-serif"
                  style={{ lineHeight: '1.5' }}
                  dangerouslySetInnerHTML={{ __html: previewHtml || '' }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[600px]">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 text-4xl shadow-inner">
                <i className="fas fa-magnifying-glass-chart"></i>
              </div>
              <div className="space-y-2">
                <p className="text-slate-800 font-bold text-xl">Sẵn sàng phân tích</p>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">Vui lòng tải tệp Word hoặc dán nội dung văn bản vào khung bên trái để bắt đầu quá trình kiểm tra tự động.</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <i className="fas fa-check text-emerald-400"></i> Đúng Nghị định 30/QĐ 399
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <i className="fas fa-check text-emerald-400"></i> Sửa lỗi tự động
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC<{ onNotify: (n: AppNotification) => void }> = ({ onNotify }) => {
  const [apiKeys, setApiKeys] = useState<{ name: string, key: string }[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Load saved API keys on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('gemini_api_keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Error loading API keys', e);
      }
    }
    // Backward compatibility: load single key
    const singleKey = localStorage.getItem('gemini_api_key');
    if (singleKey && !savedKeys) {
      setApiKeys([{ name: 'Default', key: singleKey }]);
    }
  }, []);

  const handleAddKey = () => {
    if (!newKeyValue.trim()) {
      onNotify({ id: Date.now().toString(), type: 'warning', message: 'Vui lòng nhập API Key.' });
      return;
    }
    const name = newKeyName.trim() || `Key ${apiKeys.length + 1}`;
    const newKeys = [...apiKeys, { name, key: newKeyValue.trim() }];
    setApiKeys(newKeys);
    setNewKeyName('');
    setNewKeyValue('');
    onNotify({ id: Date.now().toString(), type: 'success', message: `Đã thêm API Key "${name}"!` });
  };

  const handleRemoveKey = (index: number) => {
    const newKeys = apiKeys.filter((_, i) => i !== index);
    setApiKeys(newKeys);
  };

  const handleSaveConfig = () => {
    localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
    // Also save first key as default for backward compatibility
    if (apiKeys.length > 0) {
      localStorage.setItem('gemini_api_key', apiKeys[0].key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    onNotify({ id: Date.now().toString(), type: 'success', message: 'Đã lưu cấu hình thành công!' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <i className="fas fa-user-gear text-blue-600 text-3xl"></i>
        <h1 className="text-2xl font-bold text-slate-800">Thiết lập hệ thống</h1>
      </div>

      {/* Thêm API Key mới */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-base font-bold text-blue-600 mb-4 flex items-center gap-2">
          <i className="fas fa-plus"></i> Thêm API Key mới
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Tên (tùy chọn)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-700"
          />
          <input
            type="text"
            placeholder="AIza..."
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-700 font-mono"
          />
        </div>
        <button
          onClick={handleAddKey}
          className="w-full py-3 rounded-xl gradient-primary text-white font-bold shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-plus"></i> Thêm key
        </button>
      </div>

      {/* Danh sách API Keys */}
      {apiKeys.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-base font-bold text-slate-700 mb-4">API Keys đã lưu</h2>
          <div className="space-y-3">
            {apiKeys.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <i className="fas fa-key text-sm"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{item.key.slice(0, 10)}...{item.key.slice(-4)}</p>
                  </div>
                  {index === 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Đang dùng</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveKey(index)}
                  className="w-8 h-8 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thông tin Xoay vòng tự động */}
      <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-lightbulb text-amber-500 text-xl mt-0.5"></i>
          <div>
            <p className="font-bold text-amber-800 mb-1">Xoay vòng tự động</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Khi gặp lỗi quota hoặc rate limit, hệ thống sẽ tự động chuyển sang key tiếp theo.
              Thêm nhiều key để tránh gián đoạn khi sử dụng.
            </p>
          </div>
        </div>
      </div>

      {/* Hướng dẫn lấy API Key */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-base font-bold text-slate-700 mb-4">Hướng dẫn lấy API Key:</h2>
        <div className="space-y-3">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all text-slate-600 hover:text-blue-600"
          >
            <i className="fas fa-external-link-alt text-blue-500"></i>
            <span className="font-medium">Lấy API Key tại Google AI Studio</span>
          </a>
          <a
            href="https://www.youtube.com/results?search_query=get+gemini+api+key"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all text-slate-600 hover:text-blue-600"
          >
            <i className="fas fa-external-link-alt text-blue-500"></i>
            <span className="font-medium">Xem hướng dẫn chi tiết (Video)</span>
          </a>
        </div>
      </div>

      {/* Nút Lưu cấu hình */}
      <button
        onClick={handleSaveConfig}
        className="w-full py-4 rounded-2xl gradient-primary text-white font-bold text-lg shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
      >
        Lưu cấu hình
      </button>
    </div>
  );
};

const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa lịch sử này?')) {
      const newHistory = removeHistoryItem(id);
      setHistory(newHistory);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Lịch sử xử lý văn bản</h1>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {history.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <i className="fas fa-history text-4xl mb-4"></i>
            <p>Chưa có dữ liệu lịch sử</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="p-5">Văn bản</th>
                <th className="p-5">Thời gian</th>
                <th className="p-5">Loại văn bản</th>
                <th className="p-5">Chất lượng</th>
                <th className="p-5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <i className="fas fa-file-word"></i>
                      </div>
                      <span className="font-bold truncate max-w-[200px]">{item.fileName}</span>
                    </div>
                  </td>
                  <td className="p-5 text-sm text-slate-500">{new Date(item.timestamp).toLocaleString('vi-VN')}</td>
                  <td className="p-5 text-sm font-medium">{item.docType}</td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[100px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${item.score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${item.score}%` }}></div>
                      </div>
                      <span className={`text-xs font-bold ${item.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{item.score}%</span>
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-9 h-9 rounded-lg border border-slate-100 inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-white transition-all"
                      title="Xóa lịch sử"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --- Main Layout ---

const MainLayout: React.FC = () => {
  const [notification, setNotification] = useState<AppNotification | null>(null);

  const notify = useCallback((n: AppNotification) => {
    setNotification(n);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/standardize" element={<Standardize onNotify={notify} />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings onNotify={notify} />} />
        </Routes>
      </main>
      <Toast notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

export default App;
