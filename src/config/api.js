// Public endpoint only. Provider keys and webhooks must never enter the frontend build.
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://ai-news-service.sky1342866713.workers.dev'
};
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const checkApiConfig = () => ({isValid:Boolean(API_CONFIG.BASE_URL),issues:API_CONFIG.BASE_URL ? [] : ['新闻服务地址未配置']});
