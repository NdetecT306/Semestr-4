import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
const API_URL = 'http://localhost:3001';
// Функция для определения позиции ТЭЦ 
const getChpPosition = (id, totalChps) => {
  const corners = [
    { x: 750, y: 100 },  // 1: правый верхний
    { x: 750, y: 550 },  // 2: правый нижний
    { x: 100, y: 550 },  // 3: левый нижний
    { x: 100, y: 100 }   // 4: левый верхний
  ];
  const positionIndex = (id - 1) % 4;
  return corners[positionIndex];
};
// Функция для получения позиции дома рядом с его ТЭЦ 
const getHousePosition = (chp, index, totalHousesForChp) => {
  const chpX = chp.x;
  const chpY = chp.y;
  let offsetX, offsetY;
  if (chpX === 750 && chpY === 100) {
    offsetX = -120;  
    offsetY = 20 + (index * 80);  
  } else if (chpX === 750 && chpY === 550) {
    offsetX = -120;  
    offsetY = -20 - (index * 80);  
  } else if (chpX === 100 && chpY === 550) {
    offsetX = 120;  
    offsetY = -20 - (index * 80);  
  } else {
    offsetX = 120;  
    offsetY = 20 + (index * 80);  
  }
  return { x: chpX + offsetX, y: chpY + offsetY };
};

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [chps, setChps] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [chpStatus, setChpStatus] = useState({});
  useEffect(() => {
    loadData();
  }, []);
  const checkChpStatus = (chpId, currentHouses) => {
    const chpHouses = currentHouses.filter(house => house.chpId === chpId);
    if (chpHouses.length === 0) {
      return 'working';
    }
    const allAtMax = chpHouses.every(house => house.temperature === 95);
    const allAtMin = chpHouses.every(house => house.temperature === 40);
    if (allAtMax || allAtMin) {
      return 'off';
    }
    return 'working';
  };
  const updateAllChpStatuses = (currentChps, currentHouses) => {
    const newStatuses = {};
    currentChps.forEach(chp => {
      newStatuses[chp.id] = checkChpStatus(chp.id, currentHouses);
    });
    setChpStatus(newStatuses);
    return newStatuses;
  };
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  const loadData = async () => {
    try {
      setLoading(true);
      const [chpsRes, housesRes] = await Promise.all([
        axios.get(`${API_URL}/chps`),
        axios.get(`${API_URL}/houses`)
      ]);
      const chpsWithPositions = chpsRes.data.map(chp => {
        const position = getChpPosition(chp.id, chpsRes.data.length);
        if (chp.x !== position.x || chp.y !== position.y) {
          axios.patch(`${API_URL}/chps/${chp.id}`, { x: position.x, y: position.y })
            .catch(err => console.error('Ошибка обновления позиции ТЭЦ:', err));
        }
        return { ...chp, x: position.x, y: position.y };
      });
      const updatedHouses = housesRes.data.map(house => {
        const chp = chpsWithPositions.find(c => c.id === house.chpId);
        if (chp) {
          const chpHouses = housesRes.data.filter(h => h.chpId === house.chpId);
          const houseIndex = chpHouses.findIndex(h => h.id === house.id);
          const position = getHousePosition(chp, houseIndex, chpHouses.length);
          if (house.x !== position.x || house.y !== position.y) {
            axios.patch(`${API_URL}/houses/${house.id}`, { x: position.x, y: position.y })
              .catch(err => console.error('Ошибка обновления позиции дома:', err));
          }
          return { ...house, x: position.x, y: position.y };
        }
        return house;
      });
      setChps(chpsWithPositions);
      setHouses(updatedHouses);
      const statuses = {};
      chpsWithPositions.forEach(chp => {
        statuses[chp.id] = checkChpStatus(chp.id, updatedHouses);
      });
      setChpStatus(statuses);
      setError(null);
    } catch (err) {
      setError('Ошибка загрузки данных. Убедитесь, что JSON Server запущен.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const deleteChp = async (id, e) => {
    e.stopPropagation();
    const chpHouses = houses.filter(house => house.chpId === id);
    if (chpHouses.length > 0) {
      showNotification('Сначала удалите все дома, подключенные к этой ТЭЦ', 'error');
      return;
    }
    try {
      await axios.delete(`${API_URL}/chps/${id}`);
      const newChps = chps.filter(chp => chp.id !== id);
      const renumberedChps = newChps.sort((a, b) => a.id - b.id).map((chp, index) => {
        const newId = index + 1;
        if (chp.id !== newId) {
          axios.patch(`${API_URL}/chps/${chp.id}`, { id: newId })
            .catch(err => console.error('Ошибка перенумерации ТЭЦ:', err));
          houses.filter(house => house.chpId === chp.id).forEach(house => {
            axios.patch(`${API_URL}/houses/${house.id}`, { chpId: newId })
              .catch(err => console.error('Ошибка обновления связи дома:', err));
          });
          return { ...chp, id: newId };
        }
        return chp;
      });
      const chpsWithNewPositions = renumberedChps.map(chp => {
        const position = getChpPosition(chp.id, renumberedChps.length);
        return { ...chp, x: position.x, y: position.y };
      });
      setChps(chpsWithNewPositions);
      const updatedHouses = houses.map(house => {
        const newChpId = renumberedChps.find(chp => chp.oldId === house.chpId)?.id || house.chpId;
        return { ...house, chpId: newChpId };
      });
      setHouses(updatedHouses);
      updateAllChpStatuses(chpsWithNewPositions, updatedHouses);
      if (selectedObject?.id === id && selectedType === 'chp') {
        setViewMode('list');
        setSelectedObject(null);
        setSelectedType(null);
      }
      showNotification('ТЭЦ успешно удалена и ID перенумерованы');
    } catch (err) {
      showNotification('Ошибка при удалении ТЭЦ', 'error');
    }
  };
  const deleteHouse = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_URL}/houses/${id}`);
      const newHouses = houses.filter(house => house.id !== id);
      setHouses(newHouses);
      updateAllChpStatuses(chps, newHouses);
      if (selectedObject?.id === id && selectedType === 'house') {
        setViewMode('list');
        setSelectedObject(null);
        setSelectedType(null);
      }
      showNotification('Дом успешно удалён');
    } catch (err) {
      showNotification('Ошибка при удалении дома', 'error');
    }
  };
  // Редактор
  const handleEdit = (e) => {
    e.stopPropagation();
    if (selectedType === 'chp') {
      navigate(`/edit/${selectedObject.id}`);
    } else if (selectedType === 'house') {
      navigate(`/edit/${selectedObject.id}`);
    }
  };
  const updateTemperature = async (newTemp) => {
    if (selectedType !== 'house' || !selectedObject) return;
    let finalTemp = newTemp;
    if (finalTemp < 40) finalTemp = 40;
    if (finalTemp > 95) finalTemp = 95;
    try {
      const updated = { ...selectedObject, temperature: finalTemp };
      await axios.put(`${API_URL}/houses/${selectedObject.id}`, updated);
      const newHouses = houses.map(h => h.id === selectedObject.id ? updated : h);
      setHouses(newHouses);
      setSelectedObject(updated);
      const newStatuses = updateAllChpStatuses(chps, newHouses);
      const affectedChp = chps.find(c => c.id === selectedObject.chpId);
      if (affectedChp && newStatuses[affectedChp.id] === 'off') {
        showNotification('ТЭЦ "${affectedChp.name}" ОТКЛЮЧЕНА! Все дома на ${finalTemp === 95 ? 'максимальной' : 'минимальной'} температуре!', 'error');
      } else if (affectedChp && newStatuses[affectedChp.id] === 'working' && chpStatus[affectedChp.id] === 'off') {
        showNotification('ТЭЦ "${affectedChp.name}" восстановлена!', 'success');
      }
      if (finalTemp !== newTemp) {
        showNotification(`Температура ограничена ${finalTemp}°C (допустимый диапазон 40-95°C)`);
      } else {
        showNotification(`Температура изменена на ${finalTemp}°C`);
      }
    } catch (err) {
      showNotification('Ошибка при изменении температуры', 'error');
    }
  };
  const getHouseIcon = (type) => type === 'apartment' ? 'Скворечник' : 'Частный';
  const getChpHouses = (chpId) => houses.filter(house => house.chpId === chpId);
  const handleObjectClick = (obj, type) => {
    setSelectedObject(obj);
    setSelectedType(type);
    setViewMode('detail');
  };
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedObject(null);
    setSelectedType(null);
  };
  const getTemperatureStatus = (temp) => {
    if (temp < 40 || temp > 95) return 'broken';
    if (temp < 60) return 'cold';
    if (temp <= 80) return 'normal';
    return 'hot';
  };
  const getTemperatureColor = (temp) => {
    const status = getTemperatureStatus(temp);
    switch(status) {
      case 'broken': return '#000000';
      case 'cold': return '#4299e1';
      case 'normal': return '#ed8936';
      case 'hot': return '#e53e3e';
      default: return '#718096';
    }
  };
  const getPipeColor = (temp, isChpOff = false) => {
    if (isChpOff) return '#000000';
    const status = getTemperatureStatus(temp);
    switch(status) {
      case 'broken': return '#000000';
      case 'cold': return '#4299e1';
      case 'normal': return '#ed8936';
      case 'hot': return '#e53e3e';
      default: return '#718096';
    }
  };
  const getTemperatureLabel = (temp) => {
    const status = getTemperatureStatus(temp);
    switch(status) {
      case 'broken': return 'ПОЛОМКА';
      case 'cold': return 'Низкая нагрузка (холодная вода)';
      case 'normal': return 'Нормальная нагрузка';
      case 'hot': return 'Высокая нагрузка (горячая вода)';
      default: return 'Неизвестно';
    }
  };
  const getTemperatureIcon = (temp) => {
    const status = getTemperatureStatus(temp);
    switch(status) {
      case 'broken': return 'DEATH';
      case 'cold': return 'Б-р-р-р';
      case 'normal': return 'Норм';
      case 'hot': return 'La-la-la-lava, chi-chi-chiken';
      default: return 'Ты что натворил...';
    }
  };
  const filteredChps = filterType === 'all' || filterType === 'chp' ? chps : [];
  const filteredHouses = filterType === 'all' || filterType === 'house' ? houses : [];
  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  return (
    <div className="home-container">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      <div className="left-panel">
        {viewMode === 'list' ? (
          <>
            <div className="panel-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Управление инфраструктурой</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.9rem', opacity: 0.9 }}> {user?.username}</span>
                  <button className="btn btn-secondary small" onClick={logout}>
                    EXIT Выйти
                  </button>
                </div>
              </div>
              <button className="btn btn-success add-btn" onClick={() => navigate('/add')}>
                + Добавить объект
              </button>
            </div>

            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                Все объекты
              </button>
              <button 
                className={`filter-btn ${filterType === 'chp' ? 'active' : ''}`}
                onClick={() => setFilterType('chp')}
              >
                ТЭЦ
              </button>
              <button 
                className={`filter-btn ${filterType === 'house' ? 'active' : ''}`}
                onClick={() => setFilterType('house')}
              >
                Дома
              </button>
            </div>
            <div className="objects-list">
              {filteredChps.length === 0 && filteredHouses.length === 0 && (
                <div className="empty-state">
                  <p>Нет объектов для отображения</p>
                </div>
              )}
              {filteredChps.map(chp => {
                const isOff = chpStatus[chp.id] === 'off';
                return (
                  <div 
                    key={`chp-${chp.id}`} 
                    className="list-item"
                    onClick={() => handleObjectClick(chp, 'chp')}
                    style={{ borderLeft: isOff ? '4px solid #f56565' : 'none' }}
                  >
                    <div className="list-item-header">
                      <div className="list-item-title">
                        <img src="/TEC.jpeg" alt="ТЭЦ" className="list-icon" />
                        {chp.name}
                        {isOff && <span style={{ color: '#f56565', marginLeft: '8px' }}>ОТКЛЮЧЕНА</span>}
                      </div>
                      <div>
                        <button 
                          className="btn btn-primary small" 
                          style={{ marginRight: '5px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit/${chp.id}`);
                          }}
                        >
                        </button>
                        <button className="btn btn-danger small" onClick={(e) => deleteChp(chp.id, e)}>✕</button>
                      </div>
                    </div>
                    <div className="list-item-info">
                      <span>{chp.capacity} МВт</span>
                      <span>{chp.location}</span>
                      <span>{getChpHouses(chp.id).length} домов</span>
                    </div>
                  </div>
                );
              })}
              {filteredHouses.map(house => {
                const chp = chps.find(c => c.id === house.chpId);
                const isChpOff = chp && chpStatus[chp.id] === 'off';
                return (
                  <div 
                    key={`house-${house.id}`} 
                    className="list-item"
                    onClick={() => handleObjectClick(house, 'house')}
                  >
                    <div className="list-item-header">
                      <div className="list-item-title">
                        <img 
                          src={house.type === 'apartment' ? '/Hruchevka.jpg' : '/House.jpeg'} 
                          alt={house.type === 'apartment' ? 'Многоквартирный дом' : 'Частный дом'}
                          className="list-icon"
                        />
                        {house.name}
                        {isChpOff && <span style={{ color: '#f56565', marginLeft: '8px' }}>ТЭЦ отключена</span>}
                      </div>
                      <div>
                        <button 
                          className="btn btn-primary small" 
                          style={{ marginRight: '5px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit/${house.id}`);
                          }}
                        >
                        </button>
                        <button className="btn btn-danger small" onClick={(e) => deleteHouse(house.id, e)}>✕</button>
                      </div>
                    </div>
                    <div className="list-item-info">
                      <span>{house.type === 'apartment' ? 'Многоквартирный' : 'Частный'}</span>
                      <span> {chp?.name || 'Не указана'}</span>
                      <span style={{ color: getTemperatureColor(house.temperature), fontWeight: 'bold' }}>
                        {getTemperatureIcon(house.temperature)} {house.temperature}°C
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="detail-panel">
            <div className="detail-header">
              <button className="btn btn-secondary back-btn" onClick={handleBackToList}>
                ← Назад
              </button>
              <div>
                <button 
                  className="btn btn-primary" 
                  style={{ marginRight: '10px' }}
                  onClick={handleEdit}
                >
                  Редактировать
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    if (selectedType === 'chp') {
                      deleteChp(selectedObject.id, { stopPropagation: () => {} });
                    } else {
                      deleteHouse(selectedObject.id, { stopPropagation: () => {} });
                    }
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
            <div className="detail-content">
              {selectedType === 'chp' ? (
                <>
                  <div className="detail-icon">
                    <img src="/TEC.jpeg" alt="ТЭЦ" className="detail-object-image" />
                  </div>
                  <h2 className="detail-name">
                    {selectedObject.name}
                    {chpStatus[selectedObject.id] === 'off' && 
                      <span style={{ color: '#f56565', fontSize: '1rem', marginLeft: '10px' }}>(ОТКЛЮЧЕНА)</span>
                    }
                  </h2>
                  <div className="detail-stats">
                    <div className="stat-card">
                      <div className="stat-value">{selectedObject.capacity}</div>
                      <div className="stat-label">МВт мощность</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{getChpHouses(selectedObject.id).length}</div>
                      <div className="stat-label">подключено домов</div>
                    </div>
                  </div>
                  <div className="detail-info-section">
                    <div className="info-row">
                      <span className="info-label">Расположение:</span>
                      <span className="info-value">{selectedObject.location}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Статус:</span>
                      <span className="info-value" style={{ color: chpStatus[selectedObject.id] === 'off' ? '#f56565' : '#48bb78', fontWeight: 'bold' }}>
                        {chpStatus[selectedObject.id] === 'off' ? 'ОТКЛЮЧЕНА' : 'РАБОТАЕТ'}
                      </span>
                    </div>
                  </div>
                  <div className="detail-houses">
                    <h3>Подключённые дома</h3>
                    <div className="houses-list">
                      {getChpHouses(selectedObject.id).map(house => {
                        const isChpOff = chpStatus[selectedObject.id] === 'off';
                        return (
                          <div 
                            key={house.id} 
                            className="house-item"
                            onClick={() => handleObjectClick(house, 'house')}
                          >
                            <div className="house-icon">
                              <img 
                                src={house.type === 'apartment' ? '/Hruchevka.jpg' : '/House.jpeg'}
                                alt={house.type === 'apartment' ? 'МКД' : 'Частный'}
                                className="house-mini-image"
                              />
                            </div>
                            <div className="house-info">
                              <div className="house-name">{house.name}</div>
                              <div className="house-temp" style={{ color: isChpOff ? '#000000' : getTemperatureColor(house.temperature), fontWeight: 'bold' }}>
                                {isChpOff ? 'ТЭЦ отключена' : `${getTemperatureIcon(house.temperature)} ${house.temperature}°C`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {getChpHouses(selectedObject.id).length === 0 && (
                        <div className="empty-houses">
                          <p>Нет подключённых домов</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="detail-icon">
                    <img 
                      src={selectedObject.type === 'apartment' ? '/Hruchevka.jpg' : '/House.jpeg'}
                      alt={selectedObject.type === 'apartment' ? 'Многоквартирный дом' : 'Частный дом'}
                      className="detail-object-image"
                    />
                  </div>
                  <h2 className="detail-name">{selectedObject.name}</h2>
                  <div className="detail-stats">
                    <div className="stat-card">
                      <div className="stat-value">{selectedObject.temperature}°</div>
                      <div className="stat-label">текущая температура</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">
                        {selectedObject.type === 'apartment' ? 'МКД' : 'Частный'}
                      </div>
                      <div className="stat-label">тип дома</div>
                    </div>
                  </div>
                  <div className="temperature-control">
                    <div className="temperature-display">
                      <div className="temp-label">🌡️ Температура воды</div>
                      <div className="temp-value" style={{ color: getTemperatureColor(selectedObject.temperature) }}>
                        {getTemperatureIcon(selectedObject.temperature)} {selectedObject.temperature}°C
                      </div>
                      <div className="temp-status" style={{ color: getTemperatureColor(selectedObject.temperature), fontWeight: 'bold' }}>
                        {getTemperatureLabel(selectedObject.temperature)}
                      </div>
                    </div>
                    <div className="temperature-bar-container">
                      <div className="temperature-bar">
                        <div 
                          className="temperature-fill" 
                          style={{ 
                            width: `${((selectedObject.temperature - 40) / 55) * 100}%`,
                            background: getPipeColor(selectedObject.temperature)
                          }}
                        />
                      </div>
                    </div>
                    <div className="temperature-buttons">
                      <button className="temp-btn" onClick={() => updateTemperature(selectedObject.temperature - 5)}>
                        -5°
                      </button>
                      <button className="temp-btn" onClick={() => updateTemperature(selectedObject.temperature - 1)}>
                        -1°
                      </button>
                      <button className="temp-btn temp-reset" onClick={() => updateTemperature(60)}>
                        60° (норма)
                      </button>
                      <button className="temp-btn" onClick={() => updateTemperature(selectedObject.temperature + 1)}>
                        +1°
                      </button>
                      <button className="temp-btn" onClick={() => updateTemperature(selectedObject.temperature + 5)}>
                        +5°
                      </button>
                    </div>
                    <div className="info-row" style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#718096' }}>
                      <span>Допустимый диапазон: 40°C - 95°C</span>
                    </div>
                  </div>
                  <div className="detail-info-section">
                    <div className="info-row">
                      <span className="info-label">ТЭЦ:</span>
                      <span className="info-value" style={{ color: chpStatus[selectedObject.chpId] === 'off' ? '#f56565' : 'inherit' }}>
                        {chps.find(c => c.id === selectedObject.chpId)?.name || 'Не указана'}
                        {chpStatus[selectedObject.chpId] === 'off' && ' (ОТКЛЮЧЕНА)'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Тип:</span>
                      <span className="info-value">
                        {selectedObject.type === 'apartment' ? 'Многоквартирный дом' : 'Частный дом'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">📊 Нагрузка на систему:</span>
                      <span className="info-value" style={{ color: getTemperatureColor(selectedObject.temperature), fontWeight: 'bold' }}>
                        {getTemperatureLabel(selectedObject.temperature)}
                      </span>
                    </div>
                  </div>
                  <div className="pipe-visualization">
                    <div className="pipe-label">Состояние трубы</div>
                    <div className="pipe">
                      <div 
                        className="pipe-water"
                        style={{ 
                          width: `${((selectedObject.temperature - 40) / 55) * 100}%`,
                          background: chpStatus[selectedObject.chpId] === 'off' ? '#000000' : getPipeColor(selectedObject.temperature)
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', marginRight: '0.5rem' }}>
                          {Math.round(((selectedObject.temperature - 40) / 55) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="pipe-indicator" style={{ color: chpStatus[selectedObject.chpId] === 'off' ? '#000000' : getPipeColor(selectedObject.temperature), fontWeight: 'bold' }}>
                      {chpStatus[selectedObject.chpId] === 'off' ? '💀 ТЭЦ ОТКЛЮЧЕНА - ТРЕБУЕТСЯ РЕМОНТ!' :
                       getTemperatureStatus(selectedObject.temperature) === 'broken' ? 'ТРЕБУЕТСЯ РЕМОНТ!' :
                       getTemperatureStatus(selectedObject.temperature) === 'cold' ? 'Холодная вода' : 
                       getTemperatureStatus(selectedObject.temperature) === 'normal' ? 'Тёплая вода' : 'Горячая вода'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="right-panel">
        <div className="schema-header">
          <h2>Схема инфраструктуры</h2>
        </div>
        <div className="schema-container">
          <svg className="schema-canvas" viewBox="0 0 900 700">
            {/* Линии от ТЭЦ к домам */}
            {houses.map(house => {
              const chp = chps.find(c => c.id === house.chpId);
              const isChpOff = chp && chpStatus[chp.id] === 'off';
              if (chp && house.x && house.y) {
                return (
                  <line
                    key={`connection-${house.id}`}
                    x1={chp.x + 40}
                    y1={chp.y + 40}
                    x2={house.x + 35}
                    y2={house.y + 35}
                    stroke={isChpOff ? '#000000' : getPipeColor(house.temperature)}
                    strokeWidth="3"
                    opacity="0.9"
                  />
                );
              }
              return null;
            })}
            {/* ТЭЦ */}
            {chps.map(chp => {
              const x = chp.x;
              const y = chp.y;
              const isOff = chpStatus[chp.id] === 'off';
              return (
                <g 
                  key={`chp-svg-${chp.id}`} 
                  onClick={() => handleObjectClick(chp, 'chp')}
                  style={{ cursor: 'pointer' }}
                >
                  <foreignObject
                    x={x}
                    y={y}
                    width="50"
                    height="50"
                    rx="8"
                  >
                    <div 
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: selectedObject?.id === chp.id && selectedType === 'chp' && viewMode === 'detail' ? '3px solid #ffd700' : `2px solid ${isOff ? '#f56565' : 'white'}`,
                        boxSizing: 'border-box',
                        filter: isOff ? 'grayscale(100%)' : 'none'
                      }}
                    >
                      <img 
                        src="/TEC.jpeg" 
                        alt="ТЭЦ"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </foreignObject>
                  <text x={x + 25} y={y + 65} textAnchor="middle" fill={isOff ? '#f56565' : 'white'} fontSize="10" fontWeight="bold">
                    {chp.name} 
                  </text>
                </g>
              );
            })}
            {/* Дома */}
            {houses.map(house => {
              const x = house.x;
              const y = house.y;
              const chp = chps.find(c => c.id === house.chpId);
              const isChpOff = chp && chpStatus[chp.id] === 'off';
              const status = getTemperatureStatus(house.temperature);
              const borderColor = isChpOff ? '#000000' : (status === 'broken' ? '#000000' : getPipeColor(house.temperature));
              return (
                <g 
                  key={`house-svg-${house.id}`} 
                  onClick={() => handleObjectClick(house, 'house')}
                  style={{ cursor: 'pointer' }}
                >
                  <foreignObject
                    x={x}
                    y={y}
                    width="40"
                    height="40"
                    rx="6"
                  >
                    <div 
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: selectedObject?.id === house.id && selectedType === 'house' && viewMode === 'detail' ? '3px solid #ffd700' : `2px solid ${borderColor}`,
                        boxSizing: 'border-box'
                      }}
                    >
                      <img 
                        src={house.type === 'apartment' ? '/Hruchevka.jpg' : '/House.jpeg'}
                        alt={house.type === 'apartment' ? 'МКД' : 'Частный дом'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </foreignObject>
                  <text x={x + 20} y={y + 55} textAnchor="middle" fill={isChpOff ? '#000000' : (status === 'broken' ? '#000000' : 'white')} fontSize="9" fontWeight="bold">
                    {isChpOff ? 'OFF' : `${house.temperature}°C`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default Home;
