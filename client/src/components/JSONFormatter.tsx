import React, { JSX, useState } from 'react';
import styles from '../styles/Breakdown.module.css';

interface JSONFormatterProps {
  data: any;
}

const JSONFormatter: React.FC<JSONFormatterProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (path: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Format a value based on its type
  const formatValue = (value: any, path: string = 'root'): JSX.Element => {
    if (value === null) {
      return <span className={styles.jsonNull}>null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className={styles.jsonBoolean}>{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className={styles.jsonNumber}>{value}</span>;
    }
    
    if (typeof value === 'string') {
      return <span className={styles.jsonString}>"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      const isExpanded = expandedSections[path] !== false;
      
      return (
        <div style={{ paddingLeft: '1rem' }}>
          <span 
            onClick={() => toggleSection(path)}
            style={{ cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isExpanded ? '▼' : '▶'} Array [{value.length}]
          </span>
          {isExpanded && (
            <div style={{ paddingLeft: '1rem' }}>
              {value.map((item, index) => (
                <div key={`${path}-${index}`}>
                  <span className={styles.jsonKey}>[{index}]: </span>
                  {formatValue(item, `${path}-${index}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const isExpanded = expandedSections[path] !== false;
      const keys = Object.keys(value);
      
      return (
        <div style={{ paddingLeft: path === 'root' ? '0' : '1rem' }}>
          <span 
            onClick={() => toggleSection(path)}
            style={{ cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isExpanded ? '▼' : '▶'} Object {path === 'root' ? '' : `{${keys.length}}`}
          </span>
          {isExpanded && (
            <div style={{ paddingLeft: '1rem' }}>
              {keys.map(key => (
                <div key={`${path}-${key}`}>
                  <span className={styles.jsonKey}>{key}: </span>
                  {formatValue(value[key], `${path}-${key}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Fallback for other types
    return <span>{String(value)}</span>;
  };

  return (
    <div className={styles.jsonContainer}>
      {formatValue(data)}
    </div>
  );
};

export default JSONFormatter;