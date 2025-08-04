/**
 * 简单的日志记录器
 */

const { formatDateTime } = require('./utils');

class Logger {
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.enableConsole = config.enableConsole !== false;
    this.enableFile = config.enableFile || false;
    this.logFile = config.logFile;
  }

  /**
   * 记录信息日志
   * @param {string} message 日志消息
   * @param {Object} data 附加数据
   */
  info(message, data = {}) {
    this._log('INFO', message, data);
  }

  /**
   * 记录警告日志
   * @param {string} message 日志消息
   * @param {Object} data 附加数据
   */
  warn(message, data = {}) {
    this._log('WARN', message, data);
  }

  /**
   * 记录错误日志
   * @param {string} message 日志消息
   * @param {Error|Object} error 错误对象或附加数据
   */
  error(message, error = null) {
    const data = error instanceof Error ? { 
      error: error.message, 
      stack: error.stack 
    } : error;
    this._log('ERROR', message, data);
  }

  /**
   * 记录调试日志
   * @param {string} message 日志消息
   * @param {Object} data 附加数据
   */
  debug(message, data = {}) {
    if (this.level === 'debug') {
      this._log('DEBUG', message, data);
    }
  }

  /**
   * 内部日志记录方法
   * @private
   */
  _log(level, message, data) {
    const timestamp = formatDateTime();
    const logEntry = `[${level}] ${timestamp} - ${message}`;
    
    if (this.enableConsole) {
      const logMethod = level === 'ERROR' ? console.error : 
                       level === 'WARN' ? console.warn : console.log;
      
      if (Object.keys(data).length > 0) {
        logMethod(logEntry, data);
      } else {
        logMethod(logEntry);
      }
    }

    // TODO: 如果需要，可以在这里添加文件日志记录
  }
}

module.exports = Logger;