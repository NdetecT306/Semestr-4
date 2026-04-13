import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        navigate('/');
      } else {
        // Регистрация
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (!formData.username || formData.username.trim() === '') {
          throw new Error('Логин не может быть пустым');
        }
        if (formData.username.length < 3) {
          throw new Error('Логин должен содержать минимум 3 символа');
        }
        if (!formData.password || formData.password.trim() === '') {
          throw new Error('Пароль не может быть пустым');
        }
        if (formData.password.length < 4) {
          throw new Error('Пароль должен содержать минимум 4 символа');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Пароли не совпадают');
        }
        if (users.some(u => u.username === formData.username)) {
          throw new Error('Пользователь с таким логином уже существует');
        }
        // Создаем пользователя
        const newUser = {
          id: Date.now(),
          username: formData.username,
          password: formData.password
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        // Автоматический вход
        const { password: _, ...userWithoutPassword } = newUser;
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        // Обновляем контекст через login
        await login(formData.username, formData.password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      username: '',
      password: '',
      confirmPassword: ''
    });
  };
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/TEC.jpeg" alt="Логотип" className="auth-logo" />
          <h1>Система управления ТЭЦ</h1>
          <p>{isLogin ? 'Вход в систему' : 'Регистрация нового пользователя'}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Логин</label>
            <input
              type="text"
              name="username"
              className="form-input"
              value={formData.username}
              onChange={handleChange}
              placeholder="Введите логин"
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Введите пароль"
              required
            />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Подтверждение пароля</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
              />
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        <div className="auth-footer">
          <button onClick={toggleMode} className="auth-switch-btn">
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
        {isLogin && (
          <div className="auth-demo">
            <p>Демо-аккаунт:</p>
            <p>Логин: <strong>admin</strong> | Пароль: <strong>1234</strong></p>
            <button 
              className="btn btn-secondary small" 
              onClick={() => {
                setFormData({ username: 'admin', password: '1234', confirmPassword: '' });
              }}
            >
              Заполнить демо-данные
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
