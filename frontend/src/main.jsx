import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // エラー情報を記録
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          color: '#fff', 
          backgroundColor: '#000', 
          height: '100vh', 
          fontFamily: 'monospace',
          overflow: 'auto'
        }}>
          <h1 style={{ color: '#ff5555', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            Application Crashed
          </h1>
          <h2 style={{ color: '#ffff55', marginTop: '20px' }}>Error:</h2>
          <pre style={{ backgroundColor: '#111', padding: '10px', borderRadius: '5px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          
          <h2 style={{ color: '#ffff55', marginTop: '20px' }}>Component Stack:</h2>
          <pre style={{ backgroundColor: '#111', padding: '10px', borderRadius: '5px', fontSize: '0.8rem' }}>
            {/*errorInfoが存在する場合のみ表示*/ }
            {this.state.errorInfo ? this.state.errorInfo.componentStack : "No stack trace available yet."}
          </pre>
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '30px',
              padding: '10px 20px',
              backgroundColor: '#5865F2',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="color:red; padding:20px;">Root element not found! index.htmlを確認してください。</div>';
} else {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}