import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
const API_URL = 'http://localhost:3001';
// Функция для обработки ошибок API
const handleApiError = (error, showNotification) => {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 400:
        showNotification(`Ошибка запроса: ${data?.message || 'Неверные данные'}`, 'error');
        break;
      case 404:
        showNotification('Ресурс не найден (404)', 'error');
        break;
      case 409:
        showNotification(`Конфликт данных: ${data?.message || 'Объект уже существует'}`, 'error');
        break;
      case 500:
        showNotification('Внутренняя ошибка сервера (500)', 'error');
        break;
      default:
        showNotification(`Ошибка ${status}: ${data?.message || 'Неизвестная ошибка'}`, 'error');
    }
  } else if (error.request) {
    showNotification('Нет соединения с сервером. Убедитесь, что JSON Server запущен на порту 3001', 'error');
  } else {
    showNotification(`Ошибка: ${error.message}`, 'error');
  }
  console.error('API Error:', error);
};
// Функция для определения позиции ТЭЦ 
const getChpPosition = (id) => {
  const corners = [
    { x: 750, y: 100 },  // 1: правый верхний
    { x: 750, y: 550 },  // 2: правый нижний
    { x: 100, y: 550 },  // 3: левый нижний
    { x: 100, y: 100 }   // 4: левый верхний
  ];
  const positionIndex = (id - 1) % 4;
  return corners[positionIndex];
};
// Функция для получения позиции дома рядом с ТЭЦ
const getHousePosition = (chp, index) => {
  const chpX = chp.x;
  const chpY = chp.y;
  let offsetX, offsetY;
  if (chpX === 750 && chpY === 100) {
    offsetX = -100;
    offsetY = 35 + (index * 70);
  } else if (chpX === 750 && chpY === 550) {
    offsetX = -100;
    offsetY = -35 - (index * 70);
  } else if (chpX === 100 && chpY === 550) {
    offsetX = 100;
    offsetY = -35 - (index * 70);
  } else {
    offsetX = 100;
    offsetY = 35 + (index * 70);
  }
  return { x: chpX + offsetX, y: chpY + offsetY };
};
function Form() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [chps, setChps] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [entityType, setEntityType] = useState('house');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'apartment',
    chpId: '',
    temperature: 60,
    capacity: 500,
    location: ''
  });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    loadData();
  }, [id]);
  const loadData = async () => {
    try {
      const [chpsRes, housesRes] = await Promise.all([
        axios.get(`${API_URL}/chps`),
        axios.get(`${API_URL}/houses`)
      ]);
      setChps(chpsRes.data);
      setHouses(housesRes.data);
      // Проверяем, есть ли ID для редактирования
      if (id) {
        const parsedId = parseInt(id);
        // Ищем среди ТЭЦ
        const foundChp = chpsRes.data.find(c => c.id === parsedId);
        if (foundChp) {
          setIsEditMode(true);
          setEditId(parsedId);
          setEntityType('chp');
          setFormData({
            name: foundChp.name,
            capacity: foundChp.capacity,
            location: foundChp.location,
            type: 'apartment',
            chpId: '',
            temperature: 60
          });
        } else {
          // Ищем среди домов
          const foundHouse = housesRes.data.find(h => h.id === parsedId);
          if (foundHouse) {
            setIsEditMode(true);
            setEditId(parsedId);
            setEntityType('house');
            setFormData({
              name: foundHouse.name,
              type: foundHouse.type,
              chpId: foundHouse.chpId,
              temperature: foundHouse.temperature,
              capacity: 500,
              location: ''
            });
          }
        }
      } else if (chpsRes.data.length > 0 && !formData.chpId) {
        setFormData(prev => ({ ...prev, chpId: chpsRes.data[0].id }));
      }
    } catch (err) {
      handleApiError(err, showNotification);
    } finally {
      setLoading(false);
    }
  };
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };
  const validateForm = () => {
    const newErrors = {};
    // Валидация имени
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Название не может быть пустым';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Название не может превышать 50 символов';
    }
    if (entityType === 'chp') {
      // Валидация для ТЭЦ
      if (!formData.location || formData.location.trim() === '') {
        newErrors.location = 'Укажите расположение ТЭЦ';
      } else if (formData.location.length < 2) {
        newErrors.location = 'Расположение должно содержать минимум 2 символа';
      }
      if (!formData.capacity || formData.capacity < 100) {
        newErrors.capacity = 'Мощность должна быть не менее 100 МВт';
      } else if (formData.capacity > 1000) {
        newErrors.capacity = 'Мощность не может превышать 1000 МВт';
      }
    } else {
      // Валидация для дома
      if (!formData.chpId) {
        newErrors.chpId = 'Выберите ТЭЦ для подключения';
      }
      if (!formData.temperature || formData.temperature < 40) {
        newErrors.temperature = 'Температура не может быть ниже 40°C';
      } else if (formData.temperature > 95) {
        newErrors.temperature = 'Температура не может быть выше 95°C';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleTypeChange = (type) => {
    if (isEditMode) return;
    setEntityType(type);
    setFormData({
      name: '',
      type: 'apartment',
      chpId: chps[0]?.id || '',
      temperature: 60,
      capacity: 500,
      location: ''
    });
    setErrors({});
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = name === 'capacity' || name === 'temperature' || name === 'chpId' ? Number(value) : value;
    if (name === 'temperature') {
      if (newValue < 40) newValue = 40;
      if (newValue > 95) newValue = 95;
    }
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    // Очищаем ошибку для этого поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  // Проверка уникальности имени 
  const isNameUnique = (name, type, excludeId = null) => {
    const allChpNames = chps.map(c => c.name.toLowerCase());
    const allHouseNames = houses.map(h => h.name.toLowerCase());
    if (type === 'chp') {
      if (excludeId) {
        const currentChp = chps.find(c => c.id === excludeId);
        if (currentChp && currentChp.name.toLowerCase() === name.toLowerCase()) {
          return true;
        }
      }
      return !allChpNames.includes(name.toLowerCase());
    } else {
      if (excludeId) {
        const currentHouse = houses.find(h => h.id === excludeId);
        if (currentHouse && currentHouse.name.toLowerCase() === name.toLowerCase()) {
          return true;
        }
      }
      return !allHouseNames.includes(name.toLowerCase());
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (isEditMode) {
        if (entityType === 'chp') {
          if (!isNameUnique(formData.name, 'chp', editId)) {
            showNotification('ТЭЦ с таким названием уже существует!', 'error');
            setSubmitting(false);
            return;
          }
          const updatedChp = {
            ...chps.find(c => c.id === editId),
            name: formData.name.trim(),
            capacity: formData.capacity,
            location: formData.location.trim()
          };
          await axios.put(`${API_URL}/chps/${editId}`, updatedChp);
          showNotification(`ТЭЦ "${formData.name}" успешно обновлена`);
        } else {
          if (!isNameUnique(formData.name, 'house', editId)) {
            showNotification('Дом с таким названием уже существует!', 'error');
            setSubmitting(false);
            return;
          }
          if (formData.chpId !== houses.find(h => h.id === editId)?.chpId) {
            const chpHouses = houses.filter(h => h.chpId === formData.chpId && h.id !== editId);
            if (chpHouses.length >= 5) {
              showNotification('У ТЭЦ не может быть больше 5 домов', 'error');
              setSubmitting(false);
              return;
            }
          }
          let finalTemp = formData.temperature;
          if (finalTemp < 40) finalTemp = 40;
          if (finalTemp > 95) finalTemp = 95;
          let position = { x: 0, y: 0 };
          const chp = chps.find(c => c.id === formData.chpId);
          if (chp) {
            const chpHouses = houses.filter(h => h.chpId === formData.chpId && h.id !== editId);
            position = getHousePosition(chp, chpHouses.length);
          }
          const updatedHouse = {
            ...houses.find(h => h.id === editId),
            name: formData.name.trim(),
            type: formData.type,
            chpId: formData.chpId,
            temperature: finalTemp,
            x: position.x,
            y: position.y
          };
          await axios.put(`${API_URL}/houses/${editId}`, updatedHouse);
          showNotification(`Дом "${formData.name}" успешно обновлён`);
        }
      } else {
        if (entityType === 'chp') {
          if (chps.length >= 4) {
            showNotification('Нельзя добавить больше 4 ТЭЦ', 'error');
            setSubmitting(false);
            return;
          }
          if (!isNameUnique(formData.name, 'chp')) {
            showNotification('ТЭЦ с таким названием уже существует!', 'error');
            setSubmitting(false);
            return;
          }
          let nextId = 1;
          while (chps.some(chp => chp.id === nextId)) {
            nextId++;
          }
          const position = getChpPosition(nextId);
          const newChp = {
            id: nextId,
            name: formData.name.trim(),
            capacity: formData.capacity,
            location: formData.location.trim(),
            x: position.x,
            y: position.y
          };
          await axios.post(`${API_URL}/chps`, newChp);
          showNotification(`ТЭЦ "${formData.name}" успешно добавлена`);
        } else {
          const chpHouses = houses.filter(h => h.chpId === formData.chpId);
          if (chpHouses.length >= 5) {
            showNotification('У ТЭЦ не может быть больше 5 домов', 'error');
            setSubmitting(false);
            return;
          }
          if (!isNameUnique(formData.name, 'house')) {
            showNotification('Дом с таким названием уже существует!', 'error');
            setSubmitting(false);
            return;
          }
          let finalTemp = formData.temperature;
          if (finalTemp < 40) finalTemp = 40;
          if (finalTemp > 95) finalTemp = 95;
          const newId = houses.length > 0 ? Math.max(...houses.map(h => h.id)) + 1 : 1;
          const chp = chps.find(c => c.id === formData.chpId);
          const position = getHousePosition(chp, chpHouses.length);
          const newHouse = {
            id: newId,
            name: formData.name.trim(),
            type: formData.type,
            chpId: formData.chpId,
            temperature: finalTemp,
            x: position.x,
            y: position.y
          };
          await axios.post(`${API_URL}/houses`, newHouse);
          showNotification(`Дом "${formData.name}" успешно добавлен`);
        }
      }
      navigate('/');
    } catch (err) {
      handleApiError(err, showNotification);
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <div className="loading">Загрузка...</div>;
  return (
    <div className="page">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>
        ← Назад
      </button>

      <div className="card">
        <h2>{isEditMode ? 'Редактирование объекта' : '+ Добавление объекта'}</h2>
        
        {!isEditMode && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              className={`btn ${entityType === 'house' ? 'btn-primary' : ''}`}
              onClick={() => handleTypeChange('house')}
            >
                Добавить дом
            </button>
            <button
              className={`btn ${entityType === 'chp' ? 'btn-primary' : ''}`}
              onClick={() => handleTypeChange('chp')}
            >
                Добавить ТЭЦ
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Название *</label>
            <input
              type="text"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              value={formData.name}
              onChange={handleChange}
              required
              placeholder={entityType === 'chp' ? 'Например: ТЭЦ-1' : 'Например: Жилой комплекс "Солнечный"'}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
            <small style={{ color: '#718096' }}>Название должно быть уникальным (2-50 символов)</small>
          </div>
          {entityType === 'chp' ? (
            <>
              <div className="form-group">
                <label className="form-label">Мощность (МВт) *</label>
                <input
                  type="number"
                  name="capacity"
                  className={`form-input ${errors.capacity ? 'error' : ''}`}
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  min="100"
                  max="1000"
                  step="10"
                />
                {errors.capacity && <div className="error-message">{errors.capacity}</div>}
                <small style={{ color: '#718096' }}>Допустимый диапазон: 100-1000 МВт</small>
              </div>
              <div className="form-group">
                <label className="form-label">Расположение *</label>
                <input
                  type="text"
                  name="location"
                  className={`form-input ${errors.location ? 'error' : ''}`}
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="Например: Центральный район"
                />
                {errors.location && <div className="error-message">{errors.location}</div>}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Тип дома</label>
                <select
                  name="type"
                  className="form-select"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={isEditMode}
                >
                  <option value="apartment">Многоквартирный дом</option>
                  <option value="private">Частный дом</option>
                </select>
                {isEditMode && <small style={{ color: '#718096' }}>Тип дома нельзя изменить после создания</small>}
              </div>

              <div className="form-group">
                <label className="form-label">Подключение к ТЭЦ *</label>
                <select
                  name="chpId"
                  className={`form-select ${errors.chpId ? 'error' : ''}`}
                  value={formData.chpId}
                  onChange={handleChange}
                  required
                >
                  {chps.map(chp => (
                    <option key={chp.id} value={chp.id}>
                      {chp.name} - {houses.filter(h => h.chpId === chp.id && h.id !== editId).length}/5 домов
                    </option>
                  ))}
                </select>
                {errors.chpId && <div className="error-message">{errors.chpId}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Температура воды (°C) *</label>
                <input
                  type="number"
                  name="temperature"
                  className={`form-input ${errors.temperature ? 'error' : ''}`}
                  value={formData.temperature}
                  onChange={handleChange}
                  required
                  min="40"
                  max="95"
                  step="1"
                />
                {errors.temperature && <div className="error-message">{errors.temperature}</div>}
                <small style={{ color: '#718096', display: 'block', marginTop: '0.25rem' }}>
                  Допустимый диапазон: 40°C - 95°C
                </small>
              </div>
            </>
          )}
          <button
            type="submit"
            className="btn btn-success"
            disabled={submitting}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {submitting ? 'Сохранение...' : (isEditMode ? 'Обновить' : 'Сохранить')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Form;
