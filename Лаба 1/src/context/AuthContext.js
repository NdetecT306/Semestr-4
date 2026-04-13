import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    // Проверяем сохраненного пользователя при загрузке
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);
  // Регистрация
  const register = (username, password, confirmPassword) => {
    return new Promise((resolve, reject) => {
      if (!username || username.trim() === '') {
        reject('Логин не может быть пустым');
        return;
      }
      if (username.length < 3) {
        reject('Логин должен содержать минимум 3 символа');
        return;
      }
      if (!password || password.trim() === '') {
        reject('Пароль не может быть пустым');
        return;
      }
      if (password.length < 4) {
        reject('Пароль должен содержать минимум 4 символа');
        return;
      }
      if (password !== confirmPassword) {
        reject('Пароли не совпадают');
        return;
      }
      // Проверка на exisтинг
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.some(u => u.username === username)) {
        reject('Пользователь с таким логином уже существует');
        return;
      }
      // АДД НЬЮ ЮЗЕР
      const newUser = {
        id: Date.now(),
        username,
        password 
      };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      // Автомат вход
      const { password: _, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      resolve(userWithoutPassword);
    });
  };
  // Просто входим
  const login = (username, password) => {
    return new Promise((resolve, reject) => {
      if (!username || username.trim() === '') {
        reject('Введите логин');
        return;
      }
      if (!password || password.trim() === '') {
        reject('Введите пароль');
        return;
      }
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find(u => u.username === username && u.password === password);
      if (!foundUser) {
        reject('Неверный логин или пароль');
        return;
      }
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      resolve(userWithoutPassword);
    });
  };
  // Просто выходим
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
