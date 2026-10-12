import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

/**
 * يمنع الشاشة البيضاء: لو حصل خطأ غير متوقع في أي شاشة، بتظهر رسالة واضحة وزرار إعادة تحميل
 * بدل ما الموقع كله يفضل أبيض.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Cairo, Tahoma, sans-serif', background: '#f8fafc' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a' }}>حصل خطأ غير متوقع</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
            بياناتك محفوظة. اضغط إعادة التحميل وكمّل شغلك.
          </p>
          {this.state.message && (
            <pre dir="ltr" style={{ textAlign: 'left', fontSize: 11, color: '#be123c', background: '#fff1f2', borderRadius: 8, padding: 8, margin: '0 0 16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.message.slice(0, 300)}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: '#047857', color: '#fff', border: 0, borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            إعادة التحميل
          </button>
        </div>
      </div>
    );
  }
}
