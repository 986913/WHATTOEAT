import axios from 'axios';

const instance = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
});

// 添加请求拦截器
instance.interceptors.request.use(
  function (config) {
    // 在发送请求之前做些什么, 比如： 从 localStorage 中获取 token，并将其添加到请求头中
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error);
  },
);

// 添加响应拦截器
instance.interceptors.response.use(
  function (response) {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么
    return response;
  },
  function (error) {
    // token 失效，或者没有 token，访问了需要认证的接口，后端会返回 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/signin';
    }

    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    return Promise.reject(error);
  },
);

export default instance;
