/**
 * 通用工具函数
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dirPath 目录路径
 */
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * 读取 JSON 文件
 * @param {string} filePath 文件路径
 * @returns {Promise<Object>} JSON 对象
 */
async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // 文件不存在
    }
    throw error;
  }
}

/**
 * 写入 JSON 文件
 * @param {string} filePath 文件路径
 * @param {Object} data 要写入的数据
 */
async function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 延迟执行
 * @param {number} ms 延迟毫秒数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化日期时间
 * @param {Date} date 日期对象
 * @returns {string} 格式化的日期时间字符串
 */
function formatDateTime(date = new Date()) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 验证环境变量
 * @param {string[]} requiredVars 必需的环境变量列表
 * @throws {Error} 如果缺少必需的环境变量
 */
function validateEnvironmentVariables(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
  }
}

module.exports = {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  sleep,
  formatDateTime,
  validateEnvironmentVariables
};